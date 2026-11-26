import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteIou, updateIou } from "../services/ious.js";
import { changeBalance } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { today } from "../schemas/common.js";
import { daysBetween, formatMoney, formatShortDate, toCents } from "../utils/money.js";
import ConfirmDelete from "./ConfirmDelete.jsx";
import Icon from "./Icon.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";
import { useAccounts, useIous } from "../hooks/useServerData.js";

// Money people owe me and money I owe them.
// Open ones first (soonest due on top); paid ones can be shown on demand.
function IouList({ onAdd, onSettle }) {
  const [showPaid, setShowPaid] = useState(false);

  // Same key as the summary tiles → shared cache, one request
  const iousQuery = useIous();

  const ious = iousQuery.data ?? [];
  const open = ious
    .filter((iou) => !iou.settled)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const paid = ious
    .filter((iou) => iou.settled)
    .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""));

  return (
    <section className="section" aria-labelledby="ious-title">
      <div className="title-row">
        <h2 id="ious-title">IOUs</h2>
        <UpdatingBadge show={iousQuery.isFetching && !iousQuery.isPending} />
        <button type="button" className="link-button" onClick={onAdd}>
          + Add IOU
        </button>
      </div>

      {iousQuery.isPending && <LoadingRows label="Loading your IOUs…" rows={2} />}
      {iousQuery.isError && (
        <QueryError error={iousQuery.error} onRetry={() => iousQuery.refetch()} what="your IOUs" />
      )}

      {iousQuery.isSuccess && open.length === 0 && (
        <p className="empty">Nobody owes anybody anything. Nice.</p>
      )}

      {open.length > 0 && (
        <ul className="rows">
          {open.map((iou) => (
            <IouRow key={iou.id} iou={iou} onSettle={() => onSettle(iou)} />
          ))}
        </ul>
      )}

      {paid.length > 0 && (
        <>
          {/* aria-expanded tells screen readers whether the paid list is showing */}
          <button
            type="button"
            className="link-button toggle-paid"
            aria-expanded={showPaid}
            aria-controls="paid-ious"
            onClick={() => setShowPaid((shown) => !shown)}
          >
            {showPaid ? "Hide paid" : `Show paid (${paid.length})`}
          </button>
          {showPaid && (
            <ul id="paid-ious" className="rows rows-paid">
              {paid.map((iou) => (
                <IouRow key={iou.id} iou={iou} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function IouRow({ iou, onSettle }) {
  const queryClient = useQueryClient();
  const owedToMe = iou.direction === "owedToMe";
  const cents = toCents(iou.amount);

  // Already in the cache from the dashboard: needed by "Undo"
  const { data: accounts = [] } = useAccounts();

  // Undo can change an account's balance too, so both lists get refreshed
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ious });
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteIou(iou.id),
    onSuccess: refresh,
  });

  // Undo a "Mark as paid": take the money back out of (or put it back into)
  // the account it went to, and reopen the IOU.
  const undoMutation = useMutation({
    mutationFn: async () => {
      // If that account was deleted since, there's no balance to fix
      const account = accounts.find((a) => a.id === iou.settledAccountId);
      if (account) await changeBalance(account, owedToMe ? -cents : cents);
      return updateIou(iou.id, { settled: false, settledAt: null, settledAccountId: null });
    },
    onSuccess: refresh,
  });

  // Due date text: "due 1 Dec", or in amber "overdue 8 days"
  const daysLate = daysBetween(iou.dueDate, today());
  const overdue = !iou.settled && daysLate > 0;
  const failed = deleteMutation.isError
    ? deleteMutation
    : undoMutation.isError
      ? undoMutation
      : null;

  return (
    <li className="row">
      <span className="icon-circle">
        <Icon name={owedToMe ? "income" : "expense"} />
      </span>

      <span className="row-main">
        <span className="row-title">{iou.person}</span>
        <span className="row-sub">
          {owedToMe ? "Owes me" : "I owe"}
          {iou.note ? ` · ${iou.note}` : ""}
          {iou.settled ? (
            ` · paid ${iou.settledAt ? formatShortDate(iou.settledAt) : ""}`
          ) : overdue ? (
            <span className="overdue">
              {" "}
              · overdue {daysLate} {daysLate === 1 ? "day" : "days"}
            </span>
          ) : (
            ` · due ${formatShortDate(iou.dueDate)}`
          )}
        </span>
        {failed && (
          <span className="row-error" role="alert">
            {failed.error.message}
          </span>
        )}
      </span>

      <span className="row-end">
        <span
          className={`row-amount amount ${iou.settled ? "" : owedToMe ? "positive" : "negative"}`}
        >
          {formatMoney(owedToMe ? cents : -cents, iou.currency, { sign: true })}
        </span>
      </span>

      {iou.settled ? (
        <button
          type="button"
          className="button-small"
          onClick={() => undoMutation.mutate()}
          disabled={undoMutation.isPending}
          aria-label={`Undo paid: ${iou.person}`}
        >
          {undoMutation.isPending ? "Undoing…" : "Undo"}
        </button>
      ) : (
        <button
          type="button"
          className="button-small"
          onClick={onSettle}
          aria-label={`Mark as paid: ${iou.person}`}
        >
          Paid
        </button>
      )}

      <ConfirmDelete
        question={`Delete the IOU with ${iou.person}?`}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        label={`Delete the IOU with ${iou.person}`}
        triggerClassName="icon-button row-delete"
      >
        ×
      </ConfirmDelete>
    </li>
  );
}

export default IouList;
