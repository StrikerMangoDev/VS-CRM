'use client'
import type { DashboardUser } from '@/lib/view-types';

import { useState,useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
ChevronLeft,BarChart2,Database,Settings,LogOut,Menu,Video,PhoneCall,Activity,AlertCircle,
Award,TrendingUp,Share2,FolderKanban
} from "lucide-react";
import { logoutAction } from '@/app/actions/auth';
import ConfirmModal from './ConfirmModal';

const SectionHeader = ({ title, isCollapsed = false }: { title: string, isCollapsed?: boolean }) => (
  !isCollapsed && (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', marginTop: '20px', marginBottom: '8px', marginLeft: '12px' }}>
      {title}
    </div>
  )
);

export default function Sidebar({ user, isAdmin }: { user: DashboardUser, isAdmin: boolean, greeting: string, techCounts?: {dailyPaid:number;welcomeCall:number;access:number}, departments?: import('@prisma/client').Prisma.OrgDepartmentGetPayload<{include:{teams:{include:{permittedModules:true}};modules:true}}> [] }) {
  const pathname=usePathname()
  const [collapse,setCollapse]=useState({pathname,value:pathname.includes('/settings')})
  const isCollapsed=collapse.pathname===pathname?collapse.value:pathname.includes('/settings')
  const setIsCollapsed=(value:boolean)=>setCollapse({pathname,value})
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [tooltip, setTooltip] = useState<{ text: string, top: number, visible: boolean }>({ text: '', top: 0, visible: false });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  

  const handleMouseOver = (e: React.MouseEvent) => {
    if (!isCollapsed) return;
    const target = (e.target as HTMLElement).closest('[data-tooltip]');
    if (target) {
      const text = target.getAttribute('data-tooltip');
      const rect = target.getBoundingClientRect();
      if (text) {
        setTooltip({ text, top: rect.top + rect.height / 2, visible: true });
      }
    }
  };

  const handleMouseOut = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (isAdmin || user?.department === 'TECHNICAL') {
      const fetchCount = async () => {
        try {
          const res = await fetch('/api/issues/unassigned-count');
          if (res.ok) {
            const data = await res.json();
            setUnassignedCount(data.count || 0);
          }
        } catch {
          // ignore
        }
      };
      
      fetchCount();
      const interval = setInterval(fetchCount, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, user?.department]);



  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', marginBottom: '24px' }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src="/logo.png" 
                alt="Logo" 
                style={{ 
                  width: '32px', height: '32px', 
                  borderRadius: '6px', 
                  objectFit: 'contain',
                  flexShrink: 0,
                  background: 'var(--text-primary)' // Adding white bg in case logo has transparent text
                }} 
              />
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>VS CRM</h2>
            </div>
          )}
          {isCollapsed && (
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ 
                width: '32px', height: '32px', 
                borderRadius: '6px', 
                objectFit: 'contain',
                flexShrink: 0,
                marginBottom: '16px',
                background: 'var(--text-primary)'
              }} 
            />
          )}
          <button 
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px',
              borderRadius: '6px', transition: 'all 0.2s ease', ...(isCollapsed ? { marginBottom: '16px' } : {})
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation Area */}
        <div className="sidebar-menu-container" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {isAdmin && (
              <>
                <SectionHeader title="ANALYTICS" isCollapsed={isCollapsed} />
                <Link href="/performance" className={`nav-item ${pathname === '/performance' ? 'active' : ''}`} title={isCollapsed ? "Performance" : ""}>
                  <div className="nav-icon shining glow-blue"><Activity size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Performance</span>}
                </Link>
                <Link href="/reports" className={`nav-item ${pathname.includes('/reports') ? 'active' : ''}`} title={isCollapsed ? "Report" : ""}>
                  <div className="nav-icon shining glow-purple"><BarChart2 size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Report</span>}
                </Link>
                <Link href="/incentives" className={`nav-item ${pathname.includes('/incentives') ? 'active' : ''}`} title={isCollapsed ? "Incentives" : ""}>
                  <div className="nav-icon shining glow-emerald"><Award size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Incentives</span>}
                </Link>

                <SectionHeader title="MAIN MENU" isCollapsed={isCollapsed} />
                <Link href="/" className={`nav-item ${['/', '/part-payment', '/full-payment', '/sales/issues'].includes(pathname) ? 'active' : ''}`} title={isCollapsed ? "Sales" : ""}>
                  <div className="nav-icon shining glow-blue"><TrendingUp size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Sales</span>}
                </Link>
                <Link href="/webinars" className={`nav-item ${pathname === '/webinars' ? 'active' : ''}`} title={isCollapsed ? "Webinars" : ""}>
                  <div className="nav-icon shining glow-purple"><Video size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Webinars</span>}
                </Link>
                <Link href="/social-media/vs" className={`nav-item ${ ['/social-media', '/social-media/vs', '/social-media/lvs', '/social-media/ai-telmate', '/social-media/vedic-code', '/social-media/occult-sage', '/social-media/malyam', '/social-media/ad-creative-sheet'].includes(pathname) ? 'active' : ''}`} title={isCollapsed ? "Social Media" : ""}>
                  <div className="nav-icon shining glow-teal"><Share2 size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Social Media</span>}
                </Link>
                <Link href="/social-media/working-sheet" className={`nav-item ${ ['/social-media/working-sheet', '/social-media/graphics-working-sheet', '/social-media/ad-creative-working-sheet', '/social-media/thumbnail-sheet', '/social-media/task-assigned', '/social-media/posting-sheet', '/social-media/posting-daily-task'].includes(pathname) ? 'active' : ''}`} title={isCollapsed ? "Workspace" : ""}>
                  <div className="nav-icon shining glow-emerald"><FolderKanban size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Workspace</span>}
                </Link>
                <Link href="/admin/file-manager" className={`nav-item ${pathname.includes('/file-manager') ? 'active' : ''}`} title={isCollapsed ? "File Manager" : ""}>
                  <div className="nav-icon shining glow-orange"><Database size={18} /></div>
                  {!isCollapsed && <span className="nav-text">File Manager</span>}
                </Link>
                <Link href="/settings" className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} title={isCollapsed ? "Settings" : ""}>
                  <div className="nav-icon shining glow-purple"><Settings size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
              </>
            )}

            {!isAdmin && user?.department === 'ALL' && user?.mainDepartment !== 'Social Media' && (
              <>
                <SectionHeader title="ANALYTICS" />
                <Link href="/performance" className={`nav-item ${pathname === '/performance' ? 'active' : ''}`} title={isCollapsed ? "Performance" : ""}>
                  <div className="nav-icon shining glow-blue"><Activity size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Performance</span>}
                </Link>
                <Link href="/reports" className={`nav-item ${pathname.includes('/reports') ? 'active' : ''}`} title={isCollapsed ? "Report" : ""}>
                  <div className="nav-icon shining glow-purple"><BarChart2 size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Report</span>}
                </Link>
                <Link href="/incentives" className={`nav-item ${pathname.includes('/incentives') ? 'active' : ''}`} title={isCollapsed ? "Incentives" : ""}>
                  <div className="nav-icon shining glow-emerald"><Award size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Incentives</span>}
                </Link>

                <SectionHeader title="MAIN MENU" />
                <Link href="/" className={`nav-item ${['/', '/part-payment', '/full-payment', '/sales/issues'].includes(pathname) ? 'active' : ''}`} title={isCollapsed ? "Sales" : ""}>
                  <div className="nav-icon shining glow-blue"><TrendingUp size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Sales</span>}
                </Link>
                <Link href="/webinars" className={`nav-item ${pathname === '/webinars' ? 'active' : ''}`} title={isCollapsed ? "Webinars" : ""}>
                  <div className="nav-icon shining glow-purple"><Video size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Webinars</span>}
                </Link>
                <Link href="/sales/issues" className={`nav-item ${pathname === '/sales/issues' ? 'active' : ''}`} title={isCollapsed ? "Sales Issues" : ""}>
                  <div className="nav-icon shining glow-purple"><AlertCircle size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Sales Issues</span>}
                </Link>
                <Link href="/extra-dialer" className={`nav-item ${pathname === '/extra-dialer' ? 'active' : ''}`} title={isCollapsed ? "Extra Dialer" : ""}>
                  <div className="nav-icon shining glow-blue"><PhoneCall size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Extra Dialer</span>}
                </Link>

                <Link href="/settings" className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} title={isCollapsed ? "Settings" : ""}>
                  <div className="nav-icon shining glow-purple"><Settings size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
              </>
            )}

            {!isAdmin && user?.department === 'SALES' && (
              <>
                <SectionHeader title="ANALYTICS" />
                <Link href="/performance" className={`nav-item ${pathname === '/performance' ? 'active' : ''}`} title={isCollapsed ? "Performance" : ""}>
                  <div className="nav-icon shining glow-blue"><Activity size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Performance</span>}
                </Link>

                <SectionHeader title="MAIN MENU" />
                <Link href="/sales" className={`nav-item ${pathname === '/sales' ? 'active' : ''}`} title={isCollapsed ? "Sales" : ""}>
                  <div className="nav-icon shining glow-blue"><TrendingUp size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Sales</span>}
                </Link>
                <Link href="/sales/issues" className={`nav-item ${pathname === '/sales/issues' ? 'active' : ''}`} title={isCollapsed ? "Issue Table" : ""}>
                  <div className="nav-icon shining glow-purple"><AlertCircle size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Issue Table</span>}
                </Link>
                <Link href="/extra-dialer" className={`nav-item ${pathname === '/extra-dialer' ? 'active' : ''}`} title={isCollapsed ? "Extra Dialer" : ""}>
                  <div className="nav-icon shining glow-blue"><PhoneCall size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Extra Dialer</span>}
                </Link>
                <Link href="/settings" className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} title={isCollapsed ? "Settings" : ""}>
                  <div className="nav-icon shining glow-purple"><Settings size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
              </>
            )}

            {!isAdmin && user?.department === 'RECOVERY' && (
              <>
                <SectionHeader title="ANALYTICS" />
                <Link href="/performance" className={`nav-item ${pathname === '/performance' ? 'active' : ''}`} title={isCollapsed ? "Performance" : ""}>
                  <div className="nav-icon shining glow-blue"><Activity size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Performance</span>}
                </Link>

                <SectionHeader title="MAIN MENU" />
                <Link href="/recovery" className={`nav-item ${pathname === '/recovery' ? 'active' : ''}`} title={isCollapsed ? `${user?.name?.split(' ')[0] || 'My'} Workspace` : ""}>
                  <div className="nav-icon shining glow-blue"><FolderKanban size={18} /></div>
                  {!isCollapsed && <span className="nav-text">{user?.name?.split(' ')[0] || 'My'} Workspace</span>}
                </Link>
                <Link href="/recovery/issues" className={`nav-item ${pathname === '/recovery/issues' ? 'active' : ''}`} title={isCollapsed ? "Issue Table" : ""}>
                  <div className="nav-icon shining glow-purple"><AlertCircle size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Issue Table</span>}
                </Link>
                <Link href="/extra-dialer" className={`nav-item ${pathname === '/extra-dialer' ? 'active' : ''}`} title={isCollapsed ? "Extra Dialer" : ""}>
                  <div className="nav-icon shining glow-blue"><PhoneCall size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Extra Dialer</span>}
                </Link>
                <Link href="/settings" className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} title={isCollapsed ? "Settings" : ""}>
                  <div className="nav-icon shining glow-purple"><Settings size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
              </>
            )}

            {!isAdmin && user?.department === 'TECHNICAL' && (
              <>
                <SectionHeader title="ANALYTICS" isCollapsed={isCollapsed} />
                <Link href="/performance" className={`nav-item ${pathname === '/performance' ? 'active' : ''}`} title={isCollapsed ? "Performance" : ""}>
                  <div className="nav-icon shining glow-blue"><Activity size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Performance</span>}
                </Link>

                <SectionHeader title="MAIN MENU" isCollapsed={isCollapsed} />
                <Link href="/technical" className={`nav-item ${pathname === '/technical' ? 'active' : ''}`} title={isCollapsed ? `${user?.name?.split(' ')[0] || 'My'} Workspace` : ""}>
                  <div className="nav-icon shining glow-blue"><FolderKanban size={18} /></div>
                  {!isCollapsed && <span className="nav-text">{user?.name?.split(' ')[0] || 'My'} Workspace</span>}
                </Link>
                <Link href="/technical/issues" className={`nav-item ${pathname === '/technical/issues' ? 'active' : ''}`} title={isCollapsed ? "Issue Table" : ""}>
                  <div className="nav-icon shining glow-purple"><AlertCircle size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Issue Table</span>}
                  {!isCollapsed && unassignedCount > 0 && (
                    <span style={{
                      background: '#ef4444', color: 'var(--text-primary)', fontSize: '0.7rem', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto'
                    }}>
                      {unassignedCount}
                    </span>
                  )}
                  {isCollapsed && unassignedCount > 0 && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />
                  )}
                </Link>
                <Link href="/settings" className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} title={isCollapsed ? "Settings" : ""}>
                  <div className="nav-icon shining glow-purple"><Settings size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
              </>
            )}

            {!isAdmin && (user?.mainDepartment === 'Social Media' || ['Social Media', 'Editing Team', 'Graphics Team', 'Posting Team'].includes(user?.department)) && (
              <>
                <SectionHeader title="ANALYTICS" isCollapsed={isCollapsed} />
                <Link href="/performance" className={`nav-item ${pathname === '/performance' ? 'active' : ''}`} title={isCollapsed ? "Performance" : ""}>
                  <div className="nav-icon shining glow-blue"><Activity size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Performance</span>}
                </Link>
                <Link href="/reports" className={`nav-item ${pathname.includes('/reports') ? 'active' : ''}`} title={isCollapsed ? "Report" : ""}>
                  <div className="nav-icon shining glow-purple"><BarChart2 size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Report</span>}
                </Link>

                <SectionHeader title="MAIN MENU" isCollapsed={isCollapsed} />
                {user?.role !== 'EXEC' && (
                  <Link href="/social-media/vs" className={`nav-item ${ ['/social-media', '/social-media/vs', '/social-media/lvs', '/social-media/ai-telmate', '/social-media/vedic-code', '/social-media/occult-sage', '/social-media/malyam', '/social-media/ad-creative-sheet'].includes(pathname) ? 'active' : ''}`} title={isCollapsed ? "Social Media" : ""}>
                    <div className="nav-icon shining glow-teal"><Share2 size={18} /></div>
                    {!isCollapsed && <span className="nav-text">Social Media</span>}
                  </Link>
                )}
                <Link href="/social-media/working-sheet" className={`nav-item ${ ['/social-media/working-sheet', '/social-media/graphics-working-sheet', '/social-media/ad-creative-working-sheet', '/social-media/thumbnail-sheet', '/social-media/task-assigned', '/social-media/posting-sheet', '/social-media/posting-daily-task'].includes(pathname) ? 'active' : ''}`} title={isCollapsed ? `${user?.name?.split(' ')[0] || 'My'} Workspace` : ""}>
                  <div className="nav-icon shining glow-emerald"><FolderKanban size={18} /></div>
                  {!isCollapsed && <span className="nav-text">{user?.name?.split(' ')[0] || 'My'} Workspace</span>}
                </Link>
                <Link href="/settings" className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} title={isCollapsed ? "Settings" : ""}>
                  <div className="nav-icon shining glow-purple"><Settings size={18} /></div>
                  {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
              </>
            )}

          </nav>
        </div>

        {/* Polished Bottom Profile Card */}
        <div style={{ 
          marginTop: 'auto',
          padding: isCollapsed ? '16px 0 0 0' : '12px 16px',
          background: isCollapsed ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
          border: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: isCollapsed ? '16px' : '12px',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <div style={{ 
              width: isCollapsed ? '40px' : '38px', height: isCollapsed ? '40px' : '38px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)', fontWeight: 700, fontSize: isCollapsed ? '1rem' : '0.9rem',
              flexShrink: 0
            }}>
              {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--foreground)', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || 'User'}</span>
                  {isAdmin && <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.5px' }}>ADMIN</span>}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email || 'admin@vscrm.com'}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => setShowLogoutModal(true)}
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--danger)', 
                cursor: 'pointer', display: 'flex', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' 
              }} 
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} 
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }} 
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setIsLoggingOut(true);
          const result = await logoutAction();
          if (result?.success) {
            window.location.href = '/login';
          }
        }}
        title="Sign Out"
        message="Are you sure you want to end your current session? You will need to sign back in to access your dashboard."
        confirmText="Yes, sign out"
        cancelText="Cancel"
        type="warning"
        isLoading={isLoggingOut}
      />

      {isCollapsed && tooltip.visible && (
        <div style={{
          position: 'fixed',
          left: '92px',
          top: `${tooltip.top}px`,
          transform: 'translateY(-50%)',
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 99999,
          border: '1px solid var(--card-border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }}>
          {tooltip.text}
        </div>
      )}
    </>
  );
}
