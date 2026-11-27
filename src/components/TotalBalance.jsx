import { useMoneySummary } from "../hooks/useMoneySummary.js";
import { useRejectedAccounts, useRejectedIous } from "../hooks/useServerData.js";
import { formatMoney, formatShortDate, otherCurrency, splitMoney } from "../utils/money.js";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

import { CURRENCIES } from "../schemas/common.js";
import { CURRENCY_INFO } from "../constants.js";

function TotalBalance({ displayCurrency, onCurrencyChange }) {
  const summary = useMoneySummary(displayCurrency);
  const { accountsQuery } = summary;

  return (
    <section className="hero" aria-labelledby="total-title">
      <div className="hero-top">
        <div className="title-row">
          <h2 id="total-title" className="hero-label">
            Total balance
          </h2>
          <UpdatingBadge show={accountsQuery.isFetching && !accountsQuery.isPending} />
        </div>

        {/* aria-pressed tells screen readers which currency is selected */}
        <div className="segmented" role="group" aria-label="Show total in">
          {CURRENCIES.map((currency) => (
            <button
              key={currency}
              type="button"
              aria-pressed={displayCurrency === currency}
              aria-label={`Show in ${CURRENCY_INFO[currency].name}`}
              onClick={() => onCurrencyChange(currency)}
            >
              {CURRENCY_INFO[currency].symbol}
            </button>
          ))}
        </div>
      </div>

      {accountsQuery.isPending && <LoadingRows label="Loading your total balance…" rows={1} />}
      {accountsQuery.isError && (
        <QueryError error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
      )}
      {accountsQuery.isSuccess && (
        <HeroAmount summary={summary} displayCurrency={displayCurrency} />
      )}
      <NotCountedWarning />
    </section>
  );
}

// The total must never silently lie: if some records were set aside, say so
function NotCountedWarning() {
  const { data: accounts = [] } = useRejectedAccounts();
  const { data: ious = [] } = useRejectedIous();
  const parts = [];
  if (accounts.length > 0)
    parts.push(`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`);
  if (ious.length > 0) parts.push(`${ious.length} ${ious.length === 1 ? "IOU" : "IOUs"}`);
  if (parts.length === 0) return null;
  return (
    <p className="not-counted">
      {parts.join(" and ")} {accounts.length + ious.length === 1 ? "isn't" : "aren't"} included
      because the data looks wrong. See <a href="#review-title">Needs review</a>.
    </p>
  );
}

function HeroAmount({ summary, displayCurrency }) {
  const { accounts, rateQuery, total, owedToMe, iOwe, net } = summary;
  const foreign = otherCurrency(displayCurrency);
  const accountsNeedRate = accounts.some((account) => account.currency === foreign);

  // Waiting for the rate: we can't add euros and dollars yet
  if (accountsNeedRate && rateQuery.isPending) {
    return <LoadingRows label="Getting today's exchange rate…" rows={1} />;
  }

  // Rate service down: say so, and still show what we can (the accounts list below)
  if (total === null && rateQuery.isError) {
    return (
      <div className="query-error" role="alert">
        <p>
          Can&apos;t convert {foreign === "USD" ? "dollars" : "euros"} right now, so the total
          isn&apos;t available. Your accounts below are still up to date.
        </p>
        <button type="button" className="button-secondary" onClick={() => rateQuery.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (total === null) return null;
  const { whole, decimals, symbol } = splitMoney(total, displayCurrency);

  return (
    <>
      <p className="hero-amount amount">
        {whole}
        <span className="hero-cents">{decimals}</span>
        {symbol}
      </p>

      {/* What I'd have if every IOU were settled today. Only shown once the
          IOUs are known (if they fail to load, the total still shows). */}
      {net !== null && (owedToMe !== 0 || iOwe !== 0) && (
        <p className="hero-net">
          Net with IOUs: <strong className="amount">{formatMoney(net, displayCurrency)}</strong>{" "}
          <span className="hero-note-inline amount">
            (<span className="positive">+{formatMoney(owedToMe, displayCurrency)}</span> owed to you
            − <span className="negative">{formatMoney(iOwe, displayCurrency)}</span> you owe)
          </span>
        </p>
      )}

      {rateQuery.data && (
        <p className="hero-note">
          1 {CURRENCY_INFO[foreign].symbol} ={" "}
          {rateQuery.data.rate.toLocaleString("es-ES", { maximumFractionDigits: 4 })}{" "}
          {CURRENCY_INFO[displayCurrency].symbol} · ECB rate from{" "}
          {formatShortDate(rateQuery.data.date)}
        </p>
      )}
    </>
  );
}

export default TotalBalance;
