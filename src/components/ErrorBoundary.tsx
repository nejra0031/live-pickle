import React from 'react';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16,
          background: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 40 }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: 18, color: '#dc2626', margin: 0 }}>
          Something went wrong
        </p>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0, textAlign: 'center' }}>
          {String(this.state.error?.message || this.state.error)}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            background: 'linear-gradient(90deg,#0f4c75,#1a6fa8)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Reload &amp; reconnect
        </button>
      </div>
    );
  }
}
