import { z } from "zod";
import { balanceSchema, currencySchema, idSchema, isoDateSchema } from "./common.js";

// A "photo" of all my accounts on one day (at most one per day).
// It keeps each account's balance AND the totals in both currencies, worked
// out with that day's exchange rate, so old records show what my money was
// worth THEN, not recalculated with today's rate.
//
// A total is null if it couldn't be worked out that day (no exchange rate).
export const snapshotSchema = z.object({
  id: idSchema,
  date: isoDateSchema,
  accounts: z.array(
    z.object({
      accountId: z.string({ error: "Missing the account id" }),
      name: z.string({ error: "Missing the account name" }),
      currency: currencySchema,
      balance: balanceSchema,
    }),
    { error: "The list of accounts is missing or broken" },
  ),
  totals: z.object({
    EUR: z.number({ error: "The total in euros must be a number" }).nullable(),
    USD: z.number({ error: "The total in dollars must be a number" }).nullable(),
  }),
});
