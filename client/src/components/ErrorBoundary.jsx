import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px 32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(55,65,81,0.4)' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>{'\u26A0\uFE0F'}</div>
          <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>{'\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A'}</p>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            {'\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
