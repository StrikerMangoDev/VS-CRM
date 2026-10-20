'use client'

import { useState,useMemo } from 'react'
import Link from 'next/link'
import {
ArrowLeft,
Target,
Video,
Palette,
Share2,
Sparkles,
Save,
CheckCircle2,
AlertCircle,
ShieldCheck,
Lock,Calendar
} from 'lucide-react'
import { saveSocialMediaTargetsAction } from '@/app/actions/socialMediaTargets'

interface UserTargetItem {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  mainDepartment: string;
  team: string;
  target: {
    weeklyVideos: number;
    monthlyVideos: number;
    weeklyGraphics: number;
    monthlyGraphics: number;
    weeklyPosts: number;
    monthlyPosts: number;
    weeklyStories: number;
    monthlyStories: number;
  };
}

interface Props {
  initialUsers: UserTargetItem[];
  canEdit: boolean;
  currentUser: import('@/lib/view-types').DashboardUser | null;
}

type ActiveTab = 'EDITING' | 'GRAPHICS' | 'POSTING';

export default function SocialMediaTargetsManager({ initialUsers, canEdit }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('EDITING');
  const [targets, setTargets] = useState<Record<string, UserTargetItem['target']>>(() => {
    const map: Record<string, UserTargetItem['target']> = {};
    initialUsers.forEach(u => {
      map[u.id] = { ...u.target };
    });
    return map;
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Group users by team
  const teamUsers = useMemo(() => {
    const editing: UserTargetItem[] = [];
    const graphics: UserTargetItem[] = [];
    const posting: UserTargetItem[] = [];

    initialUsers.forEach(u => {
      const dept = (u.department || '').toLowerCase();
      const team = (u.team || '').toLowerCase();
      if (dept.includes('edit') || team.includes('edit')) {
        editing.push(u);
      } else if (dept.includes('graphic') || team.includes('graphic')) {
        graphics.push(u);
      } else if (dept.includes('post') || team.includes('post')) {
        posting.push(u);
      }
    });

    return {
      EDITING: editing,
      GRAPHICS: graphics,
      POSTING: posting
    };
  }, [initialUsers]);

  const currentTeamList = useMemo(()=>teamUsers[activeTab] || [],[teamUsers,activeTab]);

  const handleInputChange = (userId: string, field: keyof UserTargetItem['target'], value: number) => {
    if (!canEdit) return;
    const sanitizedVal = Math.max(0, isNaN(value) ? 0 : value);
    setTargets(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {
          weeklyVideos: 0,
          monthlyVideos: 0,
          weeklyGraphics: 0,
          monthlyGraphics: 0,
          weeklyPosts: 0,
          monthlyPosts: 0,
          weeklyStories: 0,
          monthlyStories: 0
        }),
        [field]: sanitizedVal
      }
    }));
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveAll = async () => {
    if (!canEdit) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const payload = initialUsers.map(u => {
      const userTarget = targets[u.id] || u.target;
      return {
        userId: u.id,
        team: u.team,
        weeklyVideos: userTarget.weeklyVideos || 0,
        monthlyVideos: userTarget.monthlyVideos || 0,
        weeklyGraphics: userTarget.weeklyGraphics || 0,
        monthlyGraphics: userTarget.monthlyGraphics || 0,
        weeklyPosts: userTarget.weeklyPosts || 0,
        monthlyPosts: userTarget.monthlyPosts || 0,
        weeklyStories: userTarget.weeklyStories || 0,
        monthlyStories: userTarget.monthlyStories || 0,
      };
    });

    try {
      const res = await saveSocialMediaTargetsAction(payload);
      if (res.error) {
        setSaveError(res.error);
      } else {
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      setSaveError((err instanceof Error ? err.message : String(err)) || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Team totals
  const currentTeamTotals = useMemo(() => {
    let weekly1 = 0;
    let monthly1 = 0;
    let weekly2 = 0;
    let monthly2 = 0;

    currentTeamList.forEach(u => {
      const t = targets[u.id];
      if (!t) return;
      if (activeTab === 'EDITING') {
        weekly1 += Number(t.weeklyVideos) || 0;
        monthly1 += Number(t.monthlyVideos) || 0;
      } else if (activeTab === 'GRAPHICS') {
        weekly1 += Number(t.weeklyGraphics) || 0;
        monthly1 += Number(t.monthlyGraphics) || 0;
      } else if (activeTab === 'POSTING') {
        weekly1 += Number(t.weeklyPosts) || 0;
        monthly1 += Number(t.monthlyPosts) || 0;
        weekly2 += Number(t.weeklyStories) || 0;
        monthly2 += Number(t.monthlyStories) || 0;
      }
    });

    return { weekly1, monthly1, weekly2, monthly2 };
  }, [currentTeamList, targets, activeTab]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* Top Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link 
          href="/settings" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--text-muted)', 
            textDecoration: 'none', 
            fontSize: '0.875rem', 
            fontWeight: 500, 
            transition: 'color 0.2s',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--table-hover)',
            border: '1px solid var(--card-border)'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={16} /> Back to Settings
        </Link>

        {/* Permission Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canEdit ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--success)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <ShieldCheck size={15} />
              <span>Admin & Manager Access (Editable)</span>
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--warning)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <Lock size={14} />
              <span>View Only (Admin & Manager can edit)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px -4px rgba(56, 189, 248, 0.4)'
          }}>
            <Target size={28} color='var(--text-primary)' />
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: 700 }}>
              Social Media Teams Target
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Set and monitor weekly and monthly targets for Team Leaders (TL) & Executives.
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '10px',
              background: hasUnsavedChanges 
                ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' 
                : 'rgba(59, 130, 246, 0.8)',
              border: hasUnsavedChanges ? '1px solid #60a5fa' : 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: hasUnsavedChanges ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
              transition: 'all 0.2s ease',
              opacity: saving ? 0.7 : 1
            }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Targets...' : hasUnsavedChanges ? 'Save Changes *' : 'Save Targets'}</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '14px 18px',
          borderRadius: '12px',
          color: 'var(--success)',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <CheckCircle2 size={18} />
          <span>Targets updated and saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '14px 18px',
          borderRadius: '12px',
          color: 'var(--danger)',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <AlertCircle size={18} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Team Tabs Navigation */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px'
      }}>
        {[
          {
            id: 'EDITING' as ActiveTab,
            title: 'Editing Team',
            desc: 'Target: Videos (Reels & Long Videos)',
            icon: Video,
            color: 'var(--primary)',
            bg: 'rgba(59, 130, 246, 0.1)',
            badge: `${teamUsers.EDITING.length} Members`
          },
          {
            id: 'GRAPHICS' as ActiveTab,
            title: 'Graphics Team',
            desc: 'Target: Graphics Quantity (Creatives / Posters)',
            icon: Palette,
            color: 'var(--primary)',
            bg: 'rgba(192, 132, 252, 0.1)',
            badge: `${teamUsers.GRAPHICS.length} Members`
          },
          {
            id: 'POSTING' as ActiveTab,
            title: 'Posting Team',
            desc: 'Target: Posts & Stories Uploads',
            icon: Share2,
            color: 'var(--success)',
            bg: 'rgba(52, 211, 153, 0.1)',
            badge: `${teamUsers.POSTING.length} Members`
          }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '18px 20px',
                borderRadius: '14px',
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isActive ? `1.5px solid ${tab.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? `0 8px 20px -6px ${tab.bg}` : 'none'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: tab.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tab.color,
                flexShrink: 0
              }}>
                <Icon size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>{tab.title}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--table-hover)',
                    color: 'var(--text-muted)'
                  }}>
                    {tab.badge}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Target Table Container */}
      <div style={{
        background: 'var(--table-header-bg)',
        borderRadius: '16px',
        border: '1px solid var(--card-border)',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
      }}>
        
        {/* Table Subheader */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--card-border)',
          background: 'rgba(0, 0, 0, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600 }}>
              {activeTab === 'EDITING' && '🎬 Editing Team Targets (Videos)'}
              {activeTab === 'GRAPHICS' && '🎨 Graphics Team Targets (Graphics Quantity)'}
              {activeTab === 'POSTING' && '📱 Posting Team Targets (Posts & Stories)'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {activeTab === 'EDITING' && 'Specify weekly and monthly video editing targets for each team member.'}
              {activeTab === 'GRAPHICS' && 'Specify weekly and monthly graphics & creative output targets for each team member.'}
              {activeTab === 'POSTING' && 'Specify weekly and monthly upload targets for both channel posts and stories.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'var(--table-hover)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '6px'
            }}>
              <span>Total Members:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentTeamList.length}</strong>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: activeTab === 'POSTING' ? '900px' : '700px' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Member Name
                </th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Role
                </th>

                {/* Specific Columns by Tab */}
                {activeTab === 'EDITING' && (
                  <>
                    <th style={{ padding: '16px 20px', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Video size={14} /> Weekly Videos Target
                      </div>
                    </th>
                    <th style={{ padding: '16px 20px', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> Monthly Videos Target
                      </div>
                    </th>
                  </>
                )}

                {activeTab === 'GRAPHICS' && (
                  <>
                    <th style={{ padding: '16px 20px', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Palette size={14} /> Weekly Graphics Target
                      </div>
                    </th>
                    <th style={{ padding: '16px 20px', color: '#e9d5ff', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> Monthly Graphics Target
                      </div>
                    </th>
                  </>
                )}

                {activeTab === 'POSTING' && (
                  <>
                    <th style={{ padding: '16px 16px', color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Share2 size={14} /> Weekly Posts Target
                      </div>
                    </th>
                    <th style={{ padding: '16px 16px', color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> Monthly Posts Target
                      </div>
                    </th>
                    <th style={{ padding: '16px 16px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> Weekly Stories Target
                      </div>
                    </th>
                    <th style={{ padding: '16px 16px', color: '#fcd34d', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> Monthly Stories Target
                      </div>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentTeamList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    No members found in this team.
                  </td>
                </tr>
              ) : (
                currentTeamList.map((user, idx) => {
                  const userTarget = targets[user.id] || user.target;
                  const isTL = user.role === 'TL';

                  return (
                    <tr 
                      key={user.id} 
                      style={{ 
                        borderBottom: '1px solid var(--card-border)',
                        background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isTL 
                              ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' 
                              : 'linear-gradient(135deg, #3b82f6 0%, #0284c7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
                              {user.name}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.4px',
                          background: isTL ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isTL ? '#c084fc' : '#60a5fa',
                          border: isTL ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          {isTL ? 'TEAM LEADER (TL)' : 'EXECUTIVE'}
                        </span>
                      </td>

                      {/* Editing Targets */}
                      {activeTab === 'EDITING' && (
                        <>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.weeklyVideos ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'weeklyVideos', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '120px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Videos</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.monthlyVideos ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'monthlyVideos', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '120px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Videos</span>
                            </div>
                          </td>
                        </>
                      )}

                      {/* Graphics Targets */}
                      {activeTab === 'GRAPHICS' && (
                        <>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.weeklyGraphics ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'weeklyGraphics', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '120px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(192, 132, 252, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Graphics</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.monthlyGraphics ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'monthlyGraphics', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '120px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(192, 132, 252, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Graphics</span>
                            </div>
                          </td>
                        </>
                      )}

                      {/* Posting Targets */}
                      {activeTab === 'POSTING' && (
                        <>
                          <td style={{ padding: '16px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.weeklyPosts ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'weeklyPosts', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '90px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Posts</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.monthlyPosts ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'monthlyPosts', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '90px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Posts</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.weeklyStories ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'weeklyStories', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '90px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Stories</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={userTarget.monthlyStories ?? 0}
                                onChange={(e) => handleInputChange(user.id, 'monthlyStories', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '90px',
                                  background: canEdit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${canEdit ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: canEdit ? 'text' : 'not-allowed'
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Stories</span>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Row */}
            {currentTeamList.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderTop: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  <td style={{ padding: '16px 20px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                    TEAM TOTAL
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {currentTeamList.length} Members
                  </td>

                  {activeTab === 'EDITING' && (
                    <>
                      <td style={{ padding: '16px 20px', color: 'var(--primary)', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.weekly1} Videos
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--primary)', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.monthly1} Videos
                      </td>
                    </>
                  )}

                  {activeTab === 'GRAPHICS' && (
                    <>
                      <td style={{ padding: '16px 20px', color: 'var(--primary)', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.weekly1} Graphics
                      </td>
                      <td style={{ padding: '16px 20px', color: '#e9d5ff', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.monthly1} Graphics
                      </td>
                    </>
                  )}

                  {activeTab === 'POSTING' && (
                    <>
                      <td style={{ padding: '16px 16px', color: 'var(--success)', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.weekly1} Posts
                      </td>
                      <td style={{ padding: '16px 16px', color: '#6ee7b7', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.monthly1} Posts
                      </td>
                      <td style={{ padding: '16px 16px', color: '#f59e0b', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.weekly2} Stories
                      </td>
                      <td style={{ padding: '16px 16px', color: '#fcd34d', fontWeight: 700, fontSize: '1.05rem' }}>
                        {currentTeamTotals.monthly2} Stories
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Sticky bottom save prompt if dirty */}
        {hasUnsavedChanges && canEdit && (
          <div style={{
            padding: '14px 24px',
            background: 'rgba(37, 99, 235, 0.15)',
            borderTop: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>You have unsaved changes in team targets.</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#3b82f6',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save All Targets'}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
