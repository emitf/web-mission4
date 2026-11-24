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

// A positive money amount. `emptyMessage` lets each field say what's missing.
export function makeAmountSchema(emptyMessage = "Enter an amount") {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: emptyMessage })
      .positive("The amount must be greater than 0")
      .refine(hasAtMostTwoDecimals, { error: "Use at most 2 decimals (cents)" }),
  );
}

export const amountSchema = makeAmountSchema();

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

// By default Zod skips the cross-field rules (.refine) while ANY field still has
// an error, so an empty form would show "Enter an amount" but not "Choose a
// category" until the amount was fixed. With `when`, a rule runs as soon as the
// fields IT uses are fine: submitting an empty form shows every error at once.
export function onlyNeeds(...fields) {
  return {
    when: (payload) => payload.issues.every((issue) => !fields.includes(issue.path?.[0])),
  };
}

// What the server adds to every record it stores.
// json-server v1 creates ids as text ("1", "a3f9").
export const idSchema = z.string().min(1);
