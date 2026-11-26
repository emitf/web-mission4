import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NO_ACCOUNT, makeSettleFormSchema } from "../schemas/iou.js";
import { today } from "../schemas/common.js";
import { updateIou } from "../services/ious.js";
import { changeBalance, getAccounts } from "../services/accounts.js";
import { queryKeys } from "../queryKeys.js";
import { formatMoney, toCents } from "../utils/money.js";
import FieldError from "./FieldError.jsx";

// "Mark as paid": closes the IOU and, if you say where the money went,
// also adds it to (or takes it from) that account's balance.
function SettleIouForm({ iou, onDone }) {
  const queryClient = useQueryClient();
  // Already in the cache from the dashboard: no new request
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: getAccounts });

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
    // Two saves in a row: first the account's balance, then the IOU itself,
    // which remembers the account so "Undo" can put the balance back.
    mutationFn: async ({ accountId }) => {
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        const cents = toCents(iou.amount);
        await changeBalance(account, owedToMe ? cents : -cents);
      }
      return updateIou(iou.id, {
        settled: true,
        settledAt: today(),
        settledAccountId: account?.id ?? null,
      });
    },
    onSuccess: () => {
      // Both changed: the IOUs (now paid) and the accounts (a balance moved)
      queryClient.invalidateQueries({ queryKey: queryKeys.ious });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
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
