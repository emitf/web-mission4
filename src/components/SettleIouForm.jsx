import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NO_ACCOUNT, makeSettleFormSchema } from "../schemas/iou.js";
import { settleIou } from "../services/payments.js";
import { queryKeys } from "../queryKeys.js";
import { formatMoney, toCents } from "../utils/money.js";
import { SelectField } from "./Field.jsx";
import { CURRENCY_INFO } from "../constants.js";
import { useAccounts } from "../hooks/useServerData.js";
import { useRecordSnapshot } from "../hooks/useRecordSnapshot.js";

// "Mark as paid": closes the IOU and, if you say where the money went,
// also adds it to (or takes it from) that account's balance.
function SettleIouForm({ iou, onDone }) {
  const queryClient = useQueryClient();
  const recordSnapshot = useRecordSnapshot();
  // Already in the cache from the dashboard: no new request
  const { data: accounts = [] } = useAccounts();

  const owedToMe = iou.direction === "owedToMe";
  // Only accounts in the IOU's currency: 25 € don't land in a dollar wallet
  // as 25 $, and we don't know what exchange rate the person used.
  const options = accounts.filter((account) => account.currency === iou.currency);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    // Built with the accounts: paying from a wallet needs enough cash in it
    resolver: zodResolver(makeSettleFormSchema(accounts, iou)),
    defaultValues: { accountId: options[0]?.id ?? NO_ACCOUNT },
  });

  const mutation = useMutation({
    // Two saves in a row (the balance, then the IOU), done safely in the
    // payments service: if the second fails, the first is put back.
    mutationFn: ({ accountId }) => settleIou(iou, accountId === NO_ACCOUNT ? null : accountId),
    onSuccess: async (_saved, { accountId }) => {
      // Both changed: the IOUs (now paid) and the accounts (a balance moved)
      queryClient.invalidateQueries({ queryKey: queryKeys.ious });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      if (accountId !== NO_ACCOUNT) await recordSnapshot(); // a balance changed
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

      <SelectField
        id="settle-account"
        label={owedToMe ? "Where did the money go?" : "Where did the money come from?"}
        hint={
          options.length > 0
            ? `That account's balance will ${owedToMe ? "go up" : "go down"} by ${amountText}.`
            : `You have no accounts in ${CURRENCY_INFO[iou.currency].name}, so no balance will change.`
        }
        options={[
          ...options.map((account) => ({ value: account.id, label: account.name })),
          { value: NO_ACCOUNT, label: "Don't change any balance" },
        ]}
        error={errors.accountId}
        {...register("accountId")}
      />

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
