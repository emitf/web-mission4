import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { getIous } from "../services/ious.js";
import { getSnapshots } from "../services/snapshots.js";
import { queryKeys } from "../queryKeys.js";

// The server answers come back as { items, rejected } (see validateEach).
// `select` picks the part each component needs FROM THE SAME CACHE ENTRY:
// the list uses the good records, the "Needs review" panel uses the broken
// ones, and it's still ONE request per key.
//
// Defined outside the hooks so they are the same function on every render
// (then Query doesn't need to run them again unless the data changed).
const selectItems = (data) => data.items;
const selectRejected = (data) => data.rejected;

export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts, select: selectItems });
}

export function useIous() {
  return useQuery({ queryKey: queryKeys.ious, queryFn: getIous, select: selectItems });
}

export function useRejectedAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts, select: selectRejected });
}

export function useRejectedIous() {
  return useQuery({ queryKey: queryKeys.ious, queryFn: getIous, select: selectRejected });
}

// History records, oldest first (the chart reads them left to right)
const selectSnapshots = (data) => [...data.items].sort((a, b) => a.date.localeCompare(b.date));

export function useSnapshots() {
  return useQuery({
    queryKey: queryKeys.snapshots,
    queryFn: getSnapshots,
    select: selectSnapshots,
  });
}

export function useRejectedSnapshots() {
  return useQuery({ queryKey: queryKeys.snapshots, queryFn: getSnapshots, select: selectRejected });
}
