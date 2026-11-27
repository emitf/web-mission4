import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { balancesFormSchema } from "../schemas/account.js";
import { centsToInput, today } from "../schemas/common.js";
import { updateAccount } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { toCents } from "../utils/money.js";
import Icon from "./Icon.jsx";
import FieldError from "./FieldError.jsx";
import { useAccounts } from "../hooks/useServerData.js";
import { useRecordSnapshot } from "../hooks/useRecordSnapshot.js";

import { CURRENCY_INFO } from "../constants.js";

// "Update balances": every account in one form, each with today's number
// ready to overwrite. The quick weekly check-in: open, copy the numbers from
// your bank apps and wallet, save.
function BalancesForm({ onDone }) {
  const queryClient = useQueryClient();
  const recordSnapshot = useRecordSnapshot();
  // Already in the cache from the dashboard: no new request
  const { data: accounts = [] } = useAccounts();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(balancesFormSchema),
    // One row per account. id and type aren't inputs, but they travel with the
    // data so the schema can apply "cash can't be negative" to the right rows.
    defaultValues: {
      accounts: accounts.map((account) => ({
        id: account.id,
        type: account.type,
        balance: centsToInput(toCents(account.balance)), // "1607,65"
      })),
    },
  });

  const mutation = useMutation({
    // One PATCH per account, all at the same time. Even an unchanged number
    // gets today's date: you checked it, so it's up to date.
    //
    // Promise.allSettled (not Promise.all) waits for EVERY request and says which
    // ones worked, so if one fails we know exactly which accounts were saved.
    mutationFn: async (rows) => {
      const results = await Promise.allSettled(
        rows.map((row) => updateAccount(row.id, { balance: row.balance, updatedAt: today() })),
      );
      const failedIds = rows.filter((_, i) => results[i].status === "rejected").map((r) => r.id);
      if (failedIds.length === 0) return;

      const names = accounts.filter((a) => failedIds.includes(a.id)).map((a) => a.name);
      const saved = rows.length - failedIds.length;
      const error = new Error(
        `${saved} of ${rows.length} saved. ${names.join(", ")} couldn't be saved. ` +
          "Press Save balances to try again.",
      );
      error.failedIds = failedIds; // used below to mark each row
      error.savedCount = saved;
      throw error;
    },
    // onSettled (not onSuccess): even if some failed, the others are already
    // saved, so we refresh the accounts and record today's history either way.
    // Trying again is safe: PATCH is idempotent (the same balance twice = same result).
    onSettled: async (_data, error) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      if (!error || error.savedCount > 0) await recordSnapshot();
    },
    onSuccess: () => onDone("Balances updated"),
  });

  // After a partial save: which rows failed (the rest were saved)
  const failedIds = mutation.error?.failedIds;

  if (accounts.length === 0) {
    return (
      <div className="form">
        <p className="empty">You don&apos;t have any accounts yet. Add one first.</p>
        <div className="form-actions">
          <button type="button" className="button-secondary" onClick={() => onDone()}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="form"
      onSubmit={handleSubmit((data) => mutation.mutate(data.accounts))}
      noValidate
    >
      <p className="hint">
        Type what each account shows right now. Saving marks them all as checked today.
      </p>

      <ul className="rows balance-rows">
        {accounts.map((account, index) => {
          const error = errors.accounts?.[index]?.balance;
          const inputId = `balance-${account.id}`;
          const errorId = `${inputId}-error`;
          return (
            <li key={account.id} className="balance-row">
              <span
                className={`icon-circle ${account.type === "savings" ? "icon-circle-primary" : ""}`}
              >
                <Icon name={account.type} />
              </span>
              <label htmlFor={inputId} className="balance-label">
                {account.name}
                {/* The € / $ next to the box is visual only, so say it for screen readers */}
                <span className="visually-hidden"> in {CURRENCY_INFO[account.currency].name}</span>
              </label>
              <span className="money-input">
                <input
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                  {...register(`accounts.${index}.balance`)}
                />
                <span aria-hidden="true">{CURRENCY_INFO[account.currency].symbol}</span>
              </span>
              <FieldError id={errorId} error={error} />
              {failedIds && (
                <span
                  className={`balance-status ${failedIds.includes(account.id) ? "negative" : "positive"}`}
                >
                  {failedIds.includes(account.id) ? "Couldn't save" : "✓ Saved"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={() => onDone()}>
          Cancel
        </button>
        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save balances"}
        </button>
      </div>
    </form>
  );
}

export default BalancesForm;
