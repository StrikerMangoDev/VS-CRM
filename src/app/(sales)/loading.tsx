import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div style={{
      padding: '48px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    }}>
      <Loader2 
        size={20} 
        color="#60a5fa" 
        style={{ animation: 'spin 1s linear infinite' }} 
      />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
        Loading...
      </span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
