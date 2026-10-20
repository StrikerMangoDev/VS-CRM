'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Monitor,Moon,Sun } from 'lucide-react'

const subscribe=()=>()=>{}

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme()
  const mounted=useSyncExternalStore(subscribe,()=>true,()=>false)

  if (!mounted) return null

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ color: 'var(--foreground)', marginBottom: '24px', fontSize: '1.5rem', fontWeight: 'bold' }}>Theme Settings</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* Light Theme Option */}
        <button 
          onClick={() => setTheme('light')}
          style={{
            background: 'var(--card-bg)',
            border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--foreground)'
          }}
        >
          <div style={{ background: 'var(--card-border)', padding: '16px', borderRadius: '50%' }}>
            <Sun size={32} />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Light Mode</span>
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>A bright, clean interface.</span>
        </button>

        {/* Dark Theme Option */}
        <button 
          onClick={() => setTheme('dark')}
          style={{
            background: 'var(--card-bg)',
            border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--foreground)'
          }}
        >
          <div style={{ background: 'var(--card-border)', padding: '16px', borderRadius: '50%' }}>
            <Moon size={32} />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Dark Mode</span>
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>A dark, sleek interface.</span>
        </button>

        {/* System Theme Option */}
        <button 
          onClick={() => setTheme('system')}
          style={{
            background: 'var(--card-bg)',
            border: `2px solid ${theme === 'system' ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--foreground)'
          }}
        >
          <div style={{ background: 'var(--card-border)', padding: '16px', borderRadius: '50%' }}>
            <Monitor size={32} />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>System</span>
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Follows system preferences.</span>
        </button>

      </div>
    </div>
  )
}
