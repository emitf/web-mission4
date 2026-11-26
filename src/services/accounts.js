import { request, validate, validateEach } from "./http.js";
import { accountSchema } from "../schemas/account.js";
import { fromCents, toCents } from "../utils/money.js";

// Returns { items, rejected }: each account is checked on its own
export async function getAccounts({ signal } = {}) {
  const data = await request("/accounts", { signal });
  return validateEach(accountSchema, data, "the accounts");
}

export async function createAccount(newAccount) {
  const data = await request("/accounts", { method: "POST", body: newAccount });
  return validate(accountSchema, data, "the new account");
}

// PATCH changes only the fields we send (name, type, opening balance…)
export async function updateAccount(id, changes) {
  const data = await request(`/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  });
  return validate(accountSchema, data, "the updated account");
}

// Adds (or subtracts, if negative) some cents to an account's balance.
// Used when an IOU is paid into / out of an account, and when that is undone.
// Done in cents so 0.1 + 0.2 problems can't creep into a saved balance.
export function changeBalance(account, cents) {
  return updateAccount(account.id, {
    balance: fromCents(toCents(account.balance) + cents),
  });
}

export async function deleteAccount(id) {
  await request(`/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
