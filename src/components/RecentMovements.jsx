import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { deleteMovement, getMovements } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import { CATEGORY_LABELS } from "../schemas/movement.js";
import { formatMoney, formatShortDate, toCents } from "../utils/money.js";
import Icon from "./Icon.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

const HOW_MANY = 6;

// Optional activity: transfers (like € → $) and the payments of IOUs land here.
// The app is balance-first, so you don't need to log every expense.
function RecentMovements({ onAdd }) {
  // Same keys as the dashboard → read from the cache, no extra requests
  const movementsQuery = useQuery({ queryKey: queryKeys.movements, queryFn: getMovements });
  const accountsQuery = useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts });

  const isPending = movementsQuery.isPending || accountsQuery.isPending;
  const failed = movementsQuery.isError
    ? movementsQuery
    : accountsQuery.isError
      ? accountsQuery
      : null;

  // Newest first, only the last few
  const recent = [...(movementsQuery.data ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, HOW_MANY);

  // accountId → account, to show names and currencies
  const accountsById = Object.fromEntries((accountsQuery.data ?? []).map((a) => [a.id, a]));

  return (
    <section className="section" aria-labelledby="movements-title">
      <div className="title-row">
        <h2 id="movements-title">
          Activity <span className="optional">(optional)</span>
        </h2>
        <UpdatingBadge show={movementsQuery.isFetching && !isPending} />
        <button type="button" className="link-button" onClick={onAdd}>
          + Add movement
        </button>
      </div>

      {isPending && <LoadingRows label="Loading your movements…" rows={3} />}
      {failed && (
        <QueryError error={failed.error} onRetry={() => failed.refetch()} what="your movements" />
      )}

      {!isPending && !failed && recent.length === 0 && (
        <p className="empty">
          No activity yet. Use it for things like changing euros into dollars.
        </p>
      )}

      {!isPending && !failed && recent.length > 0 && (
        <ul className="rows">
          {recent.map((movement) => (
            <MovementRow key={movement.id} movement={movement} accountsById={accountsById} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MovementRow({ movement, accountsById }) {
  const queryClient = useQueryClient();

  // Each row has its own mutation, so "Deleting…" shows only on this row
  const deleteMutation = useMutation({
    mutationFn: () => deleteMovement(movement.id),
    onSuccess: () => {
      // Movements changed → balances (calculated from them) update too
      queryClient.invalidateQueries({ queryKey: queryKeys.movements });
    },
  });

  const from = accountsById[movement.accountId];
  const to = accountsById[movement.toAccountId];
  const currency = from?.currency ?? "EUR";
  const cents = toCents(movement.amount);

  const title =
    movement.description ||
    CATEGORY_LABELS[movement.category] ||
    (movement.type === "income" ? "Income" : "Transfer");

  const subtitle =
    movement.type === "transfer"
      ? `${from?.name ?? "?"} → ${to?.name ?? "?"}`
      : [CATEGORY_LABELS[movement.category], from?.name].filter(Boolean).join(" · ");

  function handleDelete() {
    if (window.confirm(`Delete "${title}"? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

  return (
    <li className="row">
      <span className="icon-circle">
        <Icon name={movement.type} />
      </span>

      <span className="row-main">
        <span className="row-title">{title}</span>
        <span className="row-sub">
          {subtitle} · {formatShortDate(movement.date)}
        </span>
      </span>

      <span className="row-end">
        {movement.type === "income" && (
          <span className="row-amount amount">{formatMoney(cents, currency, { sign: true })}</span>
        )}
        {movement.type === "expense" && (
          <span className="row-amount amount">{formatMoney(-cents, currency)}</span>
        )}
        {movement.type === "transfer" && (
          <>
            <span className="row-amount amount">{formatMoney(-cents, currency)}</span>
            <span className="row-sub amount">
              {formatMoney(
                toCents(movement.receivedAmount ?? movement.amount),
                to?.currency ?? currency,
                {
                  sign: true,
                },
              )}
            </span>
          </>
        )}
        {deleteMutation.isError && (
          <span className="row-error" role="alert">
            Couldn&apos;t delete. {deleteMutation.error.message}
          </span>
        )}
      </span>

      <button
        type="button"
        className="icon-button row-delete"
        aria-label={`Delete "${title}"`}
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? "…" : "×"}
      </button>
    </li>
  );
}

export default RecentMovements;
