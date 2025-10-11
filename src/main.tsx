import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { prefetch } from "./lib/prefetch";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

const scheduleAnalytics = () => {
  import("./analytics")
    .then((module) => module.init?.())
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.warn("Deferred analytics failed to load", error);
      }
    });
};

const win = window as typeof window & {
  requestIdleCallback?: (cb: IdleRequestCallback) => number;
};

if (typeof win.requestIdleCallback === "function") {
  win.requestIdleCallback(scheduleAnalytics);
} else {
  window.setTimeout(scheduleAnalytics, 2000);
}

export { prefetch };
