'use client';

import { useState,useEffect } from 'react';
import { Plus,Edit2,Trash2,Check,X } from 'lucide-react';

type DropdownValue = {
  id: string;
  type: string;
  value: string;
  isActive: boolean;
};

export default function IssueSettingsPage() {
  const [dropdowns, setDropdowns] = useState<DropdownValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newValue, setNewValue] = useState('');
  const [addingType, setAddingType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    let active=true
    fetch('/api/issues/dropdowns').then(res=>{if(!res.ok)throw new Error('Failed to fetch dropdown values');return res.json()}).then(data=>{if(active)setDropdowns(data)}).catch(error=>{if(active)setError(error instanceof Error?error.message:String(error))}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  }, []);

  

  const handleAdd = async (type: string) => {
    if (!newValue.trim()) return;
    try {
      const res = await fetch('/api/issues/dropdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: newValue.trim() })
      });
      if (!res.ok) throw new Error('Failed to add value');
      const added = await res.json();
      setDropdowns([...dropdowns, added]);
      setNewValue('');
      setAddingType(null);
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdate = async (id: string, value: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/issues/dropdowns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value, isActive })
      });
      if (!res.ok) throw new Error('Failed to update value');
      const updated = await res.json();
      setDropdowns(dropdowns.map(d => d.id === id ? updated : d));
      setEditingId(null);
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)));
    }
  };

  const renderSection = (title: string, type: string) => {
    const items = dropdowns.filter(d => d.type === type && d.isActive);
    
    return (
      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
          <button 
            onClick={() => setAddingType(type)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontSize: '0.875rem'
            }}
          >
            <Plus size={14} /> Add Value
          </button>
        </div>

        {addingType === type && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter new value..."
              style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }}
              autoFocus
            />
            <button onClick={() => handleAdd(type)} style={{ padding: '8px 16px', background: '#3b82f6', color: 'var(--text-primary)', border: 'none', borderRadius: '6px' }}>Save</button>
            <button onClick={() => { setAddingType(null); setNewValue(''); }} style={{ padding: '8px 16px', background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px' }}>Cancel</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              {editingId === item.id ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input 
                    type="text" 
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '4px', color: 'var(--text-primary)' }}
                  />
                  <button onClick={() => handleUpdate(item.id, editValue, item.isActive)} style={{ padding: '6px', background: '#22c55e', color: 'var(--text-primary)', border: 'none', borderRadius: '4px' }}><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} style={{ padding: '6px', background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px' }}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => { setEditingId(item.id); setEditValue(item.value); }}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => { if(confirm('Are you sure you want to remove this value?')) handleUpdate(item.id, item.value, false); }}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px' }}>No active values</div>}
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Issue Dropdown Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage the configurable master values for issue dropdowns.</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

      {renderSection('Issue Types', 'ISSUE_TYPE')}
      {renderSection('Issue Statuses', 'ISSUE_STATUS')}
      {renderSection('Actual Issues', 'ACTUAL_ISSUE')}
    </div>
  );
}
