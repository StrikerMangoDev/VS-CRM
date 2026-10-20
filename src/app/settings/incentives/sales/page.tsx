'use client';

import { useState,useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft,Video,Phone,IndianRupee,LineChart,AlertCircle,Settings } from 'lucide-react';

type IncentiveConfig = {
  webinarTarget: number;
  webinarWeightage: number;
  webinarMaximumCap: number;
  callingTarget: number;
  callingWeightage: number;
  callingMaximumCap: number;
  revenueTarget: number;
  revenueWeightage: number;
  revenueHasCap: boolean;
  pipThreshold: number;
  noIncentiveStart: number;
  noIncentiveEnd: number;
  fixedIncentiveStart: number;
  fixedIncentiveEnd: number;
  fixedIncentiveAmount: number;
  additionalIncentiveStart: number;
  additionalIncentivePerPercentage: number;
};

export default function IncentiveSettingsPage() {
  const [config, setConfig] = useState<IncentiveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/incentives')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setConfig(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/incentives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      alert('Incentive settings saved successfully!');
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof IncentiveConfig, value: number | boolean) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  if (loading) return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Loading incentive settings...</div>;
  if (!config) return <div style={{ padding: '24px', color: 'var(--danger)' }}>{error || 'Failed to load configuration'}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <div style={{ marginBottom: '8px' }}>
            <Link href="/settings/incentives" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'color 0.2s' }}>
              <ArrowLeft size={16} /> Back to Departments
            </Link>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IndianRupee size={24} color="#3b82f6" /> Sales Team Incentives
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Configure agent performance targets, weightage, incentive rules, and PIP criteria for the Sales department.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{ 
            padding: '10px 20px', background: saving ? 'var(--text-muted)' : '#3b82f6', color: 'var(--text-primary)', 
            border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: '24px', flexDirection: 'column', paddingRight: '8px' }}>
        
        {/* Performance Targets & Weightage */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChart size={20} color="#3b82f6" /> PERFORMANCE TARGETS & WEIGHTAGE
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Webinar */}
            <div style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Video size={18} color="#8b5cf6" /> Webinar Attendance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Target (Days)</span>
                  <input type="number" value={config.webinarTarget} onChange={e => updateConfig('webinarTarget', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Weightage (%)</span>
                  <input type="number" value={config.webinarWeightage} onChange={e => updateConfig('webinarWeightage', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cap (%)</span>
                  <input type="number" value={config.webinarMaximumCap} onChange={e => updateConfig('webinarMaximumCap', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>

            {/* Calling */}
            <div style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Phone size={18} color="#10b981" /> Calling Time
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Target (Mins)</span>
                  <input type="number" value={config.callingTarget} onChange={e => updateConfig('callingTarget', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Weightage (%)</span>
                  <input type="number" value={config.callingWeightage} onChange={e => updateConfig('callingWeightage', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cap (%)</span>
                  <input type="number" value={config.callingMaximumCap} onChange={e => updateConfig('callingMaximumCap', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <IndianRupee size={18} color="#f59e0b" /> Revenue
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Target (₹)</span>
                  <input type="number" value={config.revenueTarget} onChange={e => updateConfig('revenueTarget', Number(e.target.value))} style={{ width: '100px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Weightage (%)</span>
                  <input type="number" value={config.revenueWeightage} onChange={e => updateConfig('revenueWeightage', Number(e.target.value))} style={{ width: '80px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Has Cap?</span>
                  <input type="checkbox" checked={config.revenueHasCap} onChange={e => updateConfig('revenueHasCap', e.target.checked)} style={{ cursor: 'pointer' }} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Incentive Rules */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="#3b82f6" /> PERFORMANCE & INCENTIVE RULES
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* PIP Rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--table-hover)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--text-primary)', minWidth: '80px' }}>0% –</span>
                <input type="number" value={config.pipThreshold} onChange={e => updateConfig('pipThreshold', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>%</span>
              </div>
              <span style={{ color: 'var(--danger)', fontWeight: 600, minWidth: '150px' }}>→ PIP (₹0)</span>
            </div>

            {/* No Incentive */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--table-hover)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#eab308', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="number" value={config.noIncentiveStart} onChange={e => updateConfig('noIncentiveStart', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>% –</span>
                <input type="number" value={config.noIncentiveEnd} onChange={e => updateConfig('noIncentiveEnd', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>%</span>
              </div>
              <span style={{ color: '#eab308', fontWeight: 600, minWidth: '150px' }}>→ No Incentive (₹0)</span>
            </div>

            {/* Fixed Incentive */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--table-hover)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="number" value={config.fixedIncentiveStart} onChange={e => updateConfig('fixedIncentiveStart', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>% –</span>
                <input type="number" value={config.fixedIncentiveEnd} onChange={e => updateConfig('fixedIncentiveEnd', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>→ ₹</span>
                <input type="number" value={config.fixedIncentiveAmount} onChange={e => updateConfig('fixedIncentiveAmount', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.75rem' }}>Fixed</span>
              </div>
            </div>

            {/* Additional Incentive */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--table-hover)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontSize: '10px' }}>🚀</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--text-primary)', minWidth: '80px' }}>Above</span>
                <input type="number" value={config.additionalIncentiveStart} onChange={e => updateConfig('additionalIncentiveStart', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>→ ₹</span>
                <input type="number" value={config.additionalIncentivePerPercentage} onChange={e => updateConfig('additionalIncentivePerPercentage', Number(e.target.value))} style={{ width: '70px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.75rem' }}>per addl 1%</span>
              </div>
            </div>

          </div>
        </div>

        {/* Calculation Preview */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>
            🧮 PERFORMANCE CALCULATION PREVIEW
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <div><strong style={{ color: '#8b5cf6' }}>Webinar Contribution:</strong> Capped at {config.webinarMaximumCap}%</div>
            <div><strong style={{ color: 'var(--success)' }}>Calling Contribution:</strong> Capped at {config.callingMaximumCap}%</div>
            <div><strong style={{ color: '#f59e0b' }}>Revenue Contribution:</strong> {config.revenueHasCap ? 'Capped' : 'Unlimited'}</div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Overall Performance = </strong> Webinar + Calling + Revenue
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
