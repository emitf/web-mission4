import { z } from "zod";
import { amountSchema, idSchema, makeAmountSchema, onlyNeeds, pastDateSchema } from "./common.js";

export const MOVEMENT_TYPES = ["income", "expense", "transfer"];

// The value saved in the database → the text shown on screen
export const CATEGORY_LABELS = {
  groceries: "Groceries",
  "eating-out": "Eating out",
  transport: "Transport",
  rent: "Rent",
  shopping: "Shopping",
  subscriptions: "Subscriptions",
  leisure: "Leisure",
  travel: "Travel",
  gifts: "Gifts",
  education: "Education",
  health: "Health",
  other: "Other",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS);

// The plain fields of a movement, shared by the form and the API response.
const movementFields = z.object({
  type: z.enum(MOVEMENT_TYPES, { error: "Choose income, expense or transfer" }),
  amount: amountSchema,
  accountId: z.string().min(1, "Choose an account"),
  // Only used by transfers
  toAccountId: z.string().optional(),
  receivedAmount: makeAmountSchema("Enter how much arrived in the other account").optional(),
  // Only expenses need a category; income and transfers leave it empty (or out)
  category: z
    .union([z.enum(CATEGORIES), z.literal("")], {
      error: "Choose a category from the list",
    })
    .optional(),
  description: z.string().trim().max(60, "Keep the description under 60 characters"),
  date: pastDateSchema,
});

// Rules that compare fields with each other.
// "path" says which field the error belongs to, so it shows next to that input.
function movementRules(schema) {
  return schema
    .refine((m) => m.type !== "transfer" || Boolean(m.toAccountId), {
      error: "Choose the account the money goes to",
      path: ["toAccountId"],
      ...onlyNeeds("type", "toAccountId"),
    })
    .refine((m) => m.type !== "transfer" || m.toAccountId !== m.accountId, {
      error: "You can't transfer to the same account",
      path: ["toAccountId"],
      ...onlyNeeds("type", "accountId", "toAccountId"),
    })
    .refine((m) => m.type !== "expense" || Boolean(m.category), {
      error: "Choose a category for this expense",
      path: ["category"],
      ...onlyNeeds("type", "category"),
    });
}

// What the "new movement" form checks.
export const movementFormSchema = movementRules(movementFields);

// The form needs one more rule that depends on my accounts:
// moving 50 € into a dollar wallet doesn't arrive as 50 $, so a transfer
// between DIFFERENT currencies must say how much was received.
// The schema can't know the currencies by itself, so we build it with them.
export function makeMovementFormSchema(accounts) {
  const currencyOf = (id) => accounts.find((account) => account.id === id)?.currency;

  return movementFormSchema.refine(
    (m) =>
      m.type !== "transfer" ||
      currencyOf(m.accountId) === currencyOf(m.toAccountId) ||
      m.receivedAmount !== undefined,
    {
      error: "Enter how much arrived in the other account",
      path: ["receivedAmount"],
      ...onlyNeeds("type", "accountId", "toAccountId", "receivedAmount"),
    },
  );
}

// What the server must send back: the same fields plus an id.
export const movementSchema = movementRules(movementFields.extend({ id: idSchema }));
export const movementListSchema = z.array(movementSchema);
