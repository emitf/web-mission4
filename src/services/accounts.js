import { request, validate } from "./http.js";
import { accountListSchema, accountSchema } from "../schemas/account.js";

export async function getAccounts({ signal } = {}) {
  const data = await request("/accounts", { signal });
  return validate(accountListSchema, data, "the accounts");
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

export async function deleteAccount(id) {
  await request(`/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
