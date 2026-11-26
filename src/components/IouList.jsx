import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteIou, getIous, updateIou } from "../services/ious.js";
import { deleteMovement } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import { today } from "../schemas/common.js";
import { daysBetween, formatMoney, formatShortDate, toCents } from "../utils/money.js";
import Icon from "./Icon.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

// Money people owe me and money I owe them.
// Open ones first (soonest due on top); paid ones can be shown on demand.
function IouList({ onAdd, onSettle }) {
  const [showPaid, setShowPaid] = useState(false);

  // Same key as the summary tiles → shared cache, one request
  const iousQuery = useQuery({ queryKey: queryKeys.ious, queryFn: getIous });

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

  // Both IOUs and movements can change (Undo removes the payment movement)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ious });
    queryClient.invalidateQueries({ queryKey: queryKeys.movements });
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteIou(iou.id),
    onSuccess: refresh,
  });

  // Undo a "Mark as paid": remove the movement it created (if any) and reopen it
  const undoMutation = useMutation({
    mutationFn: async () => {
      if (iou.settledMovementId) {
        try {
          await deleteMovement(iou.settledMovementId);
        } catch {
          // Already deleted by hand from the activity list: nothing to undo there
        }
      }
      return updateIou(iou.id, { settled: false, settledAt: null, settledMovementId: null });
    },
    onSuccess: refresh,
  });

  function handleDelete() {
    if (window.confirm(`Delete the IOU with ${iou.person}? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

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

      <button
        type="button"
        className="icon-button row-delete"
        aria-label={`Delete the IOU with ${iou.person}`}
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? "…" : "×"}
      </button>
    </li>
  );
}

export default IouList;
