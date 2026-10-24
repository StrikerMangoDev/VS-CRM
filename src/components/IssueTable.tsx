'use client';
import BodyPortal from '@/components/BodyPortal'

import { useState,useEffect,useCallback } from 'react';
import { Plus,X,UserCheck,Edit2,PhoneCall,PhoneOff } from 'lucide-react';
import { initiateIssueCallAction,checkCallStatusAction,saveCallLogAction } from '@/app/actions/call';

type Issue = {
  id: string;
  issueId: string;
  name: string;
  emailId: string | null;
  mobileNumber: string;
  issueType: { id?: string; value: string };
  issueStatus: { id?: string; value: string } | null;
  actualIssue: { id?: string; value: string } | null;
  remark: string | null;
  creator: { name: string, department: string };
  leadOwner: { name: string } | null;
  leadOwnerId: string | null;
  status: string;
};

export default function IssueTable({ isTechnicalQueue = false, userRole, userId }: { isTechnicalQueue?: boolean, userRole: string, userId: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [issueTypes, setIssueTypes] = useState<import('@prisma/client').IssueDropdownValue[]>([]);

  // Calling state
  const [activeCallIssue, setActiveCallIssue] = useState<Issue | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatusMessage, setCallStatusMessage] = useState('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [, setHasCallBeenLive] = useState(false);
  const [callRefId, setCallRefId] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallConnected]);

  useEffect(() => {
    if (!isCallConnected || callDuration === 0) return;
    
    if (callDuration % 5 === 0) {
      checkCallStatusAction().then(status => {
        if (status.active) {
          setHasCallBeenLive(true);
        } else {
          setHasCallBeenLive(currentHasLive => {
            if (currentHasLive || callDuration > 15) {
              setIsCallConnected(false);
              setCallStatusMessage('Call Disconnected');
              if (activeCallIssue && callRefId) {
                saveCallLogAction({
                  leadId: activeCallIssue.id,
                  refId: callRefId,
                  duration: callDuration
                }).catch(() => {});
              }
            }
            return currentHasLive;
          });
        }
      }).catch(() => {});
    }
  }, [callDuration, isCallConnected, activeCallIssue, callRefId]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Add form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newIssueTypeId, setNewIssueTypeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editStatusId, setEditStatusId] = useState('');
  const [editActualIssueId, setEditActualIssueId] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editQueueStatus, setEditQueueStatus] = useState('OPEN');
  const [statuses, setStatuses] = useState<import('@prisma/client').IssueDropdownValue[]>([]);
  const [actualIssues, setActualIssues] = useState<import('@prisma/client').IssueDropdownValue[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [activeTab, setActiveTab] = useState<'OPEN'|'CLOSED'>('OPEN');

  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedIssueIds);
      paginatedIssues.forEach(i => newSelected.add(i.id));
      setSelectedIssueIds(newSelected);
    } else {
      const newSelected = new Set(selectedIssueIds);
      paginatedIssues.forEach(i => newSelected.delete(i.id));
      setSelectedIssueIds(newSelected);
    }
  };

  const handleSelectIssue = (id: string) => {
    const newSelected = new Set(selectedIssueIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIssueIds(newSelected);
  };

  const paginatedIssues = issues.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(issues.length / pageSize);

  const loadIssues=useCallback(()=>fetch('/api/issues?status='+activeTab).then(res=>res.json()).then(data=>{
    if(Array.isArray(data))setIssues(data);else{console.error('Failed to fetch issues:',data.error||data);setIssues([])}
  }).catch(error=>{console.error(error);setIssues([])}).finally(()=>setLoading(false)),[activeTab])
  function fetchIssueTypes(){return fetch('/api/issues/dropdowns?type=ISSUE_TYPE').then(res=>res.json()).then(setIssueTypes).catch(console.error)}
  function fetchStatuses(){return fetch('/api/issues/dropdowns?type=ISSUE_STATUS').then(res=>res.json()).then(setStatuses).catch(console.error)}
  function fetchActualIssues(){return fetch('/api/issues/dropdowns?type=ACTUAL_ISSUE').then(res=>res.json()).then(setActualIssues).catch(console.error)}

  const fetchIssues=()=>{setLoading(true);return loadIssues()}
  const changeActiveTab=(tab:'OPEN'|'CLOSED')=>{setLoading(true);setActiveTab(tab)}
  useEffect(()=>{void loadIssues()},[loadIssues])
  useEffect(()=>{
    if(!isTechnicalQueue)void fetchIssueTypes()
    if(userRole==='ADMIN'||isTechnicalQueue){void fetchStatuses();void fetchActualIssues()}
  },[isTechnicalQueue,userRole])

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          emailId: newEmail,
          mobileNumber: newMobile,
          issueTypeId: newIssueTypeId
        })
      });
      if (!res.ok) throw new Error('Failed to create issue');
      
      await fetchIssues(); // refresh list
      setShowAddModal(false);
      
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewMobile('');
      setNewIssueTypeId('');
    } catch (err) {
      alert(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeIssue = async (id: string) => {
    try {
      const res = await fetch(`/api/issues/${id}/take`, { method: 'PUT' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to take issue');
      }
      await fetchIssues();
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddDropdownValue = async (type: string, setter: (val: string) => void) => {
    const newValue = prompt(`Enter new value for ${type.replace('_', ' ')}:`);
    if (!newValue || !newValue.trim()) return;

    try {
      const res = await fetch('/api/issues/dropdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: newValue.trim() })
      });
      if (!res.ok) throw new Error('Failed to add value');
      const data = await res.json();
      
      if (type === 'ISSUE_TYPE') setIssueTypes(prev => [...prev, data]);
      if (type === 'ISSUE_STATUS') setStatuses(prev => [...prev, data]);
      if (type === 'ACTUAL_ISSUE') setActualIssues(prev => [...prev, data]);
      
      setter(data.id);
    } catch {
      alert('Failed to add dropdown value');
    }
  };

  const handleUpdateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIssue) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingIssue.id,
          issueStatusId: editStatusId || undefined,
          actualIssueId: editActualIssueId || undefined,
          remark: editRemark || undefined,
          status: editQueueStatus
        })
      });
      if (!res.ok) throw new Error('Failed to update issue');
      
      await fetchIssues();
      setShowEditModal(false);
    } catch (err) {
      alert(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (issue: Issue) => {
    setEditingIssue(issue);
    setEditStatusId(issue.issueStatus?.id || '');
    setEditActualIssueId(issue.actualIssue?.id || '');
    setEditRemark(issue.remark || '');
    setEditQueueStatus(issue.status || 'OPEN');
    setShowEditModal(true);
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading issues...</div>;

  return (
    <div className="glass-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
          {isTechnicalQueue ? 'Technical Issue Queue' : 'Issue Table'}
        </h2>
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--card-border)' }}>
          <button
            onClick={() => changeActiveTab('OPEN')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'OPEN' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'OPEN' ? '#3b82f6' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: activeTab === 'OPEN' ? 600 : 400
            }}
          >
            Open Issues
          </button>
          <button
            onClick={() => changeActiveTab('CLOSED')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'CLOSED' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'CLOSED' ? '#3b82f6' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: activeTab === 'CLOSED' ? 600 : 400
            }}
          >
            Closed Issues
          </button>
        </div>
        {!isTechnicalQueue && (
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: '#3b82f6', color: 'var(--text-primary)',
              border: 'none', borderRadius: '8px', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Issue
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '8px', overflowX: 'auto' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" onChange={handleSelectAll} checked={paginatedIssues.length > 0 && paginatedIssues.every(i => selectedIssueIds.has(i.id))} style={{ cursor: 'pointer' }} />
              </th>
              <th>Issue ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Issue Type</th>
              <th>Issue Status</th>
              <th>Queue Status</th>
              <th>Lead Owner (Tech)</th>
              <th>Actual Issue</th>
              <th>Remark</th>
              {isTechnicalQueue && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedIssues.map(issue => (
              <tr key={issue.id}>
                <td>
                  <input type="checkbox" checked={selectedIssueIds.has(issue.id)} onChange={() => handleSelectIssue(issue.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ color: '#3b82f6', fontWeight: 600 }}>{issue.issueId}</td>
                <td style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={issue.name}>{issue.name}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{issue.mobileNumber}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCallIssue(issue);
                        setIsCalling(true);
                        setCallDuration(0);
                        setIsCallConnected(false);
                        setHasCallBeenLive(false);
                        setCallStatusMessage('Initiating call...');
                        initiateIssueCallAction(issue.id).then(res => {
                          if (res.error) setCallStatusMessage(res.error);
                          else { 
                            if (res.ref_id) setCallRefId(res.ref_id);
                            setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
                            setIsCallConnected(true);
                          }
                        }).catch(() => setCallStatusMessage('Failed to initiate call.'));
                      }}
                      style={{ 
                        padding: '4px 6px', 
                        background: 'rgba(34, 197, 94, 0.1)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(34, 197, 94, 0.2)', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }} 
                      title="Call"
                    >
                      <PhoneCall size={14} />
                    </button>
                  </div>
                </td>
                <td>{issue.emailId || '-'}</td>
                <td><span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}>{issue.issueType.value}</span></td>
                <td>
                  {issue.issueStatus ? (
                    <span className="badge" style={{ background: 'rgba(234,179,8,0.1)', color: '#fde047' }}>{issue.issueStatus.value}</span>
                  ) : '-'}
                </td>
                <td>
                  <span className="badge" style={{ background: issue.status === 'CLOSED' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: issue.status === 'CLOSED' ? '#4ade80' : '#93c5fd' }}>
                    {issue.status}
                  </span>
                </td>
                <td>
                  {issue.leadOwner ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a7f3d0' }}>
                      <UserCheck size={14} /> {issue.leadOwner.name}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)' }}>Unassigned</span>
                  )}
                </td>
                <td>{issue.actualIssue?.value || '-'}</td>
                <td>{issue.remark || '-'}</td>
                
                <td>
                  {(userRole === 'ADMIN' || (isTechnicalQueue && issue.leadOwnerId === userId)) ? (
                    <button 
                      onClick={() => openEditModal(issue)}
                      style={{ padding: '6px 12px', background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '8px' }}
                    >
                      Update
                    </button>
                  ) : null}
                  {isTechnicalQueue && !issue.leadOwnerId && (
                    <button 
                      onClick={() => handleTakeIssue(issue.id)}
                      style={{ padding: '6px 12px', background: '#22c55e', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Take Issue
                    </button>
                  )}
                  {isTechnicalQueue && issue.leadOwnerId && issue.leadOwnerId !== userId && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Assigned</span>
                  )}
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No issues found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {[15, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, issues.length)} of {issues.length} entries
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.2)',
                  color: currentPage === 1 ? 'var(--text-muted)' : '#60a5fa',
                  border: '1px solid ' + (currentPage === 1 ? 'transparent' : 'rgba(59, 130, 246, 0.3)'),
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.2)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : '#60a5fa',
                  border: '1px solid ' + (currentPage === totalPages ? 'transparent' : 'rgba(59, 130, 246, 0.3)'),
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>Add New Issue</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddIssue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Name <span style={{color: 'var(--danger)'}}>*</span></label>
                <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Mobile Number <span style={{color: 'var(--danger)'}}>*</span></label>
                <input required type="text" value={newMobile} onChange={e => setNewMobile(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Email ID</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>
                  <span>Issue Type <span style={{color: 'var(--danger)'}}>*</span></span>
                  <button type="button" onClick={() => handleAddDropdownValue('ISSUE_TYPE', setNewIssueTypeId)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }} title="Add new Issue Type"><Edit2 size={14} /></button>
                </label>
                <select required value={newIssueTypeId} onChange={e => setNewIssueTypeId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                  <option value="">Select Issue Type</option>
                  {issueTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.value}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 16px', background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', background: '#3b82f6', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  {submitting ? 'Saving...' : 'Save Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingIssue && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>Update Issue</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateIssue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>
                  <span>Issue Status</span>
                  <button type="button" onClick={() => handleAddDropdownValue('ISSUE_STATUS', setEditStatusId)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }} title="Add new Status"><Edit2 size={14} /></button>
                </label>
                <select value={editStatusId} onChange={e => setEditStatusId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                  <option value="">Select Status</option>
                  {statuses.map(t => (
                    <option key={t.id} value={t.id}>{t.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>
                  <span>Actual Issue</span>
                  <button type="button" onClick={() => handleAddDropdownValue('ACTUAL_ISSUE', setEditActualIssueId)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }} title="Add new Actual Issue"><Edit2 size={14} /></button>
                </label>
                <select value={editActualIssueId} onChange={e => setEditActualIssueId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                  <option value="">Select Actual Issue</option>
                  {actualIssues.map(t => (
                    <option key={t.id} value={t.id}>{t.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Remark</label>
                <textarea value={editRemark} onChange={e => setEditRemark(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Queue Status</label>
                <select value={editQueueStatus} onChange={e => setEditQueueStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 16px', background: 'var(--table-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', background: '#3b82f6', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  {submitting ? 'Updating...' : 'Update Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeCallIssue && (
        <BodyPortal><div style={{
          position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '400px',
            textAlign: 'center', position: 'relative' as const,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {isCalling ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--success)',
                  animation: 'pulse 2s infinite'
                }}>
                  <PhoneCall size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
                  Calling {activeCallIssue.name || activeCallIssue.mobileNumber}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                  {activeCallIssue.mobileNumber}
                </p>
                <div style={{ marginTop: '8px', color: callStatusMessage.includes('Error') || callStatusMessage.includes('Failed') ? '#ef4444' : '#60a5fa', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {callStatusMessage}
                </div>
                {isCallConnected && (
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '16px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDuration(callDuration)}
                  </div>
                )}
                <button 
                  onClick={() => {
                    setActiveCallIssue(null)
                    setIsCalling(false)
                    setIsCallConnected(false)
                    setCallDuration(0)
                  }}
                  style={{
                    marginTop: '24px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <PhoneOff size={18} />
                  End Call / Close
                </button>
                <style>{`
                  @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                  }
                `}</style>
              </div>
            ) : null}
          </div>
        </div></BodyPortal>
      )}
    </div>
  );
}
