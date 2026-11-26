// The only place that knows how to talk to my json-server.
// The components never call fetch: they use the functions in services/.

const API_URL = import.meta.env.VITE_API_URL;

// Sends a request and returns the JSON body.
// fetch does NOT fail on a 404 or 500 (only on network problems), so the
// response.ok check below is what turns those into real errors.
export async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal, // lets TanStack Query cancel requests nobody needs anymore
    });
  } catch (error) {
    // A cancelled request is expected, not a failure: pass it on untouched
    if (error.name === "AbortError") throw error;
    throw new Error("Can't reach the server. Is json-server running? (npm run dev)");
  }

  if (!response.ok) {
    throw new Error(`Server error (${response.status}). Please try again.`);
  }

  // 204 No Content: nothing to parse
  if (response.status === 204) return null;
  return response.json();
}

// Checks what the server sent against a Zod schema.
// If the shape is wrong, we fail here, early and clearly, instead of with an
// "undefined" three components later. The error gets its own name so the UI
// can tell "bad data" apart from "network problem".
export function validate(schema, data, what) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error(`The server sent ${what} in an unexpected format.`);
    error.name = "ValidationError";
    error.issues = result.error.issues;
    console.error(error.message, result.error.issues);
    throw error;
  }
  return result.data;
}

// The bonus: check a LIST one record at a time with safeParse.
// One broken record no longer hides all the others: the good ones come back
// in `items`, the broken ones in `rejected` together with what's wrong.
// (If the answer isn't even a list, e.g. an HTML error page, the whole thing
// is still an error, like validate() above.)
export function validateEach(itemSchema, data, what) {
  if (!Array.isArray(data)) {
    const error = new Error(`The server sent ${what} in an unexpected format.`);
    error.name = "ValidationError";
    throw error;
  }

  const items = [];
  const rejected = [];
  for (const record of data) {
    const result = itemSchema.safeParse(record);
    if (result.success) {
      items.push(result.data);
    } else {
      rejected.push({
        record,
        problems: result.error.issues.map((issue) => ({
          field: issue.path.join(".") || "record",
          // A problem with no field = the entry isn't even an object (e.g. null)
          message: issue.path.length > 0 ? issue.message : "This isn't a valid record at all",
          // Follow the whole path, so "totals.EUR" shows the EUR value, not all totals
          received: issue.path.reduce((value, key) => value?.[key], record),
        })),
      });
    }
  }

  if (rejected.length > 0) {
    console.warn(`${rejected.length} of ${what} didn't pass the rules:`, rejected);
  }
  return { items, rejected };
}
