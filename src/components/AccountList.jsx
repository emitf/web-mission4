import { useMoneySummary } from "../hooks/useMoneySummary.js";
import AccountRow from "./AccountRow.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

// Uses the same hook as TotalBalance: the accounts come from the cache,
// so showing this list does not send a second request.
function AccountList({ displayCurrency, onAdd, onEdit }) {
  const { accountsQuery, rateQuery, accounts } = useMoneySummary(displayCurrency);

  return (
    <section className="section" aria-labelledby="accounts-title">
      <div className="title-row">
        <h2 id="accounts-title">Accounts</h2>
        <UpdatingBadge show={accountsQuery.isFetching && !accountsQuery.isPending} />
        <button type="button" className="link-button" onClick={onAdd}>
          + Add account
        </button>
      </div>

      {accountsQuery.isPending && <LoadingRows label="Loading your accounts…" rows={4} />}
      {accountsQuery.isError && (
        <QueryError
          error={accountsQuery.error}
          onRetry={() => accountsQuery.refetch()}
          what="your accounts"
        />
      )}

      {accountsQuery.isSuccess && accounts.length === 0 && (
        <p className="empty">No accounts yet. Add your first one to start counting.</p>
      )}

      {accounts.length > 0 && (
        <ul className="rows">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              displayCurrency={displayCurrency}
              rate={rateQuery.data?.rate}
              onEdit={() => onEdit(account)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default AccountList;
