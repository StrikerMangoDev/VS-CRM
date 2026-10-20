'use client'
import { allMatchingLeads,useInfiniteLeadPage } from '@/hooks/use-lead-page';
import type { LeadPage,LeadQuery } from '@/lib/lead-query';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

import React,{ useState,useMemo } from 'react';
import { Plus,Search,Filter,Download,MoreHorizontal,X } from 'lucide-react';
import { addDynamicRecord } from '@/app/actions/portal';

function recordData(customData: string|null): Record<string,unknown> {
  try { const data:unknown=JSON.parse(customData||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:{}; }
  catch { return {}; }
}

export default function DynamicDataTable({ module, department, initialPage }: { module: import('@prisma/client').OrgModule, department: import('@prisma/client').OrgDepartment, initialPage: LeadPage }) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string,string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting,setIsExporting]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [filterColumn,setFilterColumn]=useState('');
  const [filterValue,setFilterValue]=useState('');
  const [filter,setFilter]=useState<{portalColumn?:string;portalValue?:string}>({});
  const query:LeadQuery={sheet:'PORTAL',moduleId:module.id,departmentId:department.id,search,size:50,...filter};
  const [pageData,sentinel]=useInfiniteLeadPage(initialPage,query)
  const initialRecords=pageData.rows

  // Parse columns config safely
  const columns = useMemo<{id:string;name:string;type:string;required?:boolean;options?:string[]}[]>(() => {
    try {
      if (module.columnsConfig) {
        const parsed = JSON.parse(module.columnsConfig);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Failed to parse columns config", e);
    }
    return [];
  }, [module.columnsConfig]);

  // Parse records customData safely
  const records = useMemo(() => {
    return initialRecords.map(rec => ({...rec,dynamicData:recordData(rec.customData)}));
  }, [initialRecords]);

  const exportRecords=async()=>{
    setIsExporting(true);
    try {
      const rows=await allMatchingLeads(query);
      const csv=Papa.unparse({fields:columns.map(col=>col.name),data:rows.map(row=>{const data=recordData(row.customData);return columns.map(col=>String(data[col.id]??''));})},{escapeFormulae:true});
      const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'}));
      const link=document.createElement('a');link.href=url;link.download=`${module.name.replace(/[<>:"/\\|?*]/g,'_')}.csv`;link.click();URL.revokeObjectURL(url);
    } catch { toast.error('Unable to export records'); }
    finally { setIsExporting(false); }
  };

  // Handle Form Change
  const handleInputChange = (colId: string, value:string) => {
    setFormData(prev => ({ ...prev, [colId]: value }));
  };

  // Handle Submit New Record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Map column IDs back to names for storage, or just store by ID? 
    // It's usually better to store by Column Name so it's readable, but ID is safer if names change.
    // We'll store by ID to be safe and map it back when rendering.
    const res = await addDynamicRecord(module.id, department.id, formData);
    
    setIsSubmitting(false);
    if (res.error) {
      alert("Error adding record: " + res.error);
    } else {
      setIsModalOpen(false);
      setFormData({});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0' }}>{module.name}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{department.name} • {pageData.total} Records</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={()=>void exportRecords()} disabled={isExporting||columns.length===0} aria-busy={isExporting} style={{ background: 'var(--table-hover)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} /> Add Record
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} color='var(--text-muted)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search records..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '10px 12px 10px 36px', borderRadius: '8px', outline: 'none' }}
          />
        </div>
        <div style={{position:'relative'}}>
        <button onClick={()=>setShowFilters(value=>!value)} aria-expanded={showFilters} aria-controls={`portal-filter-${module.id}`} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Filter size={16} /> Filter
        </button>
        {showFilters&&(
          <form id={`portal-filter-${module.id}`} aria-label="Filter records" onSubmit={e=>{e.preventDefault();setFilter(filterValue?{portalColumn:filterColumn||columns[0]?.id,portalValue:filterValue}:{});setShowFilters(false);}} onKeyDown={e=>{if(e.key==='Escape')setShowFilters(false);}} style={{position:'absolute',right:0,top:'calc(100% + 8px)',zIndex:20,width:'280px',padding:'16px',background:'var(--card-bg)',border:'1px solid var(--card-border)',borderRadius:'12px',display:'flex',flexDirection:'column',gap:'12px'}}>
            <label style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>Column
              <select aria-label="Filter column" value={filterColumn||columns[0]?.id||''} onChange={e=>setFilterColumn(e.target.value)} style={{width:'100%',marginTop:'6px',padding:'8px',background:'var(--card-bg)',color:'var(--text-primary)',border:'1px solid var(--card-border)',borderRadius:'8px'}}>
                {columns.map(col=><option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </label>
            <label style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>Contains
              <input aria-label="Filter value" value={filterValue} maxLength={1000} onChange={e=>setFilterValue(e.target.value)} style={{width:'100%',marginTop:'6px',padding:'8px',background:'var(--table-hover)',color:'var(--text-primary)',border:'1px solid var(--card-border)',borderRadius:'8px'}} />
            </label>
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
              <button type="button" className="btn" onClick={()=>{setFilter({});setFilterValue('');setShowFilters(false);}}>Clear</button>
              <button type="button" className="btn" onClick={()=>setShowFilters(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={columns.length===0}>Apply</button>
            </div>
          </form>
        )}
        </div>
      </div>

      {/* Data Table */}
      <div style={{ flex: 1, background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'auto' }}>
        {columns.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '16px' }}>
            <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: '#3b82f6' }}>
              <MoreHorizontal size={32} />
            </div>
            <p>No columns configured for this sheet.</p>
            <p style={{ fontSize: '0.85rem' }}>Go to Department Settings to configure your schema.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--table-hover)', borderBottom: '1px solid var(--card-border)' }}>
                {columns.map((col) => (
                  <th key={col.id} style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {col.name}
                  </th>
                ))}
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {columns.map((col) => {
                    const value = rec.dynamicData[col.id];
                    return (
                      <td key={col.id} style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {value !== undefined && value !== null ? String(value) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><MoreHorizontal size={18} /></button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No records found. Click &quot;Add Record&quot; to create one.
                  </td>
                </tr>
              )}
              <tr ref={sentinel} aria-hidden="true" style={{height:0}} />
            </tbody>
          </table>
        )}
      </div>

      {/* Dynamic Form Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem' }}>Add New Record</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {columns.map((col) => (
                  <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {col.name} {col.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    
                    {col.type === 'LONG_TEXT' ? (
                      <textarea 
                        required={col.required}
                        value={formData[col.id] || ''}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                      />
                    ) : col.type === 'DROPDOWN' ? (
                      <select
                        required={col.required}
                        value={formData[col.id] || ''}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="">Select...</option>
                        {col.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : col.type === 'NUMBER' ? (
                      <input 
                        type="number"
                        required={col.required}
                        value={formData[col.id] || ''}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', outline: 'none' }}
                      />
                    ) : col.type === 'DATE' ? (
                      <input 
                        type="date"
                        required={col.required}
                        value={formData[col.id] || ''}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', outline: 'none' }}
                      />
                    ) : (
                      <input 
                        type="text"
                        required={col.required}
                        value={formData[col.id] || ''}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', outline: 'none' }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
