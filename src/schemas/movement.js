import { z } from "zod";
import { amountSchema, idSchema, pastDateSchema } from "./common.js";

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
  receivedAmount: amountSchema.optional(),
  // Only expenses need a category; income and transfers leave it empty
  category: z.union([z.enum(CATEGORIES), z.literal("")], {
    error: "Choose a category from the list",
  }),
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
    })
    .refine((m) => m.type !== "transfer" || m.toAccountId !== m.accountId, {
      error: "You can't transfer to the same account",
      path: ["toAccountId"],
    })
    .refine((m) => m.type !== "expense" || m.category !== "", {
      error: "Choose a category for this expense",
      path: ["category"],
    });
}

// What the "new movement" form checks.
// (Stage 4 adds one more rule that needs the accounts: transfers between
// different currencies must say how much was received.)
export const movementFormSchema = movementRules(movementFields);

// What the server must send back: the same fields plus an id.
export const movementSchema = movementRules(movementFields.extend({ id: idSchema }));
export const movementListSchema = z.array(movementSchema);
