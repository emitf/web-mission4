import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CURRENCIES, centsToInput, today } from "../schemas/common.js";
import { ACCOUNT_TYPES, makeAccountFormSchema } from "../schemas/account.js";
import { createAccount, deleteAccount, updateAccount } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { toCents } from "../utils/money.js";
import ConfirmDelete from "./ConfirmDelete.jsx";
import { ChoiceField, TextField } from "./Field.jsx";
import { ACCOUNT_TYPE_LABELS, CURRENCY_INFO } from "../constants.js";
import { useAccounts } from "../hooks/useServerData.js";
import { useRecordSnapshot } from "../hooks/useRecordSnapshot.js";

// The radio options, built from the allowed values (schemas) + their labels (constants)
const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({
  value: type,
  label: ACCOUNT_TYPE_LABELS[type],
}));
const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency,
  label: CURRENCY_INFO[currency].label,
}));

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

  // A function (not a ready-made element) so the field is registered at the
  // place it appears on screen: React Hook Form focuses the first wrong field
  // in the order the fields were registered.
  const balanceField = () => (
    <TextField
      id="account-balance"
      label="Current balance"
      hint="What your bank app or wallet shows right now."
      error={errors.balance}
      inputMode="decimal"
      placeholder="0,00"
      // When editing, the panel puts the cursor here first (see Dialog.jsx)
      data-autofocus={isEdit ? "" : undefined}
      {...register("balance")}
    />
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
      {isEdit && balanceField()}

      <TextField
        id="account-name"
        label="Name"
        placeholder="e.g. BBVA, Revolut, Wallet"
        error={errors.name}
        {...register("name")}
      />

      <ChoiceField
        id="account-type"
        legend="Type"
        options={TYPE_OPTIONS}
        error={errors.type}
        registration={register("type")}
      />

      <ChoiceField
        id="account-currency"
        legend="Currency"
        options={CURRENCY_OPTIONS}
        error={errors.currency}
        registration={register("currency")}
      />

      {!isEdit && balanceField()}

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
