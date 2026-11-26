import { z } from "zod";
import {
  acceptComma,
  balanceSchema,
  currencySchema,
  idSchema,
  isoDateSchema,
  onlyNeeds,
} from "./common.js";

export const ACCOUNT_TYPES = ["bank", "savings", "cash"];

// The fields every account has, shared by the forms and the API response.
const accountBase = {
  name: z
    .string({ error: "Write a name for the account" })
    .trim()
    .min(2, "The name needs at least 2 characters")
    .max(30, "Keep the name under 30 characters"),
  type: z.enum(ACCOUNT_TYPES, { error: "Choose bank, savings or cash" }),
  currency: currencySchema,
};

// A wallet can't hold less than nothing (a bank account can be overdrawn).
// Used by every form where you type a current balance.
export function noNegativeCash(schema) {
  return schema.refine((account) => !(account.type === "cash" && account.balance < 0), {
    error: "Cash can't be negative",
    path: ["balance"],
    ...onlyNeeds("type", "balance"),
  });
}

// ---------- The account form ----------
// You type how much is in the account RIGHT NOW (balance-first: no transactions).
const accountFormFields = z.object({ ...accountBase, balance: acceptComma(balanceSchema) });

export const accountFormSchema = noNegativeCash(accountFormFields);

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

// ---------- The "Update balances" panel ----------
// One row per account: its id and type (to apply the cash rule) and the new balance.
export const balancesFormSchema = z.object({
  accounts: z.array(
    noNegativeCash(
      z.object({
        id: idSchema,
        type: z.enum(ACCOUNT_TYPES),
        balance: acceptComma(balanceSchema),
      }),
    ),
  ),
});

// ---------- What the server sends back ----------
// The same fields plus the id and the date you last confirmed the balance.
// (The cash rule is for what you TYPE; the stored data is checked for its
// shape: a real number, a real date… which is what catches corrupt data.)
export const accountSchema = z.object({
  ...accountBase,
  id: idSchema,
  balance: balanceSchema,
  updatedAt: isoDateSchema.optional(),
});
