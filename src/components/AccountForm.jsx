import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { makeAccountFormSchema } from "../schemas/account.js";
import { centsToInput, toDotDecimal, today } from "../schemas/common.js";
import { createAccount, deleteAccount, updateAccount } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { toCents } from "../utils/money.js";
import ConfirmDelete from "./ConfirmDelete.jsx";
import FieldError from "./FieldError.jsx";
import { useAccounts } from "../hooks/useServerData.js";
import { useRecordSnapshot } from "../hooks/useRecordSnapshot.js";

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
// - fixing = true       → the account came from "Needs review": only its valid
//                         fields are filled in, and the broken ones show their
//                         errors straight away so you know what to fix
function AccountForm({ account, fixing = false, onDone }) {
  const isEdit = Boolean(account);
  const queryClient = useQueryClient();
  const recordSnapshot = useRecordSnapshot();

  // Already in the cache from the dashboard: no new request
  const { data: accounts = [] } = useAccounts();

  // Names used by OTHER accounts (so an edit can keep its own name)
  const takenNames = accounts.filter((a) => a.id !== account?.id).map((a) => a.name);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, dirtyFields },
  } = useForm({
    // Fixing: re-check while you type, so each mark disappears as soon as it's fixed
    // (normally the rules only run when you press Save)
    mode: fixing ? "onChange" : "onSubmit",
    resolver: zodResolver(makeAccountFormSchema(takenNames)),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      currency: account?.currency ?? "EUR",
      // shown Spanish-style ("1607,65"); the schema accepts the comma
      // (a broken record may have no usable balance: then it starts empty)
      balance: isEdit && account.balance !== "" ? centsToInput(toCents(account.balance)) : "",
    },
  });

  // Fixing a broken record: run the rules once when the form opens, so the
  // fields that need fixing are already marked (this is DOM/form work, not fetching)
  useEffect(() => {
    if (fixing) trigger(undefined, { shouldFocus: true }); // and put the cursor on the first one
  }, [fixing, trigger]);

  const saveMutation = useMutation({
    // balanceChanged: a new account, or you edited the balance (not just the name)
    mutationFn: ({ data, balanceChanged }) => {
      if (!isEdit) return createAccount({ ...data, updatedAt: today() });
      // "Updated today" only if you actually changed the balance
      const changes = balanceChanged ? { ...data, updatedAt: today() } : data;
      return updateAccount(account.id, changes);
    },
    onSuccess: async (_saved, { balanceChanged }) => {
      // The accounts page of the cache is now out of date → Query fetches it again
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      // A balance changed → today's point in the history
      if (balanceChanged) await recordSnapshot();
      // Clear the form only once the server said yes (if it fails, you keep what you typed)
      reset();
      onDone(fixing ? "Account fixed" : isEdit ? "Changes saved" : "Account added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(account.id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      await recordSnapshot(); // the total changed
      onDone("Account deleted");
    },
  });

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
        What your bank app or wallet shows right now.
      </p>
      <FieldError id="account-balance-error" error={errors.balance} />
    </div>
  );

  return (
    // noValidate: the browser's own checks are off, Zod is in charge of every message
    <form
      className="form"
      onSubmit={handleSubmit((data) =>
        saveMutation.mutate({
          data,
          balanceChanged: !isEdit || fixing || Boolean(dirtyFields.balance),
        }),
      )}
      noValidate
    >
      {fixing && (
        <p className="fix-note">
          This account had data that didn&apos;t look right. Fix the marked fields and save.
        </p>
      )}

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
          <span className="form-actions-start">
            <ConfirmDelete
              question={`Delete "${account.name}"? This can't be undone.`}
              onConfirm={() => deleteMutation.mutate()}
              isPending={deleteMutation.isPending}
              triggerClassName="button-danger"
            >
              Delete
            </ConfirmDelete>
          </span>
        )}
        {/* Clickable until submit (so it can explain what's missing);
            disabled only WHILE sending, to avoid sending twice */}
        <button
          type="submit"
          className="button-primary"
          disabled={saveMutation.isPending || deleteMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving…"
            : fixing
              ? "Save fix"
              : isEdit
                ? "Save changes"
                : "Add account"}
        </button>
      </div>
    </form>
  );
}

export default AccountForm;
