import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getWebinarById,getWebinarAnalytics } from '@/app/actions/webinar'
import WebinarRecordings from '@/components/WebinarRecordings'

export default async function WebinarDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    redirect('/login')
  }

  const resolvedParams = await params;
  const webinarId = resolvedParams.id;

  const webinar = await getWebinarById(webinarId)
  if (!webinar) {
    return <div style={{ color: 'var(--text-primary)', padding: '24px' }}>Webinar not found.</div>
  }

  const analytics = await getWebinarAnalytics(webinarId)
  
  const registered = webinar.leads.length
  const attended = analytics.attended
  const absent = registered - attended
  const attendancePercent = registered > 0 ? ((attended / registered) * 100).toFixed(2) + '%' : '-'

  const d = new Date(webinar.date);
  const dateStr = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <Link href="/webinars" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Back to Webinars
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{webinar.id}</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 400 }}>{webinar.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" style={{ padding: '6px 16px', fontWeight: 600, fontSize: '0.85rem' }}>Edit Webinar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '8px' }}>
        
        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>CATEGORY</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>{webinar.category.name}</div>
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>DATE</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>{dateStr}</div>
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>TIME</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>
              {webinar.startTime ? `${webinar.startTime} - ${webinar.endTime || 'End'}` : 'Not Set'}
            </div>
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>STATUS</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>
              <span className={`badge ${
                webinar.status === 'COMPLETED' ? 'badge-success' : 
                webinar.status === 'SCHEDULED' ? 'badge-warning' : 
                webinar.status === 'LIVE' ? 'badge-primary' : 'badge-danger'
              }`}>
                {webinar.status}
              </span>
            </div>
          </div>
        </div>

        {/* Analytics & Attendance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Webinar Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>TOTAL LEADS</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>{analytics.totalLeads}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>TOTAL PAID</div>
                <div style={{ color: 'var(--success)', fontSize: '1.25rem', fontWeight: 700 }}>₹{analytics.totalPaid.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ZERO PAYMENT</div>
                <div style={{ color: 'var(--danger)', fontSize: '1.1rem', fontWeight: 600 }}>{analytics.zeroPayment}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>PART PAYMENT</div>
                <div style={{ color: 'var(--warning)', fontSize: '1.1rem', fontWeight: 600 }}>{analytics.partPayment}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>FULL PAYMENT</div>
                <div style={{ color: 'var(--success)', fontSize: '1.1rem', fontWeight: 600 }}>{analytics.fullPayment}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>CONVERSION</div>
                <div style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 600 }}>{analytics.conversionPercent}</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Attendance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>REGISTERED</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>{registered}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ATTENDED</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>{attended}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ABSENT</div>
                <div style={{ color: 'var(--danger)', fontSize: '1.1rem', fontWeight: 600 }}>{absent}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ATTENDANCE %</div>
                <div style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 600 }}>{attendancePercent}</div>
              </div>
            </div>
            
            <h4 style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--table-hover)', padding: '8px 12px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>WhatsApp Group</span>
                {webinar.whatsappGroupUrl ? (
                  <a href={webinar.whatsappGroupUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success)', fontSize: '0.8rem', textDecoration: 'none' }}>Open →</a>
                ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not set</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--table-hover)', padding: '8px 12px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Webinar Link</span>
                {webinar.webinarUrl ? (
                  <a href={webinar.webinarUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'none' }}>Open →</a>
                ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not set</span>}
              </div>
            </div>
          </div>
          
        </div>

        {/* Recordings */}
        <WebinarRecordings 
          webinarId={webinar.id}
          webinarName={webinar.name}
          recordings={webinar.recordings}
        />

      </div>
    </div>
  )
}
