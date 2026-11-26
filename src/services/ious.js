import { request, validate, validateEach } from "./http.js";
import { iouSchema } from "../schemas/iou.js";

// Returns { items, rejected }: each IOU is checked on its own
export async function getIous({ signal } = {}) {
  const data = await request("/ious", { signal });
  return validateEach(iouSchema, data, "the IOUs");
}

// A new IOU always starts unpaid.
export async function createIou(newIou) {
  const data = await request("/ious", {
    method: "POST",
    body: { ...newIou, settled: false },
  });
  return validate(iouSchema, data, "the new IOU");
}

// PATCH changes only the fields we send, e.g. { settled: true }.
export async function updateIou(id, changes) {
  const data = await request(`/ious/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  });
  return validate(iouSchema, data, "the updated IOU");
}

export async function deleteIou(id) {
  await request(`/ious/${encodeURIComponent(id)}`, { method: "DELETE" });
}
