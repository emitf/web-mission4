// Money maths for Clear Count.
//
// Everything is calculated in CENTS (whole numbers), because decimals in
// JavaScript are not exact: 0.1 + 0.2 === 0.30000000000000004.
// 12.5 € becomes 1250 cents, we add and subtract whole numbers,
// and only turn it back into euros when we show it.

export function toCents(amount) {
  return Math.round(amount * 100);
}

// Today's balance of every account, in its own currency, as { accountId: cents }.
// The server only stores the opening balance and the movements:
// income adds, expense subtracts, and a transfer takes money out of one account
// and puts the received amount (it can be in another currency) into the other.
export function computeBalances(accounts, movements) {
  const balances = {};
  for (const account of accounts) {
    balances[account.id] = toCents(account.openingBalance);
  }

  for (const movement of movements) {
    const amount = toCents(movement.amount);
    if (movement.type === "income") {
      add(balances, movement.accountId, amount);
    } else if (movement.type === "expense") {
      add(balances, movement.accountId, -amount);
    } else if (movement.type === "transfer") {
      add(balances, movement.accountId, -amount);
      const received = toCents(movement.receivedAmount ?? movement.amount);
      add(balances, movement.toAccountId, received);
    }
  }
  return balances;
}

// Ignores movements that point to an account that no longer exists
function add(balances, accountId, cents) {
  if (accountId in balances) balances[accountId] += cents;
}

// The currency we are NOT showing (only euros and dollars exist in the app)
export function otherCurrency(currency) {
  return currency === "EUR" ? "USD" : "EUR";
}

// Converts cents from one currency to the display currency.
// `rate` = how much 1 unit of the other currency is worth in the display one.
// Returns null when we need a rate we don't have (yet).
export function toDisplayCents(cents, currency, displayCurrency, rate) {
  if (currency === displayCurrency) return cents;
  if (rate == null) return null;
  return Math.round(cents * rate);
}

// Spanish format, as my bank shows it: 1.057,65 €
// (useGrouping "always" because Spanish normally skips the dot in 4-digit numbers)
function formatter(currency) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol", // "$" instead of "US$"
    useGrouping: "always",
  });
}

export function formatMoney(cents, currency, { sign = false } = {}) {
  const text = formatter(currency).format(cents / 100);
  return sign && cents > 0 ? `+${text}` : text;
}

// Splits "1.057,65 €" into three pieces — "1.057", ",65" and " €" — so the big
// total can show the cents in grey. (In Spanish the € goes AFTER the cents.)
export function splitMoney(cents, currency) {
  const parts = formatter(currency).formatToParts(cents / 100);
  let whole = "";
  let decimals = "";
  let symbol = "";
  let seenDecimals = false;
  for (const part of parts) {
    if (part.type === "decimal" || part.type === "fraction") {
      decimals += part.value;
      seenDecimals = true;
    } else if (seenDecimals) {
      symbol += part.value;
    } else {
      whole += part.value;
    }
  }
  return { whole, decimals, symbol };
}

// "2026-11-03" → "3 Nov" (read as a local date, not UTC)
export function formatShortDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
