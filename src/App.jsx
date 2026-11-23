import { useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import TotalBalance from "./components/TotalBalance.jsx";
import SummaryTiles from "./components/SummaryTiles.jsx";
import AccountList from "./components/AccountList.jsx";
import RecentMovements from "./components/RecentMovements.jsx";

function App() {
  // The currency the totals are shown in. It's a UI choice, not server data,
  // so it lives in normal React state.
  const [displayCurrency, setDisplayCurrency] = useState("EUR");

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="overview">
          <TotalBalance
            displayCurrency={displayCurrency}
            onCurrencyChange={setDisplayCurrency}
          />
          <SummaryTiles displayCurrency={displayCurrency} />
        </div>
        <AccountList displayCurrency={displayCurrency} />
        <RecentMovements />
      </main>
    </>
  );
}

export default App;
