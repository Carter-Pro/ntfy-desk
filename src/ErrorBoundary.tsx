import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#202020] text-white flex flex-col items-center justify-center p-6">
          <h1 className="text-[20px] font-semibold mb-2">Something went wrong</h1>
          <p className="text-[13px] text-[#999] mb-4">{this.state.error?.message || "Unknown error"}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#0078d4] hover:bg-[#005a9e] text-white text-[13px] rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
