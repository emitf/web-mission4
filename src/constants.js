// Labels shown on screen and the app's fixed numbers, in ONE place.
// (Which values are allowed, like "EUR" | "USD", lives in the Zod schemas;
// this file only says how to show them.)

export const CURRENCY_INFO = {
  EUR: { symbol: "€", name: "euros", label: "Euros (€)" },
  USD: { symbol: "$", name: "dollars", label: "Dollars ($)" },
};

export const ACCOUNT_TYPE_LABELS = {
  bank: "Bank",
  savings: "Savings",
  cash: "Cash",
};

export const IOU_DIRECTION_LABELS = {
  owedToMe: "They owe me",
  iOwe: "I owe them",
};

// How long the "Account added" / "Balances updated" message stays on screen
export const NOTICE_DURATION_MS = 4000;

// A new IOU is due two weeks after the day it's lent, unless you change it
export const DEFAULT_DUE_IN_DAYS = 14;

// After two weeks without checking, an account's balance is probably out of date
export const STALE_AFTER_DAYS = 14;

// The European Central Bank publishes new rates once a day, so a rate is still
// good for a long time: asking again on every mount or window focus would be
// wasted requests. We keep it 1 hour.
export const RATE_STALE_TIME_MS = 60 * 60 * 1000;

// How many history records the list shows before "Show all"
export const HISTORY_SHOWN_AT_FIRST = 8;
