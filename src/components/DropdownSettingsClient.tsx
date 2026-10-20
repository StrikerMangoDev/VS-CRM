'use client'

import { useState } from 'react'
import { ArrowLeft,ChevronDown,ChevronRight,Edit2,FileText,Plus,Trash2,Eye } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addDropdownValueAction,editDropdownValueAction,deleteDropdownValueAction,addDropdownConfigurationAction } from '@/app/actions/dropdowns'
import { useConfirm } from '@/providers/ConfirmProvider'

type DropdownValue = { id: string, value: string, isActive: boolean }
type DropdownConfig = { id: string, sheetName: string, columnName: string, values: DropdownValue[] }

export default function DropdownSettingsClient({ configurations }: { configurations: DropdownConfig[] }) {
  const router = useRouter()
  const [expandedSheets, setExpandedSheets] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {}
    configurations.forEach(c => {
      initialState[c.sheetName] = true
    })
    return initialState
  })
  
  // Modals state
  const [manageConfigId, setManageConfigId] = useState<string | null>(null)
  
  // Add Config
  const [isAddingConfig, setIsAddingConfig] = useState(false)
  const [newSheetName, setNewSheetName] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  
  // Add Value
  const [isAddingValue, setIsAddingValue] = useState(false)
  const [newValueName, setNewValueName] = useState('')
  
  // Edit Value
  const [editingValueId, setEditingValueId] = useState<string | null>(null)
  const [editValueName, setEditValueName] = useState('')
  
  const toggleSheet = (sheetName: string) => {
    setExpandedSheets(prev => ({ ...prev, [sheetName]: !prev[sheetName] }))
  }

  const getSheetLink = (sheetName: string) => {
    if (sheetName === 'Leads Module') return '/'
    if (sheetName === 'Webinars Module') return '/webinars'
    if (sheetName === 'Teams Module') return '/team'
    return '#'
  }

  // Group configurations by sheetName
  const groupedConfigs = configurations.reduce((acc, config) => {
    if (!acc[config.sheetName]) acc[config.sheetName] = []
    acc[config.sheetName].push(config)
    return acc
  }, {} as Record<string, DropdownConfig[]>)

  const handleAddConfig = async () => {
    try {
      await addDropdownConfigurationAction(newSheetName, newColumnName)
      setIsAddingConfig(false)
      setNewSheetName('')
      setNewColumnName('')
      router.refresh()
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)))
    }
  }
  
  const handleAddValue = async (configId: string) => {
    try {
      await addDropdownValueAction(configId, newValueName)
      setIsAddingValue(false)
      setNewValueName('')
      router.refresh()
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)))
    }
  }
  
  const handleEditValue = async () => {
    if (!editingValueId) return
    try {
      await editDropdownValueAction(editingValueId, editValueName)
      setEditingValueId(null)
      setEditValueName('')
      router.refresh()
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)))
    }
  }
  
  const confirm = useConfirm();

  const handleDeleteValue = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Dropdown Value?',
      message: '⚠️ Are you sure you want to delete this dropdown value?',
      type: 'danger'
    });
    if (isConfirmed) {
      try {
        await deleteDropdownValueAction(id)
        router.refresh()
      } catch (err) {
        alert((err instanceof Error ? err.message : String(err)))
      }
    }
  }

  // If in 'Manage' view
  const activeConfig = configurations.find(c => c.id === manageConfigId)
  if (activeConfig) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <button onClick={() => { setManageConfigId(null); setIsAddingValue(false); setEditingValueId(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, margin: '0 0 4px 0' }}>{activeConfig.sheetName}</h2>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {activeConfig.columnName}
          </h1>
        </div>
        
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden', marginBottom: '24px' }}>
          {activeConfig.values.map((v, i) => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < activeConfig.values.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
              
              {editingValueId === v.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <input 
                    type="text" 
                    value={editValueName} 
                    onChange={e => setEditValueName(e.target.value)}
                    style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', flex: 1 }}
                  />
                  <button onClick={handleEditValue} style={{ background: '#10b981', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Save Changes</button>
                  <button onClick={() => setEditingValueId(null)} style={{ background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <span style={{ color: 'var(--text-primary)' }}>{v.value}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => { setEditingValueId(v.id); setEditValueName(v.value); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteValue(v.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {activeConfig.values.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No values found for this dropdown.</div>
          )}
        </div>
        
        {isAddingValue ? (
           <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', padding: '20px' }}>
             <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', margin: '0 0 16px 0' }}>Add Dropdown Value</h3>
             <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Value Name</label>
             <input 
               type="text" 
               value={newValueName} 
               onChange={e => setNewValueName(e.target.value)}
               placeholder="e.g. In Progress"
               style={{ width: '100%', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}
             />
             <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsAddingValue(false)} style={{ flex: 1, padding: '12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleAddValue(activeConfig.id)} style={{ flex: 1, padding: '12px', background: '#3b82f6', border: 'none', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Add Value</button>
             </div>
           </div>
        ) : (
          <button onClick={() => setIsAddingValue(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}>
            <Plus size={16} /> Add New Value
          </button>
        )}
      </div>
    )
  }

  // Main list view
  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Settings
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            ⚙️ Dropdown Settings
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage, add, edit, and delete dropdown values used across the CRM.</p>
        </div>
        <button onClick={() => setIsAddingConfig(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#3b82f6', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
          <Plus size={18} /> Add Configuration
        </button>
      </div>
      
      {isAddingConfig && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: '0 0 16px 0' }}>Create New Dropdown Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Sheet Name</label>
              <input type="text" placeholder="e.g. Social Media Sheet" value={newSheetName} onChange={e => setNewSheetName(e.target.value)} style={{ width: '100%', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Dropdown Column Name</label>
              <input type="text" placeholder="e.g. Platform Type" value={newColumnName} onChange={e => setNewColumnName(e.target.value)} style={{ width: '100%', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
             <button onClick={() => setIsAddingConfig(false)} style={{ padding: '10px 20px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
             <button onClick={handleAddConfig} style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Create</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.entries(groupedConfigs).map(([sheetName, configs]) => (
          <div key={sheetName} style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
            <div 
              onClick={() => toggleSheet(sheetName)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer', background: 'var(--table-hover)' }}
            >
              {expandedSheets[sheetName] ? <ChevronDown size={18} color='var(--text-muted)' /> : <ChevronRight size={18} color='var(--text-muted)' />}
              <FileText size={18} color="#3b82f6" />
              <span style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 500 }}>{sheetName}</span>
            </div>
            
            {expandedSheets[sheetName] && (
              <div style={{ padding: '0 20px 20px 48px' }}>
                <div style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '8px', marginTop: '12px' }}>
                  {configs.map((config, index) => (
                    <div key={config.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: index < configs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{config.columnName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{config.values.length} values</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => setManageConfigId(config.id)} style={{ padding: '6px 12px', background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                          Manage
                        </button>
                        <Link href={getSheetLink(sheetName)} title={`Go to ${sheetName}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--table-hover)', color: 'var(--text-muted)', borderRadius: '6px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text-primary)' }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                          <Eye size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
