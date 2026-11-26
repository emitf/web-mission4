import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { makeAccountFormSchema } from "../schemas/account.js";
import { centsToInput, toDotDecimal, today } from "../schemas/common.js";
import { createAccount, deleteAccount, updateAccount } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { useAccountData } from "../hooks/useAccountData.js";
import { openingBalanceFor } from "../utils/money.js";
import FieldError from "./FieldError.jsx";

const TYPES = [
  { value: "bank", label: "Bank" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
];

const CURRENCIES = [
  { value: "EUR", label: "Euros (€)" },
  { value: "USD", label: "Dollars ($)" },
];

// One form for both jobs:
// - account = undefined → create a new account (POST)
// - account = {...}     → edit that account (PATCH), starting from its values
function AccountForm({ account, onDone }) {
  const isEdit = Boolean(account);
  const queryClient = useQueryClient();
  const { accounts, movements, balances } = useAccountData();

  // Names used by OTHER accounts (so an edit can keep its own name)
  const takenNames = accounts.filter((a) => a.id !== account?.id).map((a) => a.name);

  // An account with movements can't change currency or be deleted:
  // its past amounts would suddenly be in the wrong currency / point nowhere.
  const hasMovements =
    isEdit && movements.some((m) => m.accountId === account.id || m.toAccountId === account.id);

  // What's in the account today (the number on the dashboard)
  // shown Spanish-style ("1607,65"); the schema accepts the comma
  const currentBalance = isEdit ? centsToInput(balances[account.id]) : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, dirtyFields },
  } = useForm({
    resolver: zodResolver(makeAccountFormSchema(takenNames)),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      currency: account?.currency ?? "EUR",
      balance: currentBalance,
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ balance, ...fields }) => {
      if (!isEdit) {
        // A new account has no movements: what's in it now IS its opening balance
        return createAccount({ ...fields, openingBalance: balance, updatedAt: today() });
      }
      const changes = { ...fields };
      // Only touch the balance (and its "updated" date) if you actually changed it
      if (dirtyFields.balance) {
        changes.openingBalance = openingBalanceFor(balance, account.id, movements);
        changes.updatedAt = today();
      }
      return updateAccount(account.id, changes);
    },
    onSuccess: () => {
      // The accounts page of the cache is now out of date → Query fetches it again
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      // Clear the form only once the server said yes (if it fails, you keep what you typed)
      reset();
      onDone(isEdit ? "Changes saved" : "Account added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      onDone("Account deleted");
    },
  });

  function handleDelete() {
    if (window.confirm(`Delete "${account.name}"? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

  const busy = saveMutation.isPending || deleteMutation.isPending;

  const balanceField = (
    <div className="field">
      <label htmlFor="account-balance">Current balance</label>
      <input
        id="account-balance"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        // When editing, the panel puts the cursor here first (see Dialog.jsx)
        data-autofocus={isEdit ? "" : undefined}
        aria-invalid={errors.balance ? "true" : "false"}
        aria-describedby={
          errors.balance ? "account-balance-hint account-balance-error" : "account-balance-hint"
        }
        {...register("balance", { setValueAs: toDotDecimal })}
      />
      <p id="account-balance-hint" className="hint">
        What your bank app or wallet shows right now. No need to log a transaction.
      </p>
      <FieldError id="account-balance-error" error={errors.balance} />
    </div>
  );

  return (
    // noValidate: the browser's own checks are off, Zod is in charge of every message
    <form className="form" onSubmit={handleSubmit((data) => saveMutation.mutate(data))} noValidate>
      {/* Balance-first: when editing, the number you came to change goes on top */}
      {isEdit && balanceField}

      <div className="field">
        <label htmlFor="account-name">Name</label>
        <input
          id="account-name"
          type="text"
          autoComplete="off"
          placeholder="e.g. BBVA, Revolut, Wallet"
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "account-name-error" : undefined}
          {...register("name")}
        />
        <FieldError id="account-name-error" error={errors.name} />
      </div>

      {/* A group of radios: the legend is read once for the whole group */}
      <fieldset className="field" aria-describedby={errors.type ? "account-type-error" : undefined}>
        <legend>Type</legend>
        <div className="choice-group">
          {TYPES.map((type) => (
            <label key={type.value} className="choice">
              <input
                type="radio"
                value={type.value}
                aria-invalid={errors.type ? "true" : "false"}
                {...register("type")}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
        <FieldError id="account-type-error" error={errors.type} />
      </fieldset>

      {hasMovements ? (
        // Locked: still sent with the form (hidden input), but not editable
        <div className="field">
          <p className="field-label">Currency</p>
          <p className="locked">
            {CURRENCIES.find((c) => c.value === account.currency).label}
            <span className="hint"> · Locked because this account already has activity</span>
          </p>
          <input type="hidden" {...register("currency")} />
        </div>
      ) : (
        <fieldset
          className="field"
          aria-describedby={errors.currency ? "account-currency-error" : undefined}
        >
          <legend>Currency</legend>
          <div className="choice-group">
            {CURRENCIES.map((currency) => (
              <label key={currency.value} className="choice">
                <input
                  type="radio"
                  value={currency.value}
                  aria-invalid={errors.currency ? "true" : "false"}
                  {...register("currency")}
                />
                <span>{currency.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="account-currency-error" error={errors.currency} />
        </fieldset>
      )}

      {!isEdit && balanceField}

      {/* Errors from the server (not from the rules) */}
      {saveMutation.isError && (
        <p className="form-error" role="alert">
          {saveMutation.error.message}
        </p>
      )}
      {deleteMutation.isError && (
        <p className="form-error" role="alert">
          {deleteMutation.error.message}
        </p>
      )}

      <div className="form-actions">
        {isEdit && (
          <button
            type="button"
            className="button-danger"
            onClick={handleDelete}
            disabled={busy || hasMovements}
            aria-describedby={hasMovements ? "delete-hint" : undefined}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        )}
        {/* Clickable until submit (so it can explain what's missing);
            disabled only WHILE sending, to avoid sending twice */}
        <button type="submit" className="button-primary" disabled={busy}>
          {saveMutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
        </button>
      </div>
      {isEdit && hasMovements && (
        <p id="delete-hint" className="hint">
          To delete this account, delete its activity first.
        </p>
      )}
    </form>
  );
}

export default AccountForm;
