import { z } from "zod";
import {
  acceptComma,
  amountSchema,
  currencySchema,
  idSchema,
  isoDateSchema,
  onlyNeeds,
  pastDateSchema,
} from "./common.js";

export const IOU_DIRECTIONS = ["owedToMe", "iOwe"];

// The plain fields of an IOU, shared by the form and the API response.
const iouFields = z.object({
  person: z
    .string({ error: "Write who it is" })
    .trim()
    .min(2, "Write at least 2 characters of their name")
    .max(40, "Keep the name under 40 characters"),
  direction: z.enum(IOU_DIRECTIONS, {
    error: "Say who owes whom",
  }),
  amount: amountSchema,
  currency: currencySchema,
  dateLent: pastDateSchema,
  // The due date is usually in the future, so it only has to be a real date
  dueDate: isoDateSchema,
  note: z.string().trim().max(80, "Keep the note under 80 characters").optional(),
});

// You can't be paid back before you lent the money.
function iouRules(schema) {
  return schema.refine((iou) => iou.dueDate >= iou.dateLent, {
    error: "The due date can't be before the date you lent it",
    path: ["dueDate"],
    ...onlyNeeds("dateLent", "dueDate"),
  });
}

// What the IOU form checks (adding and editing). The only difference from the
// stored data: in the form you can type "12,50" with a Spanish comma.
export const iouFormSchema = iouRules(iouFields.extend({ amount: acceptComma(amountSchema) }));

// What the server must send back: the same fields plus an id and whether it's paid.
// When it's paid we also remember the day and the account the money went
// into / came out of, so "Undo" can put that account's balance back.
export const iouSchema = iouRules(
  iouFields.extend({
    id: idSchema,
    settled: z.boolean(),
    settledAt: isoDateSchema.nullish(),
    settledAccountId: z.string().nullish(),
  }),
);

// "Mark as paid": which account the money went into / came out of.
// NO_ACCOUNT = just close the IOU without changing any balance.
export const NO_ACCOUNT = "none";

// Built with my accounts and the IOU, because the rule needs both:
// if I pay someone back in cash, the wallet must have enough in it.
export function makeSettleFormSchema(accounts, iou) {
  return z
    .object({
      accountId: z.string().min(1, "Choose an account, or say not to change any balance"),
    })
    .refine(
      ({ accountId }) => {
        const account = accounts.find((a) => a.id === accountId);
        const payingFromCash = iou.direction === "iOwe" && account?.type === "cash";
        return !payingFromCash || account.balance >= iou.amount;
      },
      { error: "There isn't enough cash in that wallet", path: ["accountId"] },
    );
}
