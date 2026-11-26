import { useRef, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import TotalBalance from "./components/TotalBalance.jsx";
import SummaryTiles from "./components/SummaryTiles.jsx";
import AccountList from "./components/AccountList.jsx";
import Dialog from "./components/Dialog.jsx";
import AccountForm from "./components/AccountForm.jsx";
import BalancesForm from "./components/BalancesForm.jsx";
import IouList from "./components/IouList.jsx";
import IouForm from "./components/IouForm.jsx";
import SettleIouForm from "./components/SettleIouForm.jsx";
import ReviewPanel from "./components/ReviewPanel.jsx";
import History from "./components/History.jsx";

// The title of each panel
const PANEL_TITLES = {
  balances: "Update balances",
  account: "New account",
  editAccount: "Edit account",
  iou: "New IOU",
  editIou: "Edit IOU",
  fixAccount: "Fix account",
  fixIou: "Fix IOU",
  settle: "Mark as paid",
};

function App() {
  // The currency the totals are shown in. It's a UI choice, not server data,
  // so it lives in normal React state.
  const [displayCurrency, setDisplayCurrency] = useState("EUR");

  // Which panel is open: null or { kind, account?, iou? } (see PANEL_TITLES)
  const [panel, setPanel] = useState(null);

  // Short confirmation after a panel closes ("Account added")
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);

  function closePanel(message) {
    setPanel(null);
    if (message) {
      setNotice(message);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(""), 4000);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="overview">
          <TotalBalance displayCurrency={displayCurrency} onCurrencyChange={setDisplayCurrency} />
          {/* The main action of a balance-first app: copy today's numbers in */}
          <button
            type="button"
            className="button-primary button-add"
            onClick={() => setPanel({ kind: "balances" })}
          >
            Update balances
          </button>
          <SummaryTiles displayCurrency={displayCurrency} />
        </div>
        <ReviewPanel
          onFix={(kind, record) =>
            setPanel(
              kind === "account"
                ? { kind: "fixAccount", account: record }
                : { kind: "fixIou", iou: record },
            )
          }
        />
        <AccountList
          displayCurrency={displayCurrency}
          onAdd={() => setPanel({ kind: "account" })}
          onEdit={(account) => setPanel({ kind: "editAccount", account })}
        />
        <IouList
          onAdd={() => setPanel({ kind: "iou" })}
          onSettle={(iou) => setPanel({ kind: "settle", iou })}
          onEdit={(iou) => setPanel({ kind: "editIou", iou })}
        />
        <History displayCurrency={displayCurrency} />
      </main>

      <Dialog open={panel !== null} title={PANEL_TITLES[panel?.kind]} onClose={() => closePanel()}>
        {panel?.kind === "balances" && <BalancesForm onDone={closePanel} />}
        {panel?.kind === "account" && <AccountForm onDone={closePanel} />}
        {panel?.kind === "editAccount" && (
          <AccountForm account={panel.account} onDone={closePanel} />
        )}
        {panel?.kind === "iou" && <IouForm onDone={closePanel} />}
        {panel?.kind === "editIou" && <IouForm iou={panel.iou} onDone={closePanel} />}
        {panel?.kind === "fixAccount" && (
          <AccountForm account={panel.account} fixing onDone={closePanel} />
        )}
        {panel?.kind === "fixIou" && <IouForm iou={panel.iou} fixing onDone={closePanel} />}
        {panel?.kind === "settle" && <SettleIouForm iou={panel.iou} onDone={closePanel} />}
      </Dialog>

      {/* Always in the page, so screen readers notice when its text changes */}
      <p className={`toast ${notice ? "toast-visible" : ""}`} role="status">
        {notice}
      </p>
    </>
  );
}

export default App;
