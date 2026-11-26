import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { iouFormSchema } from "../schemas/iou.js";
import { centsToInput, toDotDecimal, today } from "../schemas/common.js";
import { createIou, updateIou } from "../services/ious.js";
import { queryKeys } from "../queryKeys.js";
import { addDays, toCents } from "../utils/money.js";
import FieldError from "./FieldError.jsx";

const DIRECTIONS = [
  { value: "owedToMe", label: "They owe me" },
  { value: "iOwe", label: "I owe them" },
];

const CURRENCIES = [
  { value: "EUR", label: "€" },
  { value: "USD", label: "$" },
];

// One form for both jobs, like the account form:
// - iou = undefined → add a new IOU (POST)
// - iou = {...}     → edit it (PATCH), starting from its current values
// - fixing = true → the IOU came from "Needs review" (see AccountForm)
function IouForm({ iou, fixing = false, onDone }) {
  const isEdit = Boolean(iou);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors },
  } = useForm({
    // Fixing: re-check while you type, so each mark disappears as soon as it's fixed
    // (normally the rules only run when you press Save)
    mode: fixing ? "onChange" : "onSubmit",
    resolver: zodResolver(iouFormSchema),
    defaultValues: isEdit
      ? {
          direction: iou.direction,
          person: iou.person,
          amount: iou.amount === "" ? "" : centsToInput(toCents(iou.amount)), // "688,95"
          currency: iou.currency,
          dateLent: iou.dateLent,
          dueDate: iou.dueDate,
          note: iou.note ?? "",
        }
      : {
          direction: "owedToMe",
          person: "",
          amount: "",
          currency: "EUR",
          dateLent: today(),
          dueDate: addDays(today(), 14), // two weeks is a sensible default
          note: "",
        },
  });

  // Fixing a broken record: mark the fields that need fixing as soon as it opens
  useEffect(() => {
    if (fixing) trigger(undefined, { shouldFocus: true }); // and put the cursor on the first one
  }, [fixing, trigger]);

  const mutation = useMutation({
    // A fixed IOU also gets a proper "settled" (a broken one may be missing it)
    mutationFn: (data) => {
      if (!isEdit) return createIou(data);
      return updateIou(iou.id, fixing ? { ...data, settled: iou.settled } : data);
    },
    onSuccess: () => {
      // Only the IOUs changed: the tiles and the IOU list refresh by themselves
      queryClient.invalidateQueries({ queryKey: queryKeys.ious });
      reset();
      onDone(fixing ? "IOU fixed" : isEdit ? "IOU updated" : "IOU added");
    },
  });

  return (
    <form className="form" onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
      {fixing && (
        <p className="fix-note">
          This IOU had data that didn&apos;t look right. Fix the marked fields and save.
        </p>
      )}
      <fieldset className="field">
        <legend className="visually-hidden">Who owes whom?</legend>
        <div className="segmented segmented-wide">
          {DIRECTIONS.map((option) => (
            <label key={option.value} className="segmented-option">
              <input type="radio" value={option.value} {...register("direction")} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <FieldError id="iou-direction-error" error={errors.direction} />
      </fieldset>

      <div className="field">
        <label htmlFor="iou-person">Person</label>
        <input
          id="iou-person"
          type="text"
          autoComplete="off"
          placeholder="e.g. Lucía"
          aria-invalid={errors.person ? "true" : "false"}
          aria-describedby={errors.person ? "iou-person-error" : undefined}
          {...register("person")}
        />
        <FieldError id="iou-person-error" error={errors.person} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="iou-amount">Amount</label>
          <input
            id="iou-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            aria-invalid={errors.amount ? "true" : "false"}
            aria-describedby={errors.amount ? "iou-amount-error" : undefined}
            {...register("amount", { setValueAs: toDotDecimal })}
          />
          <FieldError id="iou-amount-error" error={errors.amount} />
        </div>

        <fieldset
          className="field"
          aria-describedby={errors.currency ? "iou-currency-error" : undefined}
        >
          <legend>Currency</legend>
          <div className="choice-group">
            {CURRENCIES.map((currency) => (
              <label key={currency.value} className="choice">
                <input
                  type="radio"
                  value={currency.value}
                  aria-label={currency.value === "EUR" ? "Euros" : "Dollars"}
                  {...register("currency")}
                />
                <span aria-hidden="true">{currency.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="iou-currency-error" error={errors.currency} />
        </fieldset>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="iou-date-lent">Date lent</label>
          <input
            id="iou-date-lent"
            type="date"
            max={today()}
            aria-invalid={errors.dateLent ? "true" : "false"}
            aria-describedby={errors.dateLent ? "iou-date-lent-error" : undefined}
            {...register("dateLent")}
          />
          <FieldError id="iou-date-lent-error" error={errors.dateLent} />
        </div>

        <div className="field">
          <label htmlFor="iou-due-date">Due date</label>
          <input
            id="iou-due-date"
            type="date"
            aria-invalid={errors.dueDate ? "true" : "false"}
            aria-describedby={errors.dueDate ? "iou-due-date-error" : undefined}
            {...register("dueDate")}
          />
          <FieldError id="iou-due-date-error" error={errors.dueDate} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="iou-note">
          What for? <span className="optional">(optional)</span>
        </label>
        <input
          id="iou-note"
          type="text"
          autoComplete="off"
          placeholder="e.g. Concert ticket"
          aria-invalid={errors.note ? "true" : "false"}
          aria-describedby={errors.note ? "iou-note-error" : undefined}
          {...register("note")}
        />
        <FieldError id="iou-note-error" error={errors.note} />
      </div>

      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving…"
            : fixing
              ? "Save fix"
              : isEdit
                ? "Save changes"
                : "Add IOU"}
        </button>
      </div>
    </form>
  );
}

export default IouForm;
