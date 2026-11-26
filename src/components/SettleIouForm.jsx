import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NO_ACCOUNT, settleFormSchema } from "../schemas/iou.js";
import { today } from "../schemas/common.js";
import { updateIou } from "../services/ious.js";
import { createMovement } from "../services/movements.js";
import { queryKeys } from "../queryKeys.js";
import { useAccountData } from "../hooks/useAccountData.js";
import { formatMoney, toCents } from "../utils/money.js";
import FieldError from "./FieldError.jsx";

// "Mark as paid": closes the IOU and, if you say where the money went,
// also moves it in or out of that account so the balance stays right.
function SettleIouForm({ iou, onDone }) {
  const queryClient = useQueryClient();
  const { accounts } = useAccountData();

  const owedToMe = iou.direction === "owedToMe";
  // Only accounts in the IOU's currency: 25 € can't land in a dollar wallet
  // without knowing the exchange, and that's what a transfer is for.
  const options = accounts.filter((account) => account.currency === iou.currency);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settleFormSchema),
    defaultValues: { accountId: options[0]?.id ?? NO_ACCOUNT },
  });

  const mutation = useMutation({
    // Two saves in a row: first the money (a movement), then the IOU itself,
    // which remembers that movement so "Undo" can remove it again.
    mutationFn: async ({ accountId }) => {
      let movement = null;
      if (accountId !== NO_ACCOUNT) {
        movement = await createMovement({
          type: owedToMe ? "income" : "expense",
          amount: iou.amount,
          accountId,
          category: owedToMe ? "" : "other",
          description: owedToMe ? `${iou.person} paid me back` : `Paid back ${iou.person}`,
          date: today(),
        });
      }
      return updateIou(iou.id, {
        settled: true,
        settledAt: today(),
        settledMovementId: movement?.id ?? null,
      });
    },
    onSuccess: () => {
      // Both lists changed: the IOUs (now paid) and the movements (balances)
      queryClient.invalidateQueries({ queryKey: queryKeys.ious });
      queryClient.invalidateQueries({ queryKey: queryKeys.movements });
      onDone(owedToMe ? `${iou.person} paid you back` : `Marked as paid to ${iou.person}`);
    },
  });

  const amountText = formatMoney(toCents(iou.amount), iou.currency);

  return (
    <form className="form" onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
      <p className="settle-summary">
        {owedToMe ? `${iou.person} pays you ` : `You pay ${iou.person} `}
        <strong className="amount">{amountText}</strong>
        {iou.note ? ` · ${iou.note}` : ""}
      </p>

      <div className="field">
        <label htmlFor="settle-account">
          {owedToMe ? "Where did the money go?" : "Where did the money come from?"}
        </label>
        <select
          id="settle-account"
          aria-invalid={errors.accountId ? "true" : "false"}
          aria-describedby={
            errors.accountId ? "settle-account-hint settle-account-error" : "settle-account-hint"
          }
          {...register("accountId")}
        >
          {options.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
          <option value={NO_ACCOUNT}>Don&apos;t change any balance</option>
        </select>
        <p id="settle-account-hint" className="hint">
          {options.length > 0
            ? `That account's balance will ${owedToMe ? "go up" : "go down"} by ${amountText}.`
            : `You have no accounts in ${iou.currency === "USD" ? "dollars" : "euros"}, so no balance will change.`}
        </p>
        <FieldError id="settle-account-error" error={errors.accountId} />
      </div>

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
          {mutation.isPending ? "Saving…" : "Mark as paid"}
        </button>
      </div>
    </form>
  );
}

export default SettleIouForm;
