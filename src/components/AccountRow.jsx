import Icon from "./Icon.jsx";
import { daysAgoText, daysBetween, formatMoney, toDisplayCents } from "../utils/money.js";
import { today } from "../schemas/common.js";

const TYPE_LABELS = { bank: "Bank", savings: "Savings", cash: "Cash" };

// After two weeks without checking, the number is probably out of date
const STALE_AFTER_DAYS = 14;

function AccountRow({ account, balanceCents, displayCurrency, rate, onEdit }) {
  // If the account is in the other currency, also show roughly what it's worth
  const converted =
    account.currency !== displayCurrency
      ? toDisplayCents(balanceCents, account.currency, displayCurrency, rate)
      : null;

  // When did I last confirm this balance?
  const daysSinceUpdate = account.updatedAt ? daysBetween(account.updatedAt, today()) : null;
  const isStale = daysSinceUpdate !== null && daysSinceUpdate >= STALE_AFTER_DAYS;

  return (
    <li>
      {/* The whole row is a button: click (or Enter) to edit the account */}
      <button type="button" className="row row-button" onClick={onEdit}>
        <span className={`icon-circle ${account.type === "savings" ? "icon-circle-primary" : ""}`}>
          <Icon name={account.type} />
        </span>

        <span className="row-main">
          <span className="row-title">
            <span className="visually-hidden">Edit </span>
            {account.name}
          </span>
          <span className="row-sub">
            {TYPE_LABELS[account.type]}
            {daysSinceUpdate !== null && (
              <span className={isStale ? "stale" : ""}>
                {" "}
                · updated {daysAgoText(daysSinceUpdate)}
              </span>
            )}
          </span>
        </span>

        <span className="row-end">
          <span className={`row-amount amount ${balanceCents < 0 ? "negative" : ""}`}>
            {formatMoney(balanceCents, account.currency)}
          </span>
          {converted !== null && (
            <span className="row-sub amount">≈ {formatMoney(converted, displayCurrency)}</span>
          )}
        </span>
      </button>
    </li>
  );
}

export default AccountRow;
