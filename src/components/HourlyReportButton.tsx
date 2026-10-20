'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import HourlyReportModal from '@/components/HourlyReportModal'

export default function HourlyReportButton({ uniqueCallers }: { uniqueCallers: string[] }) {
  const [showHourlyModal, setShowHourlyModal] = useState(false)

  return (
    <>
      <button 
        onClick={() => setShowHourlyModal(true)}
        style={{
          padding: '10px 20px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)',
          borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer',
          fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
      >
        <Clock size={16} />
        Hourly Report
      </button>

      {showHourlyModal && (
        <HourlyReportModal 
          onClose={() => setShowHourlyModal(false)} 
          uniqueCallers={uniqueCallers} 
          initialUser="ALL"
        />
      )}
    </>
  )
}
