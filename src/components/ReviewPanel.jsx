import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useRejectedAccounts,
  useRejectedIous,
  useRejectedSnapshots,
} from "../hooks/useServerData.js";
import { deleteAccount } from "../services/accounts.js";
import { deleteIou } from "../services/ious.js";
import { deleteSnapshot } from "../services/snapshots.js";
import { queryKeys } from "../queryKeys.js";
import ConfirmDelete from "./ConfirmDelete.jsx";

// "Needs review": records from the server that failed their Zod schema.
// They are NOT counted anywhere; this panel says what's wrong with each one.
// It only appears when there is something to review.
function ReviewPanel() {
  // Same cache entries as the lists (select picks the rejected part): no extra requests
  const { data: rejectedAccounts = [] } = useRejectedAccounts();
  const { data: rejectedIous = [] } = useRejectedIous();
  const { data: rejectedSnapshots = [] } = useRejectedSnapshots();

  const total = rejectedAccounts.length + rejectedIous.length + rejectedSnapshots.length;
  if (total === 0) return null;

  return (
    <section className="section review" aria-labelledby="review-title">
      <div className="title-row">
        <h2 id="review-title">⚠ Needs review</h2>
        <span className="review-count">
          {total} {total === 1 ? "record" : "records"}
        </span>
      </div>
      <p className="hint">
        Data from the server that doesn&apos;t look right, so it isn&apos;t counted anywhere.
      </p>

      <ul className="rows">
        {rejectedAccounts.map((entry, index) => (
          <ReviewRow key={`account-${entry.record?.id ?? index}`} entry={entry} kind="account" />
        ))}
        {rejectedIous.map((entry, index) => (
          <ReviewRow key={`iou-${entry.record?.id ?? index}`} entry={entry} kind="iou" />
        ))}
        {rejectedSnapshots.map((entry, index) => (
          <ReviewRow key={`snapshot-${entry.record?.id ?? index}`} entry={entry} kind="snapshot" />
        ))}
      </ul>
    </section>
  );
}

// What the record had, shown short: "12,50" → "12,50", missing → (missing)
function showValue(value) {
  if (value === undefined) return "(missing)";
  const text = JSON.stringify(value);
  return text.length > 30 ? `${text.slice(0, 30)}…` : text;
}

function ReviewRow({ entry, kind }) {
  const queryClient = useQueryClient();
  const { record, problems } = entry;

  // What each kind of record is called, where its readable name is, how to
  // delete it and which cache entry to refresh afterwards
  const KINDS = {
    account: {
      noun: "Account",
      label: record?.name,
      remove: deleteAccount,
      key: queryKeys.accounts,
    },
    iou: { noun: "IOU", label: record?.person, remove: deleteIou, key: queryKeys.ious },
    snapshot: {
      noun: "History record",
      label: record?.date,
      remove: deleteSnapshot,
      key: queryKeys.snapshots,
    },
  };
  const { noun, label, remove, key } = KINDS[kind];

  // A readable name even if the name itself is the broken part
  const title = `${noun} ${
    typeof label === "string" && label.trim() ? `"${label}"` : `#${record?.id ?? "?"}`
  }`;

  // We can only delete it if it has a usable id
  const id = typeof record?.id === "string" && record.id ? record.id : null;

  const deleteMutation = useMutation({
    mutationFn: () => remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return (
    <li className="row review-row">
      <span className="row-main">
        <span className="row-title">{title}</span>
        <ul className="review-problems">
          {problems.map((problem, index) => (
            <li key={index}>
              <strong>{problem.field}</strong>: {problem.message}
              {problem.field !== "record" && (
                <span className="review-received"> (it was {showValue(problem.received)})</span>
              )}
            </li>
          ))}
        </ul>
        {deleteMutation.isError && (
          <span className="row-error" role="alert">
            {deleteMutation.error.message}
          </span>
        )}
      </span>

      {id ? (
        <ConfirmDelete
          question="Delete this broken record?"
          onConfirm={() => deleteMutation.mutate()}
          isPending={deleteMutation.isPending}
          triggerClassName="button-small"
        >
          Delete this record
        </ConfirmDelete>
      ) : (
        <span className="hint">No id: fix it by hand in db.json</span>
      )}
    </li>
  );
}

export default ReviewPanel;
