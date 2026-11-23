import { useBalances } from "../hooks/useBalances.js";
import AccountRow from "./AccountRow.jsx";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

// Uses the same hook as TotalBalance: the accounts and movements come from the
// cache, so opening this list does not send a second request.
function AccountList({ displayCurrency }) {
  const { accountsQuery, rateQuery, balances, isPending, isError, error, isFetching, refetch } =
    useBalances(displayCurrency);

  return (
    <section className="section" aria-labelledby="accounts-title">
      <div className="title-row">
        <h2 id="accounts-title">Accounts</h2>
        <UpdatingBadge show={isFetching && !isPending} />
      </div>

      {isPending && <LoadingRows label="Loading your accounts…" rows={4} />}
      {isError && <QueryError error={error} onRetry={refetch} what="your accounts" />}

      {balances && accountsQuery.data.length === 0 && (
        <p className="empty">No accounts yet. Add your first one to start counting.</p>
      )}

      {balances && accountsQuery.data.length > 0 && (
        <ul className="rows">
          {accountsQuery.data.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              balanceCents={balances[account.id]}
              displayCurrency={displayCurrency}
              rate={rateQuery.data?.rate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default AccountList;
