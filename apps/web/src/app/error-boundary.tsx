import { Component, type ReactNode } from "react";

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
      return (
        <main className="centered-state" role="alert">
          <p className="eyebrow">GYM PROGRESS TRACKER</p>
          <h1>Đã có lỗi xảy ra</h1>
          <p>Ứng dụng không thể hiển thị nội dung này. Bạn có thể thử tải lại phần giao diện.</p>
          <button className="button" type="button" onClick={this.reset}>
            Thử lại
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
