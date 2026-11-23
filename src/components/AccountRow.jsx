import Icon from "./Icon.jsx";
import { formatMoney, toDisplayCents } from "../utils/money.js";

const TYPE_LABELS = { bank: "Bank", savings: "Savings", cash: "Cash" };

function AccountRow({ account, balanceCents, displayCurrency, rate }) {
  // If the account is in the other currency, also show roughly what it's worth
  const converted =
    account.currency !== displayCurrency
      ? toDisplayCents(balanceCents, account.currency, displayCurrency, rate)
      : null;

  return (
    <li className="row">
      <span className={`icon-circle ${account.type === "savings" ? "icon-circle-primary" : ""}`}>
        <Icon name={account.type} />
      </span>

      <span className="row-main">
        <span className="row-title">{account.name}</span>
        <span className="row-sub">
          {TYPE_LABELS[account.type]} · {account.currency}
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
    </li>
  );
}

export default AccountRow;
