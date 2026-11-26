import { useQueryClient } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { saveSnapshotForDay } from "../services/snapshots.js";
import { queryKeys } from "../queryKeys.js";
import { today } from "../schemas/common.js";
import { fromCents, toCents } from "../utils/money.js";
import { rateQuery } from "./useExchangeRate.js";

// Takes today's "photo" of all my accounts for the history.
// Called after every change to a balance (see the forms' onSuccess).
//
// fetchQuery reads from the SAME cache as the components:
// - the accounts: right after invalidateQueries a fresh request is already
//   on its way, and fetchQuery joins it instead of sending a second one (dedupe)
// - the rate: if it's still fresh (staleTime 1 h), no request at all
export function useRecordSnapshot() {
  const queryClient = useQueryClient();

  return async function recordSnapshot() {
    try {
      const { items: accounts } = await queryClient.fetchQuery({
        queryKey: queryKeys.accounts,
        queryFn: getAccounts,
      });

      // How much 1 $ is worth in €, only if I have money in both currencies
      const mixed =
        accounts.some((a) => a.currency === "EUR") && accounts.some((a) => a.currency === "USD");
      let usdToEur = null;
      if (mixed) {
        try {
          usdToEur = (await queryClient.fetchQuery(rateQuery("USD", "EUR"))).rate;
        } catch {
          usdToEur = null; // rate service down: totals stay unknown for today
        }
      }

      const cents = (currency) =>
        accounts
          .filter((a) => a.currency === currency)
          .reduce((sum, a) => sum + toCents(a.balance), 0);
      const eur = cents("EUR");
      const usd = cents("USD");

      // Totals in both currencies (null if we'd need a rate we don't have)
      const totals = {
        EUR:
          usd === 0
            ? fromCents(eur)
            : usdToEur
              ? fromCents(eur + Math.round(usd * usdToEur))
              : null,
        USD:
          eur === 0
            ? fromCents(usd)
            : usdToEur
              ? fromCents(usd + Math.round(eur / usdToEur))
              : null,
      };

      await saveSnapshotForDay({
        date: today(),
        accounts: accounts.map((a) => ({
          accountId: a.id,
          name: a.name,
          currency: a.currency,
          balance: a.balance,
        })),
        totals,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots });
    } catch (error) {
      // The balance itself WAS saved; only today's history point is missing.
      // Not worth showing an error for: the next change will record it.
      console.warn("Couldn't record today's history:", error);
    }
  };
}
