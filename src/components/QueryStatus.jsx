// Reusable messages for the states of a query: loading and error.

// Grey placeholder rows while the first load happens.
// The rows are hidden from screen readers; the role="status" text is what they hear.
export function LoadingRows({ label, rows = 3 }) {
  return (
    <div className="loading">
      <p role="status" className="visually-hidden">
        {label}
      </p>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row" aria-hidden="true">
          <span className="skeleton skeleton-circle" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-amount" />
        </div>
      ))}
    </div>
  );
}

// role="alert": announced right away. The message comes from the service layer,
// so "server is off" and "the server sent bad data" read differently.
//
// When the server is off, every section fails at once. Only the top one
// (the total) announces the full reason; the others pass `what` and show a
// short, quiet line, so a screen reader doesn't repeat the same alert 4 times.
export function QueryError({ error, onRetry, what }) {
  return (
    <div className="query-error" role={what ? undefined : "alert"}>
      <p>{what ? `Couldn't load ${what}.` : (error?.message ?? "Something went wrong.")}</p>
      {onRetry && (
        <button type="button" className="button-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

// Small "Updating…" next to a title while a background refetch is running
export function UpdatingBadge({ show }) {
  if (!show) return null;
  return (
    <span className="updating" role="status">
      Updating…
    </span>
  );
}
