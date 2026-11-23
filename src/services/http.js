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
