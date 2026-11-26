import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnapshots } from "../hooks/useServerData.js";
import { deleteSnapshot } from "../services/snapshots.js";
import { queryKeys } from "../queryKeys.js";
import { formatMoney, formatShortDate, toCents } from "../utils/money.js";
import ConfirmDelete from "./ConfirmDelete.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

const SHOW_AT_FIRST = 8;

// How my total changed over time: a small chart plus the list of records.
// Each record is a "photo" taken the last time a balance changed that day.
function History({ displayCurrency }) {
  const [showAll, setShowAll] = useState(false);
  const snapshotsQuery = useSnapshots(); // oldest first

  // The total of each record in the currency chosen with the € / $ switch,
  // in cents (null = it couldn't be worked out that day)
  const records = (snapshotsQuery.data ?? []).map((snapshot) => ({
    ...snapshot,
    cents:
      snapshot.totals[displayCurrency] === null ? null : toCents(snapshot.totals[displayCurrency]),
  }));

  // Newest first for the list, each one compared with the record before it
  const newestFirst = records
    .map((record, index) => {
      const previous = records[index - 1];
      const change =
        previous && previous.cents !== null && record.cents !== null
          ? record.cents - previous.cents
          : null;
      return { ...record, change };
    })
    .reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, SHOW_AT_FIRST);

  return (
    <section className="section" aria-labelledby="history-title">
      <div className="title-row">
        <h2 id="history-title">History</h2>
        <UpdatingBadge show={snapshotsQuery.isFetching && !snapshotsQuery.isPending} />
      </div>

      {snapshotsQuery.isPending && <LoadingRows label="Loading your history…" rows={3} />}
      {snapshotsQuery.isError && (
        <QueryError
          error={snapshotsQuery.error}
          onRetry={() => snapshotsQuery.refetch()}
          what="your history"
        />
      )}

      {snapshotsQuery.isSuccess && records.length === 0 && (
        <p className="empty">No history yet. It starts the next time you update a balance.</p>
      )}

      {records.length === 1 && (
        <p className="hint">
          Your history starts here. Update your balances another day to see the line.
        </p>
      )}

      {records.length >= 2 && <HistoryChart records={records} currency={displayCurrency} />}

      {visible.length > 0 && (
        <ul className="rows">
          {visible.map((record) => (
            <HistoryRow key={record.id} record={record} currency={displayCurrency} />
          ))}
        </ul>
      )}

      {newestFirst.length > SHOW_AT_FIRST && (
        <button
          type="button"
          className="link-button toggle-paid"
          aria-expanded={showAll}
          onClick={() => setShowAll((shown) => !shown)}
        >
          {showAll ? "Show fewer" : `Show all (${newestFirst.length})`}
        </button>
      )}
    </section>
  );
}

// A small line chart drawn with plain SVG (no chart library).
// For screen readers it's one image with a sentence describing it; the same
// numbers are in the list below as normal text.
function HistoryChart({ records, currency }) {
  const points = records.filter((record) => record.cents !== null);
  if (points.length < 2) return null;

  const width = 600;
  const height = 160;
  const padding = 10;
  const values = points.map((point) => point.cents);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // A flat line: give it some room so it sits in the middle
    min -= 100;
    max += 100;
  }

  const x = (index) => padding + (index * (width - 2 * padding)) / (points.length - 1);
  const y = (cents) => padding + ((max - cents) * (height - 2 * padding)) / (max - min);
  const line = points.map((point, index) => `${x(index)},${y(point.cents)}`).join(" ");
  const area = `${x(0)},${height} ${line} ${x(points.length - 1)},${height}`;

  const first = points[0];
  const last = points[points.length - 1];
  const description = `Your total went from ${formatMoney(first.cents, currency)} on ${formatShortDate(
    first.date,
  )} to ${formatMoney(last.cents, currency)} on ${formatShortDate(last.date)}, over ${
    points.length
  } records.`;

  return (
    <figure className="chart">
      <div className="chart-scale amount" aria-hidden="true">
        <span>{formatMoney(Math.max(...values), currency)}</span>
        <span>{formatMoney(Math.min(...values), currency)}</span>
      </div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={description}
        preserveAspectRatio="none"
      >
        <polygon className="chart-area" points={area} />
        <polyline className="chart-line" points={line} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="chart-dates" aria-hidden="true">
        <span>{formatShortDate(first.date)}</span>
        <span>{formatShortDate(last.date)}</span>
      </figcaption>
    </figure>
  );
}

function HistoryRow({ record, currency }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteSnapshot(record.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.snapshots }),
  });

  const dateText = formatShortDate(record.date);

  return (
    <li className="row history-row">
      {/* <details>: a native show/hide, keyboard and screen-reader friendly */}
      <details className="history-details">
        <summary>
          <span className="row-title">{dateText}</span>
          <span className="history-numbers">
            <span className="row-amount amount">
              {record.cents === null ? "—" : formatMoney(record.cents, currency)}
            </span>
            {record.change !== null && record.change !== 0 && (
              <span className={`row-sub amount ${record.change > 0 ? "positive" : "negative"}`}>
                {formatMoney(record.change, currency, { sign: true })}
              </span>
            )}
          </span>
        </summary>
        <ul className="history-breakdown">
          {record.accounts.map((account) => (
            <li key={account.accountId}>
              <span>{account.name}</span>
              <span className="amount">
                {formatMoney(toCents(account.balance), account.currency)}
              </span>
            </li>
          ))}
        </ul>
        {deleteMutation.isError && (
          <p className="row-error" role="alert">
            {deleteMutation.error.message}
          </p>
        )}
      </details>

      <ConfirmDelete
        question={`Delete the record of ${dateText}?`}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        label={`Delete the record of ${dateText}`}
        triggerClassName="icon-button row-delete"
      >
        ×
      </ConfirmDelete>
    </li>
  );
}

export default History;
