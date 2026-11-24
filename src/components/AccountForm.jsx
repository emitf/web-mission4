import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { makeAccountFormSchema } from "../schemas/account.js";
import { createAccount, deleteAccount, getAccounts, updateAccount } from "../services/accounts.js";
import { getMovements } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
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

// Spanish keyboards type "12,50": we turn the comma into a dot before Zod sees it
const commaToDot = (value) => (typeof value === "string" ? value.replace(",", ".") : value);

// One form for both jobs:
// - account = undefined → create a new account (POST)
// - account = {...}     → edit that account (PATCH), starting from its values
function AccountForm({ account, onDone }) {
  const isEdit = Boolean(account);
  const queryClient = useQueryClient();

  // Already in the cache from the dashboard: no new request
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts });
  const { data: movements = [] } = useQuery({
    queryKey: queryKeys.movements,
    queryFn: getMovements,
  });

  // Names used by OTHER accounts (so an edit can keep its own name)
  const takenNames = accounts.filter((a) => a.id !== account?.id).map((a) => a.name);

  // An account with movements can't change currency or be deleted:
  // its past amounts would suddenly be in the wrong currency / point nowhere.
  const hasMovements =
    isEdit && movements.some((m) => m.accountId === account.id || m.toAccountId === account.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(makeAccountFormSchema(takenNames)),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      currency: account?.currency ?? "EUR",
      openingBalance: account ? String(account.openingBalance) : "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => (isEdit ? updateAccount(account.id, data) : createAccount(data)),
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

  return (
    // noValidate: the browser's own checks are off, Zod is in charge of every message
    <form className="form" onSubmit={handleSubmit((data) => saveMutation.mutate(data))} noValidate>
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
            <span className="hint"> · Locked because this account already has movements</span>
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

      <div className="field">
        <label htmlFor="account-balance">Starting balance</label>
        <input
          id="account-balance"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={errors.openingBalance ? "true" : "false"}
          aria-describedby={
            errors.openingBalance
              ? "account-balance-hint account-balance-error"
              : "account-balance-hint"
          }
          {...register("openingBalance", { setValueAs: commaToDot })}
        />
        <p id="account-balance-hint" className="hint">
          How much was in it when you started using Clear Count.
        </p>
        <FieldError id="account-balance-error" error={errors.openingBalance} />
      </div>

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
          To delete this account, delete its movements first.
        </p>
      )}
    </form>
  );
}

export default AccountForm;
