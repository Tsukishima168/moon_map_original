import React from 'react';
import { CONFIG } from '../config/site';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('未預期的錯誤:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            background: CONFIG.BRAND_COLORS.creamWhite,
            color: CONFIG.BRAND_COLORS.emotionBlack,
            fontFamily: '"Noto Sans TC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            頁面發生錯誤，請重新整理再試一次。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            重新整理
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
