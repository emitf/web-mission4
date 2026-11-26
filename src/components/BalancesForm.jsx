import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { balancesFormSchema } from "../schemas/account.js";
import { centsToInput, toDotDecimal, today } from "../schemas/common.js";
import { updateAccount } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { toCents } from "../utils/money.js";
import Icon from "./Icon.jsx";
import FieldError from "./FieldError.jsx";
import { useAccounts } from "../hooks/useServerData.js";

const SYMBOL = { EUR: "€", USD: "$" };

// "Update balances": every account in one form, each with today's number
// ready to overwrite. The quick weekly check-in: open, copy the numbers from
// your bank apps and wallet, save.
function BalancesForm({ onDone }) {
  const queryClient = useQueryClient();
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
    mutationFn: (rows) =>
      Promise.all(
        rows.map((row) => updateAccount(row.id, { balance: row.balance, updatedAt: today() })),
      ),
    // onSettled (not onSuccess): if one PATCH fails, the others may already be
    // saved, so we refresh the accounts either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
    onSuccess: () => onDone("Balances updated"),
  });

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
                <span className="visually-hidden">
                  {" "}
                  in {account.currency === "USD" ? "dollars" : "euros"}
                </span>
              </label>
              <span className="money-input">
                <input
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                  {...register(`accounts.${index}.balance`, { setValueAs: toDotDecimal })}
                />
                <span aria-hidden="true">{SYMBOL[account.currency]}</span>
              </span>
              <FieldError id={errorId} error={error} />
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
