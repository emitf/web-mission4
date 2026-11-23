import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../services/accounts.js";
import { getMovements } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import { CATEGORY_LABELS } from "../schemas/movement.js";
import { formatMoney, formatShortDate, toCents } from "../utils/money.js";
import Icon from "./Icon.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

const HOW_MANY = 6;

function RecentMovements() {
  // Same keys as the dashboard → read from the cache, no extra requests
  const movementsQuery = useQuery({ queryKey: queryKeys.movements, queryFn: getMovements });
  const accountsQuery = useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts });

  const isPending = movementsQuery.isPending || accountsQuery.isPending;
  const failed = movementsQuery.isError ? movementsQuery : accountsQuery.isError ? accountsQuery : null;

  // Newest first, only the last few
  const recent = [...(movementsQuery.data ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, HOW_MANY);

  // accountId → account, to show names and currencies
  const accountsById = Object.fromEntries((accountsQuery.data ?? []).map((a) => [a.id, a]));

  return (
    <section className="section" aria-labelledby="movements-title">
      <div className="title-row">
        <h2 id="movements-title">Recent movements</h2>
        <UpdatingBadge show={movementsQuery.isFetching && !isPending} />
      </div>

      {isPending && <LoadingRows label="Loading your movements…" rows={3} />}
      {failed && <QueryError error={failed.error} onRetry={() => failed.refetch()} what="your movements" />}

      {!isPending && !failed && recent.length === 0 && (
        <p className="empty">No movements yet.</p>
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
              {formatMoney(toCents(movement.receivedAmount ?? movement.amount), to?.currency ?? currency, {
                sign: true,
              })}
            </span>
          </>
        )}
      </span>
    </li>
  );
}

export default RecentMovements;
