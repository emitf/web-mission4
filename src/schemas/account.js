import { z } from "zod";
import { balanceSchema, currencySchema, idSchema, onlyNeeds } from "./common.js";

export const ACCOUNT_TYPES = ["bank", "savings", "cash"];

// The plain fields of an account, shared by the form and the API response.
const accountFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, "The name needs at least 2 characters")
    .max(30, "Keep the name under 30 characters"),
  type: z.enum(ACCOUNT_TYPES, { error: "Choose bank, savings or cash" }),
  currency: currencySchema,
  openingBalance: balanceSchema,
});

// Rules that compare fields with each other.
// A bank account can be overdrawn, but a wallet can't hold less than nothing.
function accountRules(schema) {
  return schema.refine((account) => !(account.type === "cash" && account.openingBalance < 0), {
    error: "A cash account can't start with a negative balance",
    path: ["openingBalance"],
    ...onlyNeeds("type", "openingBalance"),
  });
}

// What the "new account" form checks.
export const accountFormSchema = accountRules(accountFields);

// The form also checks that the name isn't already used by another account.
// `takenNames` comes from the accounts already loaded (when editing, it leaves
// out the account being edited, so keeping its own name is fine).
// Compared without caring about capitals or spaces: "BBVA" = " bbva ".
export function makeAccountFormSchema(takenNames) {
  const taken = takenNames.map((name) => name.trim().toLowerCase());
  return accountFormSchema.refine((account) => !taken.includes(account.name.toLowerCase()), {
    error: "You already have an account with this name",
    path: ["name"],
    ...onlyNeeds("name"),
  });
}

// What the server must send back: the same fields plus an id.
export const accountSchema = accountRules(accountFields.extend({ id: idSchema }));
export const accountListSchema = z.array(accountSchema);
