import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { getMovements } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import { computeBalances } from "../utils/money.js";

// The accounts and movements the forms need, straight from the cache
// (the dashboard already loaded them, so opening a form sends no request).
export function useAccountData() {
  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
  });
  const { data: movements = [] } = useQuery({
    queryKey: queryKeys.movements,
    queryFn: getMovements,
  });
  return { accounts, movements, balances: computeBalances(accounts, movements) };
}
