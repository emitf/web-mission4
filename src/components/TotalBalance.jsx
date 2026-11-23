import { useBalances } from "../hooks/useBalances.js";
import { formatShortDate, splitMoney, toDisplayCents, otherCurrency } from "../utils/money.js";
import { LoadingRows, QueryError, UpdatingBadge } from "./QueryStatus.jsx";

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€", name: "euros" },
  { value: "USD", label: "$", name: "dollars" },
];

function TotalBalance({ displayCurrency, onCurrencyChange }) {
  const { accountsQuery, rateQuery, balances, isPending, isError, error, isFetching, refetch } =
    useBalances(displayCurrency);

  return (
    <section className="hero" aria-labelledby="total-title">
      <div className="hero-top">
        <div className="title-row">
          <h2 id="total-title" className="hero-label">
            Total balance
          </h2>
          <UpdatingBadge show={isFetching && !isPending} />
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

      {isPending && <LoadingRows label="Loading your total balance…" rows={1} />}
      {isError && <QueryError error={error} onRetry={refetch} />}
      {balances && (
        <HeroAmount
          accounts={accountsQuery.data}
          balances={balances}
          displayCurrency={displayCurrency}
          rateQuery={rateQuery}
        />
      )}
    </section>
  );
}

function HeroAmount({ accounts, balances, displayCurrency, rateQuery }) {
  const foreign = otherCurrency(displayCurrency);
  const needsRate = accounts.some((account) => account.currency === foreign);

  // Waiting for the rate: we can't add euros and dollars yet
  if (needsRate && rateQuery.isPending) {
    return <LoadingRows label="Getting today's exchange rate…" rows={1} />;
  }

  // Rate service down: say so, and still show what we can (the accounts list below)
  if (needsRate && rateQuery.isError) {
    return (
      <div className="query-error" role="alert">
        <p>
          Can&apos;t convert {foreign === "USD" ? "dollars" : "euros"} right now, so the
          total isn&apos;t available. Your accounts below are still up to date.
        </p>
        <button type="button" className="button-secondary" onClick={() => rateQuery.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const rate = rateQuery.data?.rate;
  const total = accounts.reduce(
    (sum, account) =>
      sum + toDisplayCents(balances[account.id], account.currency, displayCurrency, rate),
    0,
  );
  const { whole, decimals, symbol } = splitMoney(total, displayCurrency);

  return (
    <>
      <p className="hero-amount amount">
        {whole}
        <span className="hero-cents">{decimals}</span>
        {symbol}
      </p>
      {needsRate && rateQuery.data && (
        <p className="hero-note">
          1 {foreign === "USD" ? "$" : "€"} = {rate.toLocaleString("es-ES", { maximumFractionDigits: 4 })}{" "}
          {displayCurrency === "USD" ? "$" : "€"} · ECB rate from {formatShortDate(rateQuery.data.date)}
        </p>
      )}
    </>
  );
}

export default TotalBalance;
