import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { appendToSheet, updateSheet, deleteFromSheet } from '../utils/sheets';

export default function BpSugar({ db }) {
  const { patients, bp, setBp, isGuest } = db;
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState('전체');
  const [addSearch, setAddSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [form, setForm] = useState({ 성명:'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });

  const getName = r => r.성명 || '';
  const filtered = bp.filter(r => {
    if (sel !== '전체') return getName(r) === sel;
    if (search) return (getName(r)||'').includes(search);
    return true;
  });

  // 기록 입력 탭 — 이름 검색으로 필터된 환자 목록
  const filteredPatients = addSearch
    ? patients.filter(p => p.성명.includes(addSearch))
    : patients;

  const chartData = sel !== '전체'
    ? [...filtered].sort((a,b)=>(a?.날짜||'').localeCompare(b?.날짜||'')).map(r=>({
        날짜:(r.날짜||'').slice(5),
        수축기:parseInt(r.혈압수축기)||0,
        이완기:parseInt(r.혈압이완기)||0,
        혈당:parseInt(r.혈당)||0,
      }))
    : [];

  const bpColor = v => parseInt(v)>=160?'val-danger':parseInt(v)>=140?'val-warning':'val-good';
  const bsColor = v => parseInt(v)>=126?'val-danger':parseInt(v)>=100?'val-warning':'val-good';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x=>x.성명===form.성명);
    const newId = String(Math.max(0,...bp.map(x=>parseInt(x.ID)||0))+1);
    const newBp = { ...form, ID:newId, 입소자ID:p?.ID||'' };
    setBp([...bp, newBp]);
    appendToSheet('혈당혈압', newBp);
    setForm({ 성명:'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });
    setAddSearch('');
    setTab('list');
  };

  const handleEdit = (e) => {
    e.preventDefault();
    setBp(prev => prev.map(r => {
      if (editTarget._rowIndex && r._rowIndex && r._rowIndex === editTarget._rowIndex) return { ...editForm };
      if (editTarget.ID && r.ID && r.ID === editTarget.ID) return { ...editForm };
      return r;
    }));
    if (editForm._rowIndex) updateSheet('혈당혈압', editForm._rowIndex, editForm);
    setEditTarget(null); setEditForm(null); setTab('list');
  };

  const f = k => ({ value:form[k], onChange:e=>setForm({...form,[k]:e.target.value}) });
  const ef = k => ({ value:editForm?.[k]||'', onChange:e=>setEditForm({...editForm,[k]:e.target.value}) });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{background:'white',border:'1px solid #eee',borderRadius:10,padding:'10px 14px',fontSize:12}}>
        <div style={{fontWeight:600,marginBottom:4}}>{label}</div>
        {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: {p.value}</div>)}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header"><h1>혈당·혈압 기록</h1><p>날짜별 측정 기록 및 추이 분석</p></div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>기록 조회</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>기록 입력</button>}
          {editTarget && <button className={`tab ${tab==='edit'?'active':''}`} onClick={()=>setTab('edit')}>✏️ 수정</button>}
        </div>
        {tab==='list' && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input className="form-input" style={{width:160}} placeholder="🔍 이름 검색..."
              value={search} onChange={e=>{setSearch(e.target.value);setSel('전체');}}/>
            <select className="form-select" style={{width:140}} value={sel}
              onChange={e=>{setSel(e.target.value);setSearch('');}}>
              <option value="전체">전체</option>
              {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
            </select>
            {search && <button className="btn btn-ghost btn-sm" onClick={()=>setSearch('')}>✕</button>}
          </div>
        )}

      </div>

      {/* 기록 조회 */}
      {tab==='list' && (
        <>
          {chartData.length > 1 && (
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><span className="card-title">{sel} — 혈압·혈당 추이</span></div>
              <div style={{padding:'12px 8px'}}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{top:5,right:20,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE7"/>
                    <XAxis dataKey="날짜" tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false} domain={[50,210]}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <ReferenceLine y={140} stroke="#FFCDD2" strokeDasharray="4 2"/>
                    <ReferenceLine y={126} stroke="#FFE0B2" strokeDasharray="4 2"/>
                    <Line type="monotone" dataKey="수축기" stroke="#C0392B" strokeWidth={2.5} dot={{r:4,fill:'#C0392B'}} name="수축기(mmHg)"/>
                    <Line type="monotone" dataKey="이완기" stroke="#E8A09A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="이완기(mmHg)"/>
                    <Line type="monotone" dataKey="혈당" stroke="#5C7A5F" strokeWidth={2.5} dot={{r:4,fill:'#5C7A5F'}} name="혈당(mg/dL)"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header">
              <span className="card-title">날짜별 기록</span>
              <span style={{fontSize:'0.8rem',color:'var(--text3)'}}>{filtered.length}건</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{whiteSpace:'nowrap'}}>날짜</th><th style={{whiteSpace:'nowrap'}}>이름</th><th>혈당(mg/dL)</th><th>혈압(mmHg)</th><th>비고</th><th></th></tr></thead>
                <tbody>
                  {[...filtered].sort((a,b)=>(b?.날짜||'').localeCompare(a?.날짜||'')).map((r,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600,whiteSpace:'nowrap'}}>{r.날짜}</td>
                      <td style={{whiteSpace:'nowrap'}}>{r.성명}</td>
                      <td>
                        {r.혈당 && <span className={bsColor(r.혈당)}>{r.혈당}</span>}
                        {parseInt(r.혈당)>=126 && <span className="badge badge-red" style={{fontSize:'0.65rem',marginLeft:4}}>주의</span>}
                      </td>
                      <td>
                        {r.혈압수축기 && <span className={bpColor(r.혈압수축기)}>{r.혈압수축기}/{r.혈압이완기}</span>}
                        {parseInt(r.혈압수축기)>=160 && <span className="badge badge-red" style={{fontSize:'0.65rem',marginLeft:4}}>매우높음</span>}
                        {parseInt(r.혈압수축기)>=140&&parseInt(r.혈압수축기)<160 && <span className="badge badge-amber" style={{fontSize:'0.65rem',marginLeft:4}}>높음</span>}
                      </td>
                      <td style={{color:'var(--text3)',fontSize:'0.8rem'}}>{r.비고||'-'}</td>
                      <td>{!isGuest && <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(r);setEditForm({...r});setTab('edit');}}>✏️</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 수정 폼 */}
      {tab==='edit' && editForm && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editTarget?.성명} {editTarget?.날짜} 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('list');}}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleEdit}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label">이름</label><input className="form-input" value={editForm.성명||''} disabled style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">날짜</label><input type="date" className="form-input" {...ef('날짜')}/></div>
              <div className="form-group"><label className="form-label">혈당 (mg/dL)</label><input type="number" className="form-input" {...ef('혈당')}/></div>
              <div className="form-group"><label className="form-label">혈압 수축기</label><input type="number" className="form-input" {...ef('혈압수축기')}/></div>
              <div className="form-group"><label className="form-label">혈압 이완기</label><input type="number" className="form-input" {...ef('혈압이완기')}/></div>
              <div className="form-group"><label className="form-label">비고</label><input className="form-input" {...ef('비고')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('list');}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}

      {/* 신규 입력 폼 */}
      {tab==='add' && (
        <div className="card">
          <div className="card-header"><span className="card-title">혈당·혈압 기록 입력</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label required">입소자</label>
                <input className="form-input" placeholder="🔍 이름 검색..." style={{marginBottom:6}}
                  value={addSearch} onChange={e=>{setAddSearch(e.target.value);setForm({...form,성명:''});}}/>
                <select className="form-select" value={form.성명}
                  onChange={e=>setForm({...form,성명:e.target.value})}>
                  <option value="">선택</option>
                  {(addSearch ? patients.filter(p=>p.성명.includes(addSearch)) : patients).map(p=><option key={p.ID}>{p.성명}</option>)}
                </select>
                {form.성명 && <div style={{marginTop:4,fontSize:'0.8rem',color:'var(--accent)',fontWeight:600}}>✓ {form.성명} 선택됨</div>}
              </div>
              <div className="form-group"><label className="form-label">날짜</label><input type="date" className="form-input" {...f('날짜')}/></div>
              <div className="form-group"><label className="form-label">혈당 (mg/dL)</label><input type="number" className="form-input" placeholder="100" {...f('혈당')}/></div>
              <div className="form-group"><label className="form-label">혈압 수축기</label><input type="number" className="form-input" placeholder="120" {...f('혈압수축기')}/></div>
              <div className="form-group"><label className="form-label">혈압 이완기</label><input type="number" className="form-input" placeholder="80" {...f('혈압이완기')}/></div>
              <div className="form-group"><label className="form-label">비고</label><input className="form-input" placeholder="식전/식후, 특이사항" {...f('비고')}/></div>
            </div>
            {parseInt(form.혈압수축기)>=160&&<div className="alert alert-red" style={{marginTop:12}}>🔴 혈압 {form.혈압수축기} — 매우 높음!</div>}
            {parseInt(form.혈압수축기)>=140&&parseInt(form.혈압수축기)<160&&<div className="alert alert-amber" style={{marginTop:12}}>⚠ 혈압 {form.혈압수축기} — 높음.</div>}
            {parseInt(form.혈당)>=126&&<div className="alert alert-amber" style={{marginTop:12}}>⚠ 혈당 {form.혈당} — 주의 수치.</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setTab('list');setAddSearch('');}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
