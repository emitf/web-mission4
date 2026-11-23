import { z } from "zod";
import { validate } from "./http.js";
import { currencySchema, isoDateSchema } from "../schemas/common.js";

// Public exchange rates published by the European Central Bank (Frankfurter API).
const RATES_URL = import.meta.env.VITE_RATES_URL;

// What Frankfurter answers: { amount: 1, base: "EUR", date: "2026-11-23", rates: { USD: 1.0939 } }
const ratesResponseSchema = z.object({
  amount: z.number(),
  base: currencySchema,
  date: isoDateSchema,
  rates: z.record(z.string(), z.number().positive()),
});

// How much 1 unit of `base` is worth in `target`, e.g. getRate({ base: "EUR", target: "USD" }).
export async function getRate({ base, target, signal }) {
  let response;
  try {
    const url = `${RATES_URL}/latest?base=${base}&symbols=${target}`;
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Can't reach the exchange-rate service.");
  }
  if (!response.ok) {
    throw new Error(`Exchange-rate service error (${response.status}).`);
  }

  const data = validate(ratesResponseSchema, await response.json(), "the exchange rate");
  const rate = data.rates[target];
  if (rate === undefined) {
    throw new Error(`No exchange rate available for ${base} → ${target}.`);
  }
  return { rate, date: data.date };
}
