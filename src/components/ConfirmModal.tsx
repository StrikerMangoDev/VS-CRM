'use client';
import { AlertTriangle,Info,AlertCircle } from 'lucide-react';
import { ReactNode } from 'react';

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
};

export default function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger', isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getStyleConfig = () => {
    switch (type) {
      case 'danger': 
        return { 
          iconBg: 'rgba(239, 68, 68, 0.15)', 
          iconColor: 'var(--danger)', 
          btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)', 
          btnHover: 'linear-gradient(135deg, #f87171, #ef4444)',
          btnShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          Icon: AlertTriangle 
        };
      case 'warning': 
        return { 
          iconBg: 'rgba(245, 158, 11, 0.15)', 
          iconColor: 'var(--warning)', 
          btnBg: 'linear-gradient(135deg, #f59e0b, #d97706)', 
          btnHover: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          btnShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          Icon: AlertCircle 
        };
      case 'info':
      default: 
        return { 
          iconBg: 'rgba(59, 130, 246, 0.15)', 
          iconColor: 'var(--primary)', 
          btnBg: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
          btnHover: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
          btnShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          Icon: Info 
        };
    }
  };

  const config = getStyleConfig();
  const IconComponent = config.Icon;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--card-bg)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999999, padding: '24px'
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '16px', width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
        overflow: 'hidden', animation: 'scaleInConfirm 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: config.iconBg, color: config.iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: 'inset 0 0 12px rgba(255,255,255,0.05)'
          }}>
            <IconComponent size={24} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, paddingTop: '4px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, letterSpacing: '0.01em' }}>
              {title}
            </h3>
            <div style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 400 }}>
              {message}
            </div>
          </div>
        </div>
        
        <div style={{
          background: 'var(--card-bg)', padding: '16px 24px',
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          borderTop: '1px solid rgba(255,255,255,0.05)'
        }}>
          <button 
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-secondary)',
              padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseOver={e => !isLoading && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseOut={e => !isLoading && (e.currentTarget.style.background = 'transparent')}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              background: config.btnBg, border: 'none', color: 'var(--text-primary)',
              padding: '8px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: config.btnShadow,
              opacity: isLoading ? 0.8 : 1
            }}
            onMouseOver={e => !isLoading && (e.currentTarget.style.background = config.btnHover)}
            onMouseOut={e => !isLoading && (e.currentTarget.style.background = config.btnBg)}
          >
            {isLoading ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes scaleInConfirm {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
