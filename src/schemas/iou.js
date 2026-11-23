import { z } from "zod";
import {
  amountSchema,
  currencySchema,
  idSchema,
  isoDateSchema,
  pastDateSchema,
} from "./common.js";

export const IOU_DIRECTIONS = ["owedToMe", "iOwe"];

// The plain fields of an IOU, shared by the form and the API response.
const iouFields = z.object({
  person: z
    .string()
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
  });
}

// What the "new IOU" form checks.
export const iouFormSchema = iouRules(iouFields);

// What the server must send back: the same fields plus an id and whether it's paid.
export const iouSchema = iouRules(
  iouFields.extend({ id: idSchema, settled: z.boolean() }),
);
export const iouListSchema = z.array(iouSchema);
