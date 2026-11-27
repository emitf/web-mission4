import { request, validate, validateEach } from "./http.js";
import { accountSchema } from "../schemas/account.js";

// Returns { items, rejected }: each account is checked on its own
export async function getAccounts({ signal } = {}) {
  const data = await request("/accounts", { signal });
  return validateEach(accountSchema, data, "the accounts");
}

export async function createAccount(newAccount) {
  const data = await request("/accounts", { method: "POST", body: newAccount });
  return validate(accountSchema, data, "the new account");
}

// One account, read fresh from the server. null if it doesn't exist (404),
// e.g. it was deleted after an IOU was paid into it.
export async function getAccount(id) {
  try {
    const data = await request(`/accounts/${encodeURIComponent(id)}`);
    return validate(accountSchema, data, "the account");
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

// PATCH changes only the fields we send (name, type, balance…)
export async function updateAccount(id, changes) {
  const data = await request(`/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  });
  return validate(accountSchema, data, "the updated account");
}

export async function deleteAccount(id) {
  await request(`/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
