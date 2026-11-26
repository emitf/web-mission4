import { queryOptions, useQuery } from "@tanstack/react-query";
import { getRate } from "../services/rates.js";
import { queryKeys } from "../queryKeys.js";

// The settings of the rate query in one place (TanStack v5 queryOptions), so
// the components (useQuery) and the history recorder (fetchQuery) share the
// same key, function and staleTime, and therefore the same cache.
export function rateQuery(from, to) {
  return queryOptions({
    queryKey: queryKeys.rate(from, to),
    queryFn: ({ signal }) => getRate({ base: from, target: to, signal }),
    // The European Central Bank publishes new rates once a day, so a rate is
    // still good for a long time. Asking again every time a component mounts or
    // the window gets focus would be wasted requests: we keep it 1 hour.
    staleTime: 60 * 60 * 1000,
  });
}

// How much 1 unit of `from` is worth in `to`.
// `needed` = do we actually have money in the other currency? If not, the query
// waits (enabled: false) and never asks the server: a dependent query.
export function useExchangeRate({ from, to, needed }) {
  return useQuery({ ...rateQuery(from, to), enabled: needed });
}
