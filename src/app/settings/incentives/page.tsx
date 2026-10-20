import { getSessionCookie } from '@/lib/auth';
import Link from 'next/link';
import { Users,ChevronRight,IndianRupee } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function IncentiveTeamsPage() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;
  if (user.role !== 'ADMIN' && user.role !== 'TL') {
    redirect('/');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px' }}>
      
      <div style={{ marginBottom: '24px', flexShrink: 0 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IndianRupee size={24} color="#3b82f6" /> Incentive Management
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
          Select a department to configure its incentive targets and rules.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <Link href="/settings/incentives/sales" style={{
          padding: '16px 20px', background: 'var(--table-hover)', border: '1px solid var(--card-border)',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'var(--text-primary)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '10px' }}>
            <Users size={20} color="#3b82f6" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', fontWeight: 500 }}>Sales Team</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Configure webinar, calling, revenue targets and incentive slabs for the Sales department.</p>
          </div>
          <ChevronRight size={18} color='var(--text-muted)' />
        </Link>

      </div>
    </div>
  );
}
