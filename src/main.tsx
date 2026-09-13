import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { APP_NAME } from "./ui/brand";
import { hydrateDataCache } from "./data/dataCacheStore";

class BootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md p-6 pt-16 text-center font-sans text-ink">
          <h1 className="mb-2 text-lg font-semibold">{APP_NAME} couldn&apos;t start</h1>
          <p className="mb-4 text-sm text-muted">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

async function boot() {
  try {
    await hydrateDataCache();
  } catch {
    /* bundled JSON is the fallback */
  }
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BootErrorBoundary>
        <App />
      </BootErrorBoundary>
    </StrictMode>,
  );
}

void boot();
