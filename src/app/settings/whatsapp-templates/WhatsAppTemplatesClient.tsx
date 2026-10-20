'use client';

import { useState,useEffect } from 'react';
import { Plus,Edit2,Trash2,X,MessageSquare,Sparkles,ShieldCheck } from 'lucide-react';
import {
getWhatsAppTemplatesAction,
createWhatsAppTemplateAction,
updateWhatsAppTemplateAction,
deleteWhatsAppTemplateAction
} from '@/app/actions/whatsappTemplate';

type Template = {
  id: string;
  name: string;
  message: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: string | Date;
};

const VARIABLE_TAGS = [
  { tag: '{name}', desc: 'Lead Name' },
  { tag: '{mobile}', desc: 'Mobile Number' },
  { tag: '{email}', desc: 'Email' },
  { tag: '{webinarId}', desc: 'Webinar ID' },
  { tag: '{state}', desc: 'State' },
  { tag: '{amount}', desc: 'Payment Amount' },
];

export default function WhatsAppTemplatesClient({
}: {
  userRole?: string;
  userDept?: string;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [, setImageUrl] = useState('');
  const [, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await getWhatsAppTemplatesAction();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      } else {
        setError(res.error || 'Failed to load templates');
      }
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || 'Error loading templates');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName('');
    setMessage('');
    setImageUrl('');
    setVideoUrl('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setMessage(t.message);
    setImageUrl(t.imageUrl || '');
    setVideoUrl(t.videoUrl || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleInsertTag = (tag: string) => {
    setMessage(prev => prev + ' ' + tag);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Please enter a template name.');
      return;
    }
    if (!message.trim()) {
      setModalError('Please enter a template message.');
    }

    setSaving(true);
    setModalError(null);

    try {
      if (editingTemplate) {
        const res = await updateWhatsAppTemplateAction(editingTemplate.id, name, message);
        if (!res.success) {
          setModalError(res.error || 'Failed to update template');
          setSaving(false);
          return;
        }
      } else {
        const res = await createWhatsAppTemplateAction(name, message);
        if (!res.success) {
          setModalError(res.error || 'Failed to create template');
          setSaving(false);
          return;
        }
      }

      setIsModalOpen(false);
      await loadTemplates();
    } catch (err) {
      setModalError((err instanceof Error ? err.message : String(err)) || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) return;
    try {
      const res = await deleteWhatsAppTemplateAction(id);
      if (res.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        alert(res.error || 'Failed to delete template');
      }
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)) || 'Error deleting template');
    }
  };

  // Preview helper
  const getPreviewText = (rawMessage: string) => {
    return rawMessage
      .replace(/\{name\}/g, 'Rahul Sharma')
      .replace(/\{mobile\}/g, '9876543210')
      .replace(/\{email\}/g, 'rahul@example.com')
      .replace(/\{webinarId\}/g, 'VST-01-0010')
      .replace(/\{state\}/g, 'Maharashtra')
      .replace(/\{amount\}/g, '₹4,999');
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>WhatsApp Message Templates</h1>
                <span style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  border: '1px solid rgba(59, 130, 246, 0.3)', 
                  color: 'var(--primary)', 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} /> Sales TL / Manager / Admin Access
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Create and manage templates with dynamic tags like <span style={{ color: 'var(--primary)' }}>{'{name}'}</span>, <span style={{ color: 'var(--primary)' }}>{'{webinarId}'}</span> for instant 1-click WhatsApp sending in Sales Department.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#22c55e',
            color: 'var(--text-primary)',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
          onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
        >
          <Plus size={18} /> New Template
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', color: 'var(--danger)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ 
          background: 'var(--table-hover)', 
          border: '1px dashed rgba(255, 255, 255, 0.15)', 
          borderRadius: '16px', 
          padding: '48px', 
          textAlign: 'center' 
        }}>
          <MessageSquare size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>No WhatsApp Templates Created Yet</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 20px 0', fontSize: '0.9rem' }}>
            Click &apos;New Template&apos; to create message templates for the Sales Department.
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              background: '#22c55e',
              color: 'var(--text-primary)',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Create First Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {templates.map(t => (
            <div 
              key={t.id}
              style={{
                background: 'var(--table-header-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      background: 'rgba(34, 197, 94, 0.15)', 
                      color: '#4ade80', 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontWeight: 700, 
                      fontSize: '0.88rem',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                      {t.name}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleOpenEdit(t)}
                      title="Edit Template"
                      style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-muted)', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#38bdf8'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      title="Delete Template"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ 
                  background: 'var(--card-bg)', 
                  border: '1px solid var(--card-border)', 
                  borderRadius: '8px', 
                  padding: '12px 14px', 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '130px',
                  overflowY: 'auto'
                }}>
                  {t.message}
                </div>
              </div>

              {/* Sample Preview */}
              <div style={{ 
                borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                paddingTop: '12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                fontSize: '0.78rem', 
                color: 'var(--text-muted)' 
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} style={{ color: 'var(--success)' }} /> Auto-replaces lead data
                </span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Active for Sales Department</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--table-header-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
              padding: '24px 28px',
              width: '90%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', padding: '8px', borderRadius: '10px' }}>
                  <MessageSquare size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingTemplate ? 'Edit WhatsApp Template' : 'New WhatsApp Template'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Template Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome Message, Payment Reminder, Offer Update..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Message Content <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click tag to insert</span>
                </div>

                {/* Variable tags chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {VARIABLE_TAGS.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      title={`Insert ${v.desc}`}
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Type your WhatsApp message here. Use {name}, {webinarId} for automatic personalization..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Live Preview Box */}
              {message.trim() && (
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.05)', 
                  border: '1px solid rgba(34, 197, 94, 0.2)', 
                  borderRadius: '8px', 
                  padding: '10px 14px' 
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} /> Live Preview (Sample Lead):
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                    {getPreviewText(message)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--card-border)',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#22c55e',
                    color: 'var(--text-primary)',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
