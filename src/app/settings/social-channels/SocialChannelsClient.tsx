'use client'

import React,{ useState } from 'react';
import { createSocialMediaChannelAction,deleteSocialMediaChannelAction } from '@/app/actions/socialMediaChannel';
import toast from 'react-hot-toast';
import { Plus,Trash2,Globe,MonitorPlay,Activity } from 'lucide-react';
import { useConfirm } from '@/providers/ConfirmProvider';

export default function SocialChannelsClient({ initialChannels }: { initialChannels: import('@prisma/client').SocialMediaChannel[] }) {
  const [channels, setChannels] = useState(initialChannels);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [platforms, setPlatforms] = useState('YouTube');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const confirm = useConfirm();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !platforms.trim()) {
      toast.error('Name and Platforms are required.');
      return;
    }

    setIsSubmitting(true);
    const res = await createSocialMediaChannelAction({ name, platforms, purpose });
    if (res.error) {
      toast.error(res.error);
    } else if (res.channel) {
      toast.success('Channel created successfully');
      setChannels(prev => [...prev, res.channel]);
      setIsModalOpen(false);
      setName('');
      setPlatforms('YouTube');
      setPurpose('');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, channelName: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Channel?',
      message: `Are you sure you want to delete "${channelName}"? This might break existing data links.`,
      type: 'danger'
    });
    if (!isConfirmed) return;

    setChannels(prev => prev.filter(c => c.id !== id));
    const res = await deleteSocialMediaChannelAction(id);
    if (res.error) {
      toast.error(res.error);
      // rollback
      window.location.reload();
    } else {
      toast.success('Channel deleted');
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>Social Media Channels</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage the dynamic channels available across the CRM.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Channel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {channels.map(channel => (
          <div key={channel.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <MonitorPlay size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{channel.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>/{channel.slug}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(channel.id, channel.name)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                <Trash2 size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                <strong>Platforms:</strong> {channel.platforms}
              </div>
              {channel.purpose && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Activity size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                  <div><strong>Purpose:</strong> {channel.purpose}</div>
                </div>
              )}
            </div>
          </div>
        ))}
        {channels.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px' }}>No custom channels created yet.</div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem' }}>Add New Channel</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Channel Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. VS Shorts" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Platforms</label>
                <select value={platforms} onChange={e => setPlatforms(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
                  <option value="YouTube">YouTube</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Insta FB and YT (ALL)">Insta FB and YT (ALL)</option>
                  <option value="Insta FB">Insta FB</option>
                  <option value="Insta YT">Insta YT</option>
                  <option value="YT FB">YT FB</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter / X">Twitter / X</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Purpose (Optional)</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="What is this channel for?" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{isSubmitting ? 'Adding...' : 'Add Channel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
