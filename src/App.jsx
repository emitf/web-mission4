import { useRef, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import TotalBalance from "./components/TotalBalance.jsx";
import SummaryTiles from "./components/SummaryTiles.jsx";
import AccountList from "./components/AccountList.jsx";
import RecentMovements from "./components/RecentMovements.jsx";
import Dialog from "./components/Dialog.jsx";
import AccountForm from "./components/AccountForm.jsx";
import MovementForm from "./components/MovementForm.jsx";

function App() {
  // The currency the totals are shown in. It's a UI choice, not server data,
  // so it lives in normal React state.
  const [displayCurrency, setDisplayCurrency] = useState("EUR");

  // Which panel is open: null, { kind: "account", account? } or { kind: "movement" }
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

  const panelTitle =
    panel?.kind === "movement" ? "New movement" : panel?.account ? "Edit account" : "New account";

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="overview">
          <TotalBalance
            displayCurrency={displayCurrency}
            onCurrencyChange={setDisplayCurrency}
          />
          <button
            type="button"
            className="button-primary button-add"
            onClick={() => setPanel({ kind: "movement" })}
          >
            + Add movement
          </button>
          <SummaryTiles displayCurrency={displayCurrency} />
        </div>
        <AccountList
          displayCurrency={displayCurrency}
          onAdd={() => setPanel({ kind: "account" })}
          onEdit={(account) => setPanel({ kind: "account", account })}
        />
        <RecentMovements />
      </main>

      <Dialog open={panel !== null} title={panelTitle} onClose={() => closePanel()}>
        {panel?.kind === "account" && (
          <AccountForm account={panel.account} onDone={closePanel} />
        )}
        {panel?.kind === "movement" && <MovementForm onDone={closePanel} />}
      </Dialog>

      {/* Always in the page, so screen readers notice when its text changes */}
      <p className={`toast ${notice ? "toast-visible" : ""}`} role="status">
        {notice}
      </p>
    </>
  );
}

export default App;
