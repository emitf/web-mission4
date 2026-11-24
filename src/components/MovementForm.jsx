import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_LABELS, makeMovementFormSchema } from "../schemas/movement.js";
import { today } from "../schemas/common.js";
import { getAccounts } from "../services/accounts.js";
import { createMovement } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import FieldError from "./FieldError.jsx";

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const SYMBOL = { EUR: "€", USD: "$" };

// Spanish keyboards type "12,50": we turn the comma into a dot before Zod sees it
const commaToDot = (value) => (typeof value === "string" ? value.replace(",", ".") : value);

// Only the fields that make sense for this type are saved
function toMovement(data, sameCurrency) {
  const movement = {
    type: data.type,
    amount: data.amount,
    accountId: data.accountId,
    category: data.type === "expense" ? data.category : "",
    description: data.description,
    date: data.date,
  };
  if (data.type === "transfer") {
    movement.toAccountId = data.toAccountId;
    if (!sameCurrency) movement.receivedAmount = data.receivedAmount;
  }
  return movement;
}

function MovementForm({ onDone }) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts });

  const defaultValues = {
    type: "expense",
    accountId: accounts[0]?.id ?? "",
    toAccountId: "",
    amount: "",
    receivedAmount: "",
    category: "",
    description: "",
    date: today(),
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(makeMovementFormSchema(accounts)),
    defaultValues,
    // Fields that disappear (e.g. "category" when you switch to Income) are
    // removed from the data, so hidden fields can never block the submit.
    shouldUnregister: true,
  });

  // useWatch (the hook version of watch) re-renders the form when these change:
  // we need them "live" to decide which fields to show.
  const type = useWatch({ control, name: "type" });
  const accountId = useWatch({ control, name: "accountId" });
  const toAccountId = useWatch({ control, name: "toAccountId" });

  const currencyOf = (id) => accounts.find((account) => account.id === id)?.currency;
  const fromCurrency = currencyOf(accountId) ?? "EUR";
  const toCurrency = currencyOf(toAccountId);
  const sameCurrency = !toCurrency || toCurrency === fromCurrency;
  const showReceived = type === "transfer" && !sameCurrency;

  const mutation = useMutation({
    mutationFn: createMovement,
    onSuccess: (_saved, sent) => {
      // Balances are CALCULATED from movements, so refreshing the movements is
      // enough: the totals and the account balances update by themselves.
      // ["movements"] also covers every ["movements", { accountId }] list.
      queryClient.invalidateQueries({ queryKey: queryKeys.movements });
      // Clear the form for the next one, but keep the type, account and date:
      // logging several expenses in a row is the usual case.
      reset({ ...defaultValues, type: sent.type, accountId: sent.accountId, date: sent.date });
    },
  });

  if (accounts.length === 0) {
    return (
      <div className="form">
        <p className="empty">Add an account first, then you can log movements in it.</p>
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
      onSubmit={handleSubmit((data) => mutation.mutate(toMovement(data, sameCurrency)))}
      noValidate
    >
      <fieldset className="field">
        <legend className="visually-hidden">Kind of movement</legend>
        <div className="segmented segmented-wide">
          {TYPES.map((option) => (
            <label key={option.value} className="segmented-option">
              <input type="radio" value={option.value} {...register("type")} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="movement-account">{type === "transfer" ? "From account" : "Account"}</label>
        <select
          id="movement-account"
          aria-invalid={errors.accountId ? "true" : "false"}
          aria-describedby={errors.accountId ? "movement-account-error" : undefined}
          {...register("accountId")}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({SYMBOL[account.currency]})
            </option>
          ))}
        </select>
        <FieldError id="movement-account-error" error={errors.accountId} />
      </div>

      {type === "transfer" && (
        <div className="field">
          <label htmlFor="movement-to">To account</label>
          <select
            id="movement-to"
            aria-invalid={errors.toAccountId ? "true" : "false"}
            aria-describedby={errors.toAccountId ? "movement-to-error" : undefined}
            {...register("toAccountId")}
          >
            <option value="">Choose an account…</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({SYMBOL[account.currency]})
              </option>
            ))}
          </select>
          <FieldError id="movement-to-error" error={errors.toAccountId} />
        </div>
      )}

      <div className="field">
        <label htmlFor="movement-amount">
          {showReceived ? "Amount sent" : "Amount"} ({SYMBOL[fromCurrency]})
        </label>
        <input
          id="movement-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={errors.amount ? "true" : "false"}
          aria-describedby={errors.amount ? "movement-amount-error" : undefined}
          {...register("amount", { setValueAs: commaToDot })}
        />
        <FieldError id="movement-amount-error" error={errors.amount} />
      </div>

      {showReceived && (
        <div className="field">
          <label htmlFor="movement-received">Amount received ({SYMBOL[toCurrency]})</label>
          <input
            id="movement-received"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            aria-invalid={errors.receivedAmount ? "true" : "false"}
            aria-describedby={
              errors.receivedAmount
                ? "movement-received-hint movement-received-error"
                : "movement-received-hint"
            }
            {...register("receivedAmount", { setValueAs: commaToDot })}
          />
          <p id="movement-received-hint" className="hint">
            What actually arrived after the exchange, as your bank or the exchange office shows it.
          </p>
          <FieldError id="movement-received-error" error={errors.receivedAmount} />
        </div>
      )}

      {type === "expense" && (
        <div className="field">
          <label htmlFor="movement-category">Category</label>
          <select
            id="movement-category"
            aria-invalid={errors.category ? "true" : "false"}
            aria-describedby={errors.category ? "movement-category-error" : undefined}
            {...register("category")}
          >
            <option value="">Choose a category…</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <FieldError id="movement-category-error" error={errors.category} />
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="movement-date">Date</label>
          <input
            id="movement-date"
            type="date"
            max={today()}
            aria-invalid={errors.date ? "true" : "false"}
            aria-describedby={errors.date ? "movement-date-error" : undefined}
            {...register("date")}
          />
          <FieldError id="movement-date-error" error={errors.date} />
        </div>

        <div className="field">
          <label htmlFor="movement-description">
            Description <span className="optional">(optional)</span>
          </label>
          <input
            id="movement-description"
            type="text"
            autoComplete="off"
            placeholder="e.g. Weekly shop"
            aria-invalid={errors.description ? "true" : "false"}
            aria-describedby={errors.description ? "movement-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="movement-description-error" error={errors.description} />
        </div>
      </div>

      {/* Feedback from the server: error (alert, interrupts) or success (status, polite) */}
      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}
      <p className="form-success" role="status">
        {mutation.isSuccess && !mutation.isPending
          ? "Movement saved. You can add another one."
          : ""}
      </p>

      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={() => onDone()}>
          Done
        </button>
        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save movement"}
        </button>
      </div>
    </form>
  );
}

export default MovementForm;
