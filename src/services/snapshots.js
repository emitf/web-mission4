import { request, validate, validateEach } from "./http.js";
import { snapshotSchema } from "../schemas/snapshot.js";

// Returns { items, rejected }: each history record is checked on its own
export async function getSnapshots({ signal } = {}) {
  const data = await request("/snapshots", { signal });
  return validateEach(snapshotSchema, data, "the history");
}

// At most one record per day:
// - no record for that day yet → POST (create it)
// - already one               → PATCH (replace it with the latest numbers)
export async function saveSnapshotForDay(snapshot) {
  const sameDay = await request(`/snapshots?date=${encodeURIComponent(snapshot.date)}`);
  const existing = Array.isArray(sameDay) ? sameDay[0] : undefined;

  const data = existing
    ? await request(`/snapshots/${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: snapshot,
      })
    : await request("/snapshots", { method: "POST", body: snapshot });
  return validate(snapshotSchema, data, "the history record");
}

export async function deleteSnapshot(id) {
  await request(`/snapshots/${encodeURIComponent(id)}`, { method: "DELETE" });
}
