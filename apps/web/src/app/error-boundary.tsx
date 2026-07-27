import { Component, type ReactNode } from "react";

import { translate, type Locale } from "../i18n/resources.js";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public override state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error): void {
    console.error(`Uncaught render error: ${error.name}`);
  }

  private readonly reset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  public override render() {
    if (this.state.hasError) {
      const locale: Locale = document.documentElement.lang.toLowerCase().startsWith("en")
        ? "en"
        : "vi";

      return (
        <main className="centered-state" role="alert">
          <p className="eyebrow">GYM PROGRESS TRACKER</p>
          <h1>{translate(locale, "common", "errorTitle")}</h1>
          <p>{translate(locale, "common", "errorDescription")}</p>
          <button className="button" type="button" onClick={this.reset}>
            {translate(locale, "common", "errorRetry")}
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
