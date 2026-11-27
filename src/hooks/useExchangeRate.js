import { queryOptions, useQuery } from "@tanstack/react-query";
import { getRate } from "../services/rates.js";
import { queryKeys } from "../queryKeys.js";
import { RATE_STALE_TIME_MS } from "../constants.js";

// The settings of the rate query in one place (TanStack v5 queryOptions), so
// the components (useQuery) and the history recorder (fetchQuery) share the
// same key, function and staleTime, and therefore the same cache.
export function rateQuery(from, to) {
  return queryOptions({
    queryKey: queryKeys.rate(from, to),
    queryFn: ({ signal }) => getRate({ base: from, target: to, signal }),
    staleTime: RATE_STALE_TIME_MS, // 1 hour: see constants.js for why
  });
}

// How much 1 unit of `from` is worth in `to`.
// `needed` = do we actually have money in the other currency? If not, the query
// waits (enabled: false) and never asks the server: a dependent query.
export function useExchangeRate({ from, to, needed }) {
  return useQuery({ ...rateQuery(from, to), enabled: needed });
}
