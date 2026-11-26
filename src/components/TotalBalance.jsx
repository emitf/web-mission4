import { useMoneySummary } from "../hooks/useMoneySummary.js";
import { formatMoney, formatShortDate, otherCurrency, splitMoney } from "../utils/money.js";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€", name: "euros" },
  { value: "USD", label: "$", name: "dollars" },
];

const SYMBOL = { EUR: "€", USD: "$" };

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
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={displayCurrency === option.value}
              aria-label={`Show in ${option.name}`}
              onClick={() => onCurrencyChange(option.value)}
            >
              {option.label}
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
    </section>
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
          1 {SYMBOL[foreign]} ={" "}
          {rateQuery.data.rate.toLocaleString("es-ES", { maximumFractionDigits: 4 })}{" "}
          {SYMBOL[displayCurrency]} · ECB rate from {formatShortDate(rateQuery.data.date)}
        </p>
      )}
    </>
  );
}

export default TotalBalance;
