'use client'
import type { PublicUser } from '@/lib/public-user'


import { useState } from 'react'
import { createTeamMemberAction,toggleUserStatusAction,deleteUserAction,transferLeadsAction,editTeamMemberAction } from '@/app/actions/team'
import { UserPlus,X,User as UserIcon,Mail,Briefcase,Building,Folder,Info,Edit2,Trash2,Power,ArrowRightLeft } from 'lucide-react'
import { useConfirm } from '@/providers/ConfirmProvider'

export default function TeamTable({ users, currentUserId, orgDepartments = [] }: { users: PublicUser[], currentUserId: string, dropdowns?: Record<string, string[]>, orgDepartments?: import('@prisma/client').Prisma.OrgDepartmentGetPayload<{include:{teams:true}}> [] }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<PublicUser | null>(null)
  const [transferUser, setTransferUser] = useState<PublicUser | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const confirm = useConfirm()

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const isConfirmed = await confirm({
      title: currentStatus ? 'Deactivate User?' : 'Activate User?',
      message: `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`,
      type: 'warning'
    })
    if (isConfirmed) {
      await toggleUserStatusAction(userId, currentStatus)
    }
  }

  const handleDelete = async (userId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete User?',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      type: 'danger'
    })
    if (isConfirmed) {
      const result = await deleteUserAction(userId)
      if (result?.error) {
        alert(result.error)
      }
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Team Management</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">+ Add Member</button>
      </div>

      <div className="table-container glass-panel">
        <table>
          <thead>
            <tr>
              <th>USER INFO</th>
              <th>ROLE</th>
              <th>DEPARTMENT</th>
              <th>Sub-Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.5 }}>
                <td style={{ color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600 }}>{user.name} {user.id === currentUserId && '(You)'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.email}</span>
                    {user.employeeId && (
                      <span style={{ color: 'var(--primary)', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '2px' }}>
                        ID: {user.employeeId}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{user.role}</td>
                <td style={{ color: 'var(--text-muted)' }}>{user.mainDepartment}</td>
                <td style={{ color: 'var(--text-muted)' }}>{user.department}</td>
                <td>
                  <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => {
                        setEditUser(user)
                        setSelectedRole(user.role)
                        setSelectedDepartment(user.mainDepartment)
                      }} 
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    {user.id !== currentUserId && (
                      <>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.isActive)} 
                          style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'var(--table-hover)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={14} />
                        </button>
                        <button 
                          onClick={() => setTransferUser(user)} 
                          style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Transfer Leads"
                        >
                          <ArrowRightLeft size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)} 
                          style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={{ ...modalContentStyle, padding: '32px', position: 'relative', maxWidth: '600px' }}>
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={24} color='var(--text-primary)' />
              </div>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Add New Team Member</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>Create a new team member account and assign roles</p>
              </div>
            </div>

            <form action={async (formData) => {
              const res = await createTeamMemberAction(formData)
              if (res?.error) alert(res.error)
              else setIsAddModalOpen(false)
            }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input name="name" type="text" placeholder="Enter full name" required style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Emp ID</label>
                  <div style={{ position: 'relative' }}>
                    <input name="employeeId" type="text" placeholder="e.g. EMP-001" style={{ ...inputStyle, paddingLeft: '14px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input name="email" type="email" placeholder="Enter email" required style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <input name="mobileNumber" type="text" placeholder="Enter mobile number" style={{ ...inputStyle, paddingLeft: '14px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input name="password" type="password" placeholder="Set password (optional)" style={{ ...inputStyle, paddingLeft: '14px' }} />
                  </div>
                </div>
                <div></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Role <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select name="role" required style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none' }} onChange={(e) => setSelectedRole(e.target.value)} defaultValue="">
                      <option value="" disabled>Select a role</option>
                      <option value="EXEC">Executive</option>
                      <option value="TL">Team Leader (TL)</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                {selectedRole === 'ADMIN' ? (
                  <>
                    <input type="hidden" name="mainDepartment" value="ALL" />
                    <input type="hidden" name="department" value="ALL" />
                    <div>
                      <label style={labelStyle}>Access Level</label>
                      <div style={{ ...inputStyle, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        Full Admin Access (All Departments)
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={labelStyle}>Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <Building size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <select name="mainDepartment" required style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none' }} onChange={(e) => setSelectedDepartment(e.target.value)} defaultValue="">
                        <option value="" disabled>Select department</option>
                        {orgDepartments?.map(dept => (
                          <option key={dept.name} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRole === 'MANAGER' && (
                <input type="hidden" name="department" value="ALL" />
              )}

              {selectedRole !== 'ADMIN' && selectedRole !== 'MANAGER' && (
                <div>
                  <label style={labelStyle}>Sub-Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Folder size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select name="department" required style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none' }} defaultValue="">
                      <option value="" disabled>Select sub-department</option>
                      {selectedRole === 'TL' && <option value="ALL">All Sub-Departments</option>}
                      {(() => {
                        const dept = orgDepartments?.find(d => d.name === selectedDepartment);
                        if (!dept || !dept.teams || dept.teams.length === 0) {
                          return <option disabled>No teams configured for this department</option>;
                        }
                        return dept.teams.map((team) => (
                          <option key={team.name} value={team.name}>{team.name}</option>
                        ));
                      })()}
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '8px' }}>
                <Info size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Note:</span> You can set a password now, or the user can use the &quot;Forgot Password&quot; flow via their email.
                </p>
              </div>

              <div style={{ ...modalActionRowStyle, marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '10px 24px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                  <UserPlus size={18} />
                  Create Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editUser && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={{ ...modalContentStyle, padding: '32px', position: 'relative', maxWidth: '600px' }}>
            <button 
              type="button" 
              onClick={() => { setEditUser(null); setSelectedRole(''); setSelectedDepartment(''); }} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: '#a855f7', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={24} color='var(--text-primary)' />
              </div>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Edit Team Member</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>Update member details and roles</p>
              </div>
            </div>

            <form action={async (formData) => {
              const res = await editTeamMemberAction(formData)
              if (res?.error) alert(res.error)
              else { setEditUser(null); setSelectedRole(''); setSelectedDepartment(''); }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <input type="hidden" name="id" value={editUser.id} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input name="name" type="text" placeholder="Enter full name" defaultValue={editUser.name} required style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Emp ID</label>
                  <div style={{ position: 'relative' }}>
                    <input name="employeeId" type="text" placeholder="e.g. EMP-001" defaultValue={editUser.employeeId || ''} style={{ ...inputStyle, paddingLeft: '14px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input name="email" type="email" placeholder="Enter email" defaultValue={editUser.email} required style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <input name="mobileNumber" type="text" placeholder="Enter mobile number" defaultValue={editUser.mobileNumber || ''} style={{ ...inputStyle, paddingLeft: '14px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Reset Password (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <input name="password" type="password" placeholder="Leave blank to keep current" style={{ ...inputStyle, paddingLeft: '14px' }} />
                  </div>
                </div>
                <div></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Role <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select name="role" required style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none' }} onChange={(e) => setSelectedRole(e.target.value)} defaultValue={editUser.role}>
                      <option value="" disabled>Select a role</option>
                      <option value="EXEC">Executive</option>
                      <option value="TL">Team Leader (TL)</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                {selectedRole === 'ADMIN' ? (
                  <>
                    <input type="hidden" name="mainDepartment" value="ALL" />
                    <input type="hidden" name="department" value="ALL" />
                    <div>
                      <label style={labelStyle}>Access Level</label>
                      <div style={{ ...inputStyle, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        Full Admin Access (All Departments)
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={labelStyle}>Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <Building size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <select name="mainDepartment" required style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none' }} onChange={(e) => setSelectedDepartment(e.target.value)} defaultValue={editUser.mainDepartment}>
                        <option value="" disabled>Select department</option>
                        {orgDepartments?.map(dept => (
                          <option key={dept.name} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRole === 'MANAGER' && (
                <input type="hidden" name="department" value="ALL" />
              )}

              {selectedRole !== 'ADMIN' && selectedRole !== 'MANAGER' && (
                <div>
                  <label style={labelStyle}>Sub-Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Folder size={18} color='var(--text-muted)' style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select name="department" required style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none' }} defaultValue={editUser.department}>
                      <option value="" disabled>Select sub-department</option>
                      {selectedRole === 'TL' && <option value="ALL">All Sub-Departments</option>}
                      {(() => {
                        const dept = orgDepartments?.find(d => d.name === selectedDepartment);
                        if (!dept || !dept.teams || dept.teams.length === 0) {
                          return <option disabled>No teams configured for this department</option>;
                        }
                        return dept.teams.map((team) => (
                          <option key={team.name} value={team.name}>{team.name}</option>
                        ));
                      })()}
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ ...modalActionRowStyle, marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                <button type="button" onClick={() => { setEditUser(null); setSelectedRole(''); setSelectedDepartment(''); }} className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '10px 24px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                  <Briefcase size={18} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Leads Modal */}
      {transferUser && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalHeaderStyle}>Transfer Leads From: {transferUser.name}</h2>
            <form action={async (formData) => {
              const res = await transferLeadsAction(formData)
              if (res?.error) alert(res.error)
              else setTransferUser(null)
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="hidden" name="fromUserId" value={transferUser.id} />
              <div>
                <label style={labelStyle}>Select New Owner</label>
                <select name="toUserId" required style={inputStyle}>
                  <option value="">-- Select Executive --</option>
                  {users.filter(u => u.id !== transferUser.id && u.role === 'EXEC').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                  ))}
                </select>
              </div>
              <div style={modalActionRowStyle}>
                <button type="button" onClick={() => setTransferUser(null)} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Transfer All Leads</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)',
  background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
}
const labelStyle = { display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }
const modalOverlayStyle = { position: 'fixed' as const, inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }
const modalContentStyle = { width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' as const }
const modalHeaderStyle = { color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }
const modalActionRowStyle = { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }
