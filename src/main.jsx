import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./index.css";
import App from "./App.jsx";

// One QueryClient for the whole app: it holds the cache of server data
// (accounts, IOUs and exchange rates).
// By default Query retries a failed request 3 times (≈ 7 seconds) before
// showing the error. My server is on my own laptop: if it fails once it's
// almost always just switched off, so 1 retry is enough and the user finds out sooner.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools />
    </QueryClientProvider>
  </StrictMode>,
);
