import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IOU_DIRECTIONS, iouFormSchema } from "../schemas/iou.js";
import { CURRENCIES, centsToInput, today } from "../schemas/common.js";
import { createIou, updateIou } from "../services/ious.js";
import { queryKeys } from "../queryKeys.js";
import { addDays, toCents } from "../utils/money.js";
import { ChoiceField, TextField } from "./Field.jsx";
import { CURRENCY_INFO, DEFAULT_DUE_IN_DAYS, IOU_DIRECTION_LABELS } from "../constants.js";

// The radio options, built from the allowed values (schemas) + their labels (constants)
const DIRECTION_OPTIONS = IOU_DIRECTIONS.map((direction) => ({
  value: direction,
  label: IOU_DIRECTION_LABELS[direction],
}));
// Shown as just "€" / "$", so screen readers get the full name instead
const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency,
  label: CURRENCY_INFO[currency].symbol,
  ariaLabel: CURRENCY_INFO[currency].label,
}));

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
          dueDate: addDays(today(), DEFAULT_DUE_IN_DAYS),
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
      <ChoiceField
        id="iou-direction"
        legend="Who owes whom?"
        hideLegend
        variant="segmented"
        options={DIRECTION_OPTIONS}
        error={errors.direction}
        registration={register("direction")}
      />

      <TextField
        id="iou-person"
        label="Person"
        placeholder="e.g. Lucía"
        error={errors.person}
        {...register("person")}
      />

      <div className="field-row">
        <TextField
          id="iou-amount"
          label="Amount"
          inputMode="decimal"
          placeholder="0,00"
          error={errors.amount}
          {...register("amount")}
        />
        <ChoiceField
          id="iou-currency"
          legend="Currency"
          options={CURRENCY_OPTIONS}
          error={errors.currency}
          registration={register("currency")}
        />
      </div>

      <div className="field-row">
        <TextField
          id="iou-date-lent"
          label="Date lent"
          type="date"
          max={today()}
          error={errors.dateLent}
          {...register("dateLent")}
        />
        <TextField
          id="iou-due-date"
          label="Due date"
          type="date"
          error={errors.dueDate}
          {...register("dueDate")}
        />
      </div>

      <TextField
        id="iou-note"
        label="What for?"
        optional
        placeholder="e.g. Concert ticket"
        error={errors.note}
        {...register("note")}
      />

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
