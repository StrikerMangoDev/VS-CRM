'use client'
import type { LeadMetrics,Person,DashboardUser,TopPerformer,IssueView } from '@/lib/view-types'
import type { LeadPage,WebinarStats } from '@/lib/lead-query'

import { useState } from 'react'
import SalesTable from '@/components/SalesTable'
import TechnicalTable from '@/components/TechnicalTable'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import PerformanceDashboard from '@/components/PerformanceDashboard'
import { BarChart3,List,Presentation,X,PhoneCall } from 'lucide-react'
import Link from 'next/link'

export default function SalesPortalTabs({ 
  initialPage, webinarStats,
  isAdmin, 
  customColumns, 
  executives,
  webinars = [],
  userRole,
  isClosed = false,
  portalType = 'SALES',
  currentUser,
  topPerformers = [],
  allLeadsForDashboard = [],
  issues = []
}: { 
  initialPage: LeadPage, webinarStats: WebinarStats[], 
  allLeadsForDashboard?: LeadMetrics[],
  isAdmin: boolean, 
  customColumns: import('@prisma/client').CustomColumn[], 
  executives: Person[],
  webinars?: import('@prisma/client').WebinarMaster[],
  userRole?: string,
  isClosed?: boolean,
  portalType?: 'SALES' | 'RECOVERY' | 'TECHNICAL',
  currentUser: DashboardUser,
  topPerformers?: TopPerformer[],
  issues?: IssueView[]
}) {
  const [activeTab, setActiveTab] = useState<'webinars' | 'table' | 'issues' | 'dashboard'>(isClosed ? 'table' : 'webinars')
  const [activeWebinarFilter, setActiveWebinarFilter] = useState<string | null>(null)
  const [technicalTab, setTechnicalTab] = useState<'daily_paid' | 'welcome_call' | 'access'>('daily_paid')

  const allWebinars = webinarStats.map(stat=>stat.webinar)

  const baseTitle = portalType === 'RECOVERY' ? 'Recovery' : portalType === 'TECHNICAL' ? 'Technical Team' : 'Sales'
  const basePath = portalType === 'RECOVERY' ? '/recovery' : portalType === 'TECHNICAL' ? '/technical' : '/sales'

  const filteredLeads = allLeadsForDashboard

  const handleStartCalling = (webinar: string) => {
    setActiveWebinarFilter(webinar)
    setActiveTab('table')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>{isClosed ? `${baseTitle} Closed Leads` : `${baseTitle} Dashboard`}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {userRole === 'EXEC' && activeTab === 'dashboard' ? `Your ${baseTitle.toLowerCase()} performance at a glance` : (isClosed ? 'Queue for closed leads' : 'Queue for active leads')}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {portalType !== 'TECHNICAL' && (
            <Link 
              href={isClosed ? basePath : `${basePath}?type=closed`}
              style={{
                background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s'
              }}
            >
              {isClosed ? 'View Active Leads' : 'View Closed Leads'}
            </Link>
          )}
          
          {!isClosed && (
            <div style={{ display: 'flex', background: 'var(--card-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <button
                onClick={() => setActiveTab('webinars')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500,
              background: activeTab === 'webinars' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'webinars' ? '#60a5fa' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Presentation size={16} />
            Webinars
          </button>
          <button
            onClick={() => { setActiveTab('table'); setActiveWebinarFilter(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500,
              background: activeTab === 'table' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'table' ? '#60a5fa' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <List size={16} />
            All Leads
          </button>

          {(userRole !== 'EXEC' || portalType === 'SALES') && (
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500,
                background: activeTab === 'dashboard' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: activeTab === 'dashboard' ? '#60a5fa' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <BarChart3 size={16} />
              Performance
            </button>
          )}
        </div>
        )}
      </div>
    </div>

      {activeTab === 'webinars' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {allWebinars.map(webinar => {
            const { untouched,connected,notConnected,followUps,todayFollowUps,totalTechnical,whatsappPending,welcomePending,lmsPending } = webinarStats.find(stat=>stat.webinar===webinar)!

            return (
              <div key={webinar} style={{ 
                background: 'var(--card-bg)', border: '1px solid var(--card-border)', 
                borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 12px 0' }}>
                    {webinar} {webinars?.find(w => w.id === webinar)?.name ? `- ${webinars.find(w => w.id === webinar)?.name}` : ''}
                  </h3>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {portalType === 'TECHNICAL' ? (
                      <>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Leads</div>
                          <div style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 700 }}>{totalTechnical}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>WhatsApp Pending</div>
                          <div style={{ color: 'var(--danger)', fontSize: '1.25rem', fontWeight: 700 }}>{whatsappPending}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Welcome Pending</div>
                          <div style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 700 }}>{welcomePending}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Access Pending</div>
                          <div style={{ color: '#8b5cf6', fontSize: '1.25rem', fontWeight: 700 }}>{lmsPending}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Untouched</div>
                          <div style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 700 }}>{untouched}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Connected</div>
                          <div style={{ color: 'var(--success)', fontSize: '1.25rem', fontWeight: 700 }}>{connected}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Not Connected</div>
                          <div style={{ color: 'var(--danger)', fontSize: '1.25rem', fontWeight: 700 }}>{notConnected}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Follow Ups</div>
                          <div style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 700 }}>{followUps}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Today Follow Up</div>
                          <div style={{ color: '#8b5cf6', fontSize: '1.25rem', fontWeight: 700 }}>{todayFollowUps}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleStartCalling(webinar)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: '#3b82f6', color: 'var(--text-primary)', border: 'none', 
                    padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                >
                  <PhoneCall size={18} />
                  Start Calling
                </button>
              </div>
            )
          })}
          {allWebinars.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No webinars assigned yet.</div>
          )}
        </div>
      )}

      {activeTab === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {activeWebinarFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'var(--card-bg)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Filtered by Webinar ID:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, background: 'rgba(59, 130, 246, 0.8)', padding: '4px 12px', borderRadius: '6px' }}>{activeWebinarFilter}</span>
              <button 
                onClick={() => setActiveWebinarFilter(null)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={14} /> Clear Filter
              </button>
            </div>
          )}
          {portalType === 'TECHNICAL' && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--card-border)' }}>
              <button 
                onClick={() => setTechnicalTab('daily_paid')} 
                style={{ 
                  padding: '8px 16px', background: 'transparent', cursor: 'pointer',
                  color: technicalTab === 'daily_paid' ? '#3b82f6' : 'var(--text-muted)', 
                  border: 'none',
                  borderBottom: technicalTab === 'daily_paid' ? '2px solid #3b82f6' : '2px solid transparent',
                  fontWeight: technicalTab === 'daily_paid' ? 600 : 400,
                }}
              >
                Daily Paid Queue
              </button>
              <button 
                onClick={() => setTechnicalTab('welcome_call')} 
                style={{ 
                  padding: '8px 16px', background: 'transparent', cursor: 'pointer',
                  color: technicalTab === 'welcome_call' ? '#3b82f6' : 'var(--text-muted)', 
                  border: 'none',
                  borderBottom: technicalTab === 'welcome_call' ? '2px solid #3b82f6' : '2px solid transparent',
                  fontWeight: technicalTab === 'welcome_call' ? 600 : 400,
                }}
              >
                Welcome Calls
              </button>
              <button 
                onClick={() => setTechnicalTab('access')} 
                style={{ 
                  padding: '8px 16px', background: 'transparent', cursor: 'pointer',
                  color: technicalTab === 'access' ? '#3b82f6' : 'var(--text-muted)', 
                  border: 'none',
                  borderBottom: technicalTab === 'access' ? '2px solid #3b82f6' : '2px solid transparent',
                  fontWeight: technicalTab === 'access' ? 600 : 400,
                }}
              >
                Access Sheet
              </button>
            </div>
          )}
          {portalType === 'TECHNICAL' ? (
            <TechnicalTable key={technicalTab+(activeWebinarFilter||'')} initialPage={initialPage} webinarFilter={activeWebinarFilter} tabType={technicalTab} />
          ) : (
            <SalesTable initialPage={initialPage} webinarFilter={activeWebinarFilter} isAdmin={isAdmin} updaterDepartment={portalType} customColumns={customColumns} sheetName={portalType} webinars={webinars} executives={executives} isClosed={isClosed} userRole={userRole} />
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div>
          {userRole === 'EXEC' ? (
            <PerformanceDashboard 
              initialLeads={filteredLeads} 
              user={currentUser} 
              topPerformers={topPerformers} 
              issues={issues}
            />
          ) : (
            <AnalyticsDashboard leadQuery={{sheet:portalType,analytics:true}} leads={filteredLeads} executives={executives} userRole={userRole} />
          )}
        </div>
      )}
    </div>
  )
}
