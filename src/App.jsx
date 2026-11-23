import AppHeader from "./components/AppHeader.jsx";

function App() {
  return (
    <>
      <AppHeader />
      <main className="page">
        <section className="section" aria-labelledby="overview-title">
          <h2 id="overview-title">Overview</h2>
          <p className="muted">Your accounts and total balance will appear here.</p>
        </section>
      </main>
    </>
  );
}

export default App;
