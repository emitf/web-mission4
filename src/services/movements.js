import { request, validate } from "./http.js";
import { movementListSchema, movementSchema } from "../schemas/movement.js";

// Without accountId: every movement.
export async function getMovements({ accountId, signal } = {}) {
  if (accountId) return getAccountMovements({ accountId, signal });
  const data = await request("/movements", { signal });
  return validate(movementListSchema, data, "the movements");
}

// One account's history = money that left it (accountId) PLUS transfers that
// arrived in it (toAccountId). json-server can't do "OR" in one request, so we
// ask for both lists at the same time and join them, newest first.
async function getAccountMovements({ accountId, signal }) {
  const id = encodeURIComponent(accountId);
  const [outgoing, incoming] = await Promise.all([
    request(`/movements?accountId=${id}`, { signal }),
    request(`/movements?toAccountId=${id}`, { signal }),
  ]);
  const movements = validate(
    movementListSchema,
    [...outgoing, ...incoming],
    "the movements",
  );
  return movements.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createMovement(newMovement) {
  const data = await request("/movements", { method: "POST", body: newMovement });
  return validate(movementSchema, data, "the new movement");
}

export async function deleteMovement(id) {
  await request(`/movements/${encodeURIComponent(id)}`, { method: "DELETE" });
}
