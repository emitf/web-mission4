import { z } from "zod";

// Small building blocks that every other schema reuses.

export const CURRENCIES = ["EUR", "USD"];

export const currencySchema = z.enum(CURRENCIES, {
  error: "Choose euros or dollars",
});

// HTML inputs always give strings, so z.coerce turns "12.50" into 12.5.
// "Has at most 2 decimals" = multiplying by 100 gives a whole number of cents.
function hasAtMostTwoDecimals(value) {
  return Math.abs(Math.round(value * 100) - value * 100) < 1e-9;
}

// Careful: Number("") is 0, so an empty input would sneak through as 0.
// We turn "" into undefined first, so the user sees "Enter an amount".
function emptyToUndefined(value) {
  return value === "" ? undefined : value;
}

export const amountSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter an amount" })
    .positive("The amount must be greater than 0")
    .refine(hasAtMostTwoDecimals, { error: "Use at most 2 decimals (cents)" }),
);

// Like amountSchema but it can be 0 or negative (a starting balance).
export const balanceSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter a number" })
    .refine(hasAtMostTwoDecimals, { error: "Use at most 2 decimals (cents)" }),
);

// Today as "YYYY-MM-DD" in the user's own time zone.
export function today() {
  return new Date().toLocaleDateString("en-CA");
}

// A real calendar date in ISO format ("2026-11-23").
export const isoDateSchema = z.iso.date({ error: "Enter a valid date" });

// Dates of things that already happened cannot be in the future.
// ISO dates can be compared as text: "2026-11-01" < "2026-11-23".
export const pastDateSchema = isoDateSchema.refine((date) => date <= today(), {
  error: "The date can't be in the future",
});

// What the server adds to every record it stores.
// json-server v1 creates ids as text ("1", "a3f9").
export const idSchema = z.string().min(1);
