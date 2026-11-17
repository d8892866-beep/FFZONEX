import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed.error) {
          displayMessage = `${parsed.error} (${parsed.operationType || 'operation'} at ${parsed.path || 'unknown'})`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full surface-gold-edge rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-semibold">Application Recovery</h1>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed break-words">{displayMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload FFZONEX
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
