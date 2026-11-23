import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { getMovements } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import { computeBalances, otherCurrency } from "../utils/money.js";
import { useExchangeRate } from "./useExchangeRate.js";

// Accounts + movements + exchange rate → today's balance of every account.
// Several components call this hook, but TanStack Query shares the cache:
// the accounts are requested ONCE (dedupe), not once per component.
export function useBalances(displayCurrency) {
  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts, // receives { signal } from Query
  });

  const movementsQuery = useQuery({
    queryKey: queryKeys.movements,
    queryFn: getMovements,
  });

  // Only ask for a rate if some account is in the other currency
  const foreign = otherCurrency(displayCurrency);
  const hasForeignAccounts =
    accountsQuery.data?.some((account) => account.currency === foreign) ?? false;

  const rateQuery = useExchangeRate({
    from: foreign,
    to: displayCurrency,
    needed: hasForeignAccounts,
  });

  const balances =
    accountsQuery.data && movementsQuery.data
      ? computeBalances(accountsQuery.data, movementsQuery.data)
      : null;

  return {
    accountsQuery,
    movementsQuery,
    rateQuery,
    balances,
    isPending: accountsQuery.isPending || movementsQuery.isPending,
    isError: accountsQuery.isError || movementsQuery.isError,
    error: accountsQuery.error ?? movementsQuery.error,
    isFetching: accountsQuery.isFetching || movementsQuery.isFetching,
    refetch: () => {
      accountsQuery.refetch();
      movementsQuery.refetch();
    },
  };
}
