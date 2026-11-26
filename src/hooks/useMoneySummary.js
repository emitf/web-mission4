import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { getIous } from "../services/ious.js";
import { queryKeys } from "../queryKeys.js";
import { otherCurrency, toCents, toDisplayCents } from "../utils/money.js";
import { useExchangeRate } from "./useExchangeRate.js";

// Adds up cents; null if any of them couldn't be converted (no rate yet)
function sum(values) {
  return values.includes(null) ? null : values.reduce((total, cents) => total + cents, 0);
}

// Everything the dashboard needs to know about my money, in the display currency:
// the total in my accounts, what people owe me, what I owe, and the net result.
//
// The total, the tiles and the account list all call this hook, but TanStack
// Query shares the cache: accounts, IOUs and the rate are requested ONCE (dedupe).
export function useMoneySummary(displayCurrency) {
  const accountsQuery = useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts });
  const iousQuery = useQuery({ queryKey: queryKeys.ious, queryFn: getIous });

  const accounts = accountsQuery.data ?? [];
  const openIous = (iousQuery.data ?? []).filter((iou) => !iou.settled);

  // Only ask for a rate if some money is in the other currency (dependent query)
  const foreign = otherCurrency(displayCurrency);
  const rateQuery = useExchangeRate({
    from: foreign,
    to: displayCurrency,
    needed:
      accounts.some((account) => account.currency === foreign) ||
      openIous.some((iou) => iou.currency === foreign),
  });

  const rate = rateQuery.data?.rate;
  const convert = (amount, currency) =>
    toDisplayCents(toCents(amount), currency, displayCurrency, rate);

  const iouTotal = (direction) =>
    sum(
      openIous
        .filter((iou) => iou.direction === direction)
        .map((iou) => convert(iou.amount, iou.currency)),
    );

  // null = not known yet (still loading, failed, or waiting for the rate)
  const total = accountsQuery.data
    ? sum(accounts.map((account) => convert(account.balance, account.currency)))
    : null;
  const owedToMe = iousQuery.data ? iouTotal("owedToMe") : null;
  const iOwe = iousQuery.data ? iouTotal("iOwe") : null;
  const net = total !== null && owedToMe !== null && iOwe !== null ? total + owedToMe - iOwe : null;

  return {
    accountsQuery,
    iousQuery,
    rateQuery,
    accounts,
    openIous,
    total,
    owedToMe,
    iOwe,
    net,
  };
}
