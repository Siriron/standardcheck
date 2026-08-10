import { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
          <div className="max-w-sm text-center font-mono">
            <p className="text-rust text-sm tracking-widest uppercase mb-3">
              something broke
            </p>
            <h1 className="font-display text-2xl font-semibold mb-3">
              The page hit an error it couldn't recover from.
            </h1>
            <p className="text-ink-soft text-sm mb-6">
              Reloading usually fixes this. If it keeps happening, the contract or
              network config may be misconfigured.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-ink-soft transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
