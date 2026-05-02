import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { appendToSheet, updateSheet, deleteFromSheet } from '../utils/sheets';

// ══ 상담일지 ══
export function Consult({ db }) {
  const { patients, consults, setConsults, isGuest, reloadSheets } = db;
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState('전체');
  const [form, setForm] = useState({ 성명:'', 날짜:'', 상담자:'', 증세:'', 변화:'', 비고:'' });

  const filtered = consults.filter(r => {
    const name = r.성명||'';
    if (sel !== '전체') return name === sel;
    if (search) return name.includes(search) || (r.증세||'').includes(search) || (r.변화||'').includes(search);
    return true;
  });

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const f = k => ({ value:form[k], onChange:e=>setForm({...form,[k]:e.target.value}) });
  const ef = k => ({ value:editForm?.[k]||'', onChange:e=>setEditForm({...editForm,[k]:e.target.value}) });

  const handleEditConsult = (e) => {
    e.preventDefault();
    setConsults(consults.map(r => (r._rowIndex && r._rowIndex === editTarget._rowIndex) || (r.ID && r.ID === editTarget.ID) || r === editTarget ? { ...editForm } : r));
    if (editForm._rowIndex) updateSheet('상담내역', editForm._rowIndex, editForm);
    setEditTarget(null); setEditForm(null); setTab('list');
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x=>x.성명===form.성명);
    const newId = String(Math.max(0,...consults.map(x=>parseInt(x.ID)||0))+1);
    const newConsult = { ...form, ID:newId, 입소자ID:p?.ID||'' };
    setConsults([...consults, newConsult]);
    appendToSheet('상담내역', newConsult);
    setTab('list');
  };

  return (
    <div>
      <div className="page-header"><h1>상담 일지</h1><p>날짜별 상담 기록 관리</p></div>
      <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:20}}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>기록 조회</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>상담 기록 입력</button>}
          {editTarget && <button className={`tab ${tab==='edit'?'active':''}`} onClick={()=>setTab('edit')}>✏️ 수정</button>}
        </div>
        {tab==='list' && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input className="form-input" style={{width:180}} placeholder="🔍 이름·내용 검색..."
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

      {tab==='list' ? (
        filtered.length===0
          ? <div className="empty-state">상담 기록이 없습니다.</div>
          : <>
            <div style={{fontSize:'0.8rem',color:'var(--text3)',marginBottom:10}}>{filtered.length}건</div>
            {[...filtered].sort((a,b)=>(b?.날짜||'').localeCompare(a?.날짜||'')).map((r,i)=>(
              <div key={i} className="timeline-item" style={{marginBottom:12}}>
                <div className="timeline-meta">
                  📅 <b>{r.날짜}</b> · 상담자: <b>{r.상담자}</b> ·
                  <span style={{color:'var(--accent)',fontWeight:600,marginLeft:4}}>{r.성명}</span>
                </div>
                {(r.증세||r.변화) && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:8}}>
                    {r.증세 && <div>
                      <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--amber)',marginBottom:4,letterSpacing:'0.04em'}}>증 세</div>
                      <div style={{fontSize:'0.8125rem',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{r.증세}</div>
                    </div>}
                    {r.변화 && <div>
                      <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--accent)',marginBottom:4,letterSpacing:'0.04em'}}>변화 / 권고</div>
                      <div style={{fontSize:'0.8125rem',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{r.변화}</div>
                    </div>}
                  </div>
                )}
                {r.비고 && <div style={{marginTop:8,fontSize:'0.75rem',color:'var(--text3)',background:'var(--bg)',padding:'6px 10px',borderRadius:6}}>{r.비고}</div>}
                {!isGuest && <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(r);setEditForm({...r});setTab('edit');}}>✏️ 수정</button></div>}
              </div>
            ))}
          </>
      ) : tab === 'edit' && editForm ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editTarget?.성명} 상담 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('list');}}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleEditConsult}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label">입소자</label><input className="form-input" value={editForm.성명||''} disabled style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">상담일</label><input type="date" className="form-input" {...ef('날짜')}/></div>
              <div className="form-group"><label className="form-label">상담자</label><input className="form-input" {...ef('상담자')}/></div>
              <div className="form-group"><label className="form-label">비고</label><input className="form-input" {...ef('비고')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">증세</label><textarea className="form-textarea" rows={8} style={{minHeight:200,whiteSpace:'pre-wrap',wordBreak:'break-word'}} {...ef('증세')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">변화 / 권고</label><textarea className="form-textarea" rows={8} style={{minHeight:200,whiteSpace:'pre-wrap',wordBreak:'break-word'}} {...ef('변화')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('list');}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><span className="card-title">상담 기록 입력</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label required">입소자</label>
                <select className="form-select" value={form.성명} onChange={e=>setForm({...form,성명:e.target.value})}>
                  <option value="">선택</option>
                  {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">상담일</label><input type="date" className="form-input" {...f('날짜')}/></div>
              <div className="form-group"><label className="form-label">상담자</label><input className="form-input" {...f('상담자')}/></div>
              <div className="form-group"><label className="form-label">비고</label><input className="form-input" {...f('비고')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">증세</label><textarea className="form-textarea" rows={8} style={{minHeight:200,whiteSpace:'pre-wrap',wordBreak:'break-word'}} placeholder="현재 증세 및 호소 내용" {...f('증세')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">변화 / 권고</label><textarea className="form-textarea" rows={8} style={{minHeight:200,whiteSpace:'pre-wrap',wordBreak:'break-word'}} placeholder="긍정적 변화, 생활 권고 사항" {...f('변화')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setTab('list')}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ══ 기수·행사 ══
const TYPE_CFG = {
  '정기 기수':    {border:'#5C7A5F',bg:'var(--accent-bg)',text:'var(--accent)'},
  '특별 행사':    {border:'#6B1A5A',bg:'#F3E5F5',text:'#6B1A5A'},
  '단기 프로그램':{border:'#1A5A9A',bg:'var(--blue-bg)',text:'var(--blue)'},
  '개인 입소':    {border:'#C17A00',bg:'var(--amber-bg)',text:'var(--amber)'},
};

export function Groups({ db }) {
  const { patients, groups, setGroups, isGuest, reloadSheets } = db;
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ 그룹명:'', 유형:'정기 기수', 시작일:'', 종료일:'', 설명:'' });
  const [selected, setSelected] = useState([]);
  const [editGroup, setEditGroup] = useState(null);
  const [editSelected, setEditSelected] = useState([]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.그룹명) return alert('기수·행사명을 입력하세요.');
    const newId = String(Math.max(0,...groups.map(x=>parseInt(x.ID)||0))+1);
    const newGroup = { ...form, ID:newId, 멤버IDs: selected.join(',') };
    setGroups([...groups, newGroup]);
    appendToSheet('기수행사', newGroup);
    setTimeout(() => reloadSheets && reloadSheets(), 4000);
    setForm({ 그룹명:'', 유형:'정기 기수', 시작일:'', 종료일:'', 설명:'' });
    setSelected([]);
    setTab('list');
  };

  const handleEditGroup = (e) => {
    e.preventDefault();
    if (!editGroup.그룹명) return alert('기수·행사명을 입력하세요.');
    const updatedGroup = { ...editGroup, 멤버IDs: editSelected.join(',') };
    setGroups(groups.map(g => (g._rowIndex && g._rowIndex === editGroup._rowIndex) || (g.ID && g.ID === editGroup.ID) || g === editGroup ? updatedGroup : g));
    if (updatedGroup._rowIndex) updateSheet('기수행사', updatedGroup._rowIndex, updatedGroup);
    setEditGroup(null); setEditSelected([]); setTab('list');
  };

  const getMembers = (g) => {
    const ids = (g.멤버IDs||'').split(',').map(x=>x.trim()).filter(Boolean);
    return patients.filter(p => ids.includes(p.성명));
  };

  const CheckboxGrid = ({ selState, setSel }) => (
    <>
      <div style={{marginBottom:10}}>
        <span style={{fontSize:'0.875rem',color:'var(--text3)'}}>{selState.length}명 선택됨</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
        {patients.map(p => {
          const isChecked = selState.includes(p.성명);
          return (
            <label key={p.성명} style={{
              display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
              background:'var(--bg)',borderRadius:8,cursor:'pointer',
              border:`1.5px solid ${isChecked?'var(--accent)':'transparent'}`,
              transition:'all 0.15s'
            }}>
              <input type="checkbox" checked={isChecked} onChange={e=>{
                setSel(e.target.checked
                  ? [...selState, p.성명]
                  : selState.filter(x=>x!==p.성명)
                );
              }} style={{accentColor:'var(--accent)'}}/>
              <span style={{fontSize:'0.875rem',fontWeight:500}}>{p.성명}</span>
              <span style={{fontSize:'0.72rem',color:'var(--text3)'}}>{p.나이}세</span>
            </label>
          );
        })}
      </div>
    </>
  );

  return (
    <div>
      <div className="page-header"><h1>기수·행사 관리</h1><p>프로그램 기수별 입소자 분류</p></div>
      <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:20}}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>목록</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>{setSelected([]);setTab('add');}}>새 기수·행사 등록</button>}
          {editGroup && <button className={`tab ${tab==='editGroup'?'active':''}`} onClick={()=>setTab('editGroup')}>✏️ {editGroup.그룹명} 수정</button>}
        </div>
      </div>

      {tab==='list' ? (
        <>
          {groups.length === 0 ? (
            <div className="empty-state">등록된 기수·행사가 없습니다.</div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:24}}>
              {groups.map(g=>{
                const cfg = TYPE_CFG[g.유형]||TYPE_CFG['개인 입소'];
                const members = getMembers(g);
                return (
                  <div key={g.ID} className="card" style={{borderTop:`3px solid ${cfg.border}`}}>
                    <div className="card-body">
                      <div style={{display:'inline-block',background:cfg.bg,color:cfg.text,padding:'2px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,marginBottom:10}}>{g.유형}</div>
                      <div style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>{g.그룹명}</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text3)',marginBottom:g.설명?6:10}}>{g.시작일} ~ {g.종료일}</div>
                      {g.설명&&<div style={{fontSize:'0.8rem',color:'var(--text2)',marginBottom:10}}>{g.설명}</div>}
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <div style={{display:'flex'}}>
                          {members.slice(0,6).map((p,i)=>(
                            <div key={p.성명} style={{width:26,height:26,borderRadius:'50%',background:cfg.border,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,marginLeft:i?-6:0,border:'2px solid white'}}>{p.성명[0]}</div>
                          ))}
                        </div>
                        <span style={{fontSize:'0.8125rem',fontWeight:600,color:cfg.text}}>{members.length}명</span>
                      </div>
                      {members.length > 0 && (
                        <div style={{fontSize:'0.75rem',color:'var(--text3)',marginBottom:10,lineHeight:1.6}}>
                          {members.map(p=>p.성명).join(', ')}
                        </div>
                      )}
                      {!isGuest && <div style={{display:'flex',justifyContent:'flex-end',gap:6}}><button className="btn btn-ghost btn-sm" onClick={()=>{const ids=(g.멤버IDs||'').split(',').map(x=>x.trim()).filter(Boolean);setEditGroup({...g});setEditSelected(ids);setTab('editGroup');}}>✏️ 수정</button><button className="btn btn-danger btn-sm" onClick={()=>{ if(g._rowIndex) deleteFromSheet('기수행사', g._rowIndex); setGroups(groups.filter(x=> x._rowIndex ? x._rowIndex !== g._rowIndex : (x.ID ? x.ID !== g.ID : x !== g))); }}>삭제</button></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="card">
            <div className="card-header"><span className="card-title">전체 입소자 기수 현황</span></div>
            {patients.map(p=>{
              const myGroups = groups.filter(g=>(g.멤버IDs||'').split(',').map(x=>x.trim()).includes(p.성명));
              return (
                <div key={p.성명} className="list-item">
                  <div className="avatar" style={{background:'#5C7A5F',width:32,height:32,fontSize:'0.8rem'}}>{p.성명[0]}</div>
                  <span style={{fontWeight:600,fontSize:'0.875rem',width:70}}>{p.성명}</span>
                  <span style={{fontSize:'0.8rem',color:'var(--text3)',width:80}}>{p.나이}세 {p.성별}</span>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',flex:1}}>
                    {myGroups.length ? myGroups.map(g=>{
                      const cfg=TYPE_CFG[g.유형]||TYPE_CFG['개인 입소'];
                      return <span key={g.ID} style={{background:cfg.bg,color:cfg.text,padding:'2px 9px',borderRadius:20,fontSize:'0.7rem',fontWeight:600}}>{g.그룹명}</span>;
                    }) : <span style={{fontSize:'0.75rem',color:'var(--text3)'}}>미분류</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : tab==='editGroup' && editGroup ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editGroup.그룹명} 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditGroup(null);setEditSelected([]);setTab('list');}}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleEditGroup}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label required">기수·행사명</label>
                <input className="form-input" value={editGroup.그룹명||''} onChange={e=>setEditGroup({...editGroup,그룹명:e.target.value})}/>
              </div>
              <div className="form-group"><label className="form-label">유형</label>
                <select className="form-select" value={editGroup.유형||'정기 기수'} onChange={e=>setEditGroup({...editGroup,유형:e.target.value})}>
                  {Object.keys(TYPE_CFG).map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">시작일</label><input type="date" className="form-input" value={editGroup.시작일||''} onChange={e=>setEditGroup({...editGroup,시작일:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">종료일</label><input type="date" className="form-input" value={editGroup.종료일||''} onChange={e=>setEditGroup({...editGroup,종료일:e.target.value})}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">설명</label><input className="form-input" value={editGroup.설명||''} onChange={e=>setEditGroup({...editGroup,설명:e.target.value})}/></div>
            </div>
            <div className="section-label" style={{marginTop:16}}>소속 입소자 선택</div>
            <CheckboxGrid selState={editSelected} setSel={setEditSelected}/>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditGroup(null);setEditSelected([]);setTab('list');}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><span className="card-title">기수·행사 등록</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label required">기수·행사명</label><input className="form-input" placeholder="2026년 2기" value={form.그룹명} onChange={e=>setForm({...form,그룹명:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">유형</label>
                <select className="form-select" value={form.유형} onChange={e=>setForm({...form,유형:e.target.value})}>
                  {Object.keys(TYPE_CFG).map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">시작일</label><input type="date" className="form-input" value={form.시작일} onChange={e=>setForm({...form,시작일:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">종료일</label><input type="date" className="form-input" value={form.종료일} onChange={e=>setForm({...form,종료일:e.target.value})}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">설명</label><input className="form-input" value={form.설명} onChange={e=>setForm({...form,설명:e.target.value})}/></div>
            </div>
            <div className="section-label" style={{marginTop:16}}>소속 입소자 선택</div>
            <CheckboxGrid selState={selected} setSel={setSelected}/>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setSelected([]);setTab('list');}}>취소</button>
              <button type="submit" className="btn btn-primary">✅ 등록하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


export function Stats({ db }) {
  const { patients, bp, inbody, isGuest } = db;
  const [search, setSearch] = useState('');
  const [selPatient, setSelPatient] = useState('전체');
  const [bpSearch, setBpSearch] = useState('');

  // 질환 분포
  const keywords = ['고혈압','당뇨','암','대사증후군','고지혈','협착','골다공','불면','갑상선','통풍','간염','뇌경색','부정맥'];
  const diseaseCount = keywords.map(k=>({ name:k, count:patients.filter(p=>(p?.병명||'').includes(k)).length }))
    .filter(d=>d.count>0).sort((a,b)=>b.count-a.count);
  const maxCount = Math.max(1,...diseaseCount.map(d=>d.count));

  // 혈압 추이 (선택한 입소자)
  const bpFiltered = selPatient==='전체'
    ? []
    : [...bp.filter(r=>r.성명===selPatient)].sort((a,b)=>(a?.날짜||'').localeCompare(b?.날짜||'')).map(r=>({
        날짜:(r.날짜||'').slice(5),
        수축기:parseInt(r.혈압수축기)||0,
        이완기:parseInt(r.혈압이완기)||0,
        혈당:parseInt(r.혈당)||0,
      }));

  // 인바디 점수 변화
  const ibChanges = [];
  const pids = [...new Set(inbody.map(r=>r.성명||'').filter(Boolean))];
  pids.forEach(name=>{
    const rows = inbody.filter(r=>r.성명===name).sort((a,b)=>(a?.날짜||'').localeCompare(b?.날짜||''));
    const getScore = r => parseInt(r['점수']||r['Before 점수']||r['After 점수']||0);
    const bf = rows[0]; const af = rows[rows.length-1];
    const bfScore = getScore(bf);
    const afScore = getScore(af);
    if (rows.length>=1 && bfScore) {
      ibChanges.push({ name, before:bfScore, after:afScore||bfScore, diff:(afScore||bfScore)-bfScore });
    }
  });

  // 혈압 분포
  const bpDist = [
    { label:'정상 (<140)', count:bp.filter(r=>parseInt(r.혈압수축기)<140).length, color:'var(--accent)' },
    { label:'높음 (140~159)', count:bp.filter(r=>parseInt(r.혈압수축기)>=140&&parseInt(r.혈압수축기)<160).length, color:'var(--amber)' },
    { label:'매우높음 (160+)', count:bp.filter(r=>parseInt(r.혈압수축기)>=160).length, color:'var(--red)' },
  ];
  const maxBp = Math.max(1,...bpDist.map(d=>d.count));

  const warnColors = { '암':'var(--red)', '고혈압':'var(--amber)', '당뇨':'var(--amber)' };
  const genderCount = { 남:patients.filter(p=>p.성별==='남').length, 여:patients.filter(p=>p.성별==='여').length };

  // 검색 필터된 인바디
  const filteredIb = ibChanges.filter(r=>!search||(r.name||'').includes(search));

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
      <div className="page-header"><h1>통계·보고서</h1><p>입소자 건강 현황 종합 분석</p></div>

      {/* 기본 통계 */}
      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div className="card-header"><span className="card-title">질환별 현황</span></div>
          <div className="card-body">
            {diseaseCount.map(d=>(
              <div key={d.name} style={{display:'flex',alignItems:'center',gap:10,marginBottom:9}}>
                <span style={{fontSize:'0.8125rem',fontWeight:600,width:80,flexShrink:0}}>{d.name}</span>
                <div style={{flex:1,height:10,background:'var(--bg2)',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:`${d.count/maxCount*100}%`,height:'100%',background:warnColors[d.name]||'var(--accent)',borderRadius:5,transition:'width 0.8s ease'}}/>
                </div>
                <span style={{fontSize:'0.875rem',fontWeight:700,color:warnColors[d.name]||'var(--accent)',width:24,textAlign:'right'}}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card">
            <div className="card-header"><span className="card-title">성별 분포</span></div>
            <div className="card-body" style={{display:'flex',gap:24,justifyContent:'center',padding:'20px'}}>
              {Object.entries(genderCount).map(([g,c])=>(
                <div key={g} style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2.5rem',color:g==='남'?'var(--blue)':'var(--accent)',lineHeight:1}}>{c}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text3)',marginTop:4}}>{g}성 {patients.length?Math.round(c/patients.length*100):0}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">혈압 분포</span></div>
            <div className="card-body">
              {bpDist.map(d=>(
                <div key={d.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:'0.72rem',color:'var(--text3)',width:110,flexShrink:0}}>{d.label}</span>
                  <div style={{flex:1,height:8,background:'var(--bg2)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{width:`${d.count/maxBp*100}%`,height:'100%',background:d.color,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:'0.875rem',fontWeight:700,color:d.color,width:24,textAlign:'right'}}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 입소자별 혈압·혈당 추이 그래프 */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header">
          <span className="card-title">개인별 혈압·혈당 추이</span>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input className="form-input" style={{width:140}} placeholder="🔍 이름 검색..."
              value={bpSearch}
              onChange={e=>{
                setBpSearch(e.target.value);
                const found = patients.find(p=>p.성명===e.target.value);
                if(found) setSelPatient(found.성명);
                else if(!e.target.value) setSelPatient('전체');
              }}
              list="bp-patient-list"
            />
            <datalist id="bp-patient-list">
              {patients.filter(p=>(p.성명||'').includes(bpSearch)).map(p=>(
                <option key={p.ID} value={p.성명}/>
              ))}
            </datalist>
            <select className="form-select" style={{width:140}} value={selPatient}
              onChange={e=>{setSelPatient(e.target.value);setBpSearch(e.target.value==='전체'?'':e.target.value);}}>
              <option value="전체">전체 선택</option>
              {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
            </select>
            {selPatient!=='전체' && (
              <button className="btn btn-ghost btn-sm" onClick={()=>{setSelPatient('전체');setBpSearch('');}}>✕</button>
            )}
          </div>
        </div>
        <div style={{padding:'12px 8px'}}>
          {bpFiltered.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={bpFiltered} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE7"/>
                <XAxis dataKey="날짜" tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false} domain={[50,210]}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend/>
                <Line type="monotone" dataKey="수축기" stroke="#C0392B" strokeWidth={2.5} dot={{r:4}} name="수축기(mmHg)"/>
                <Line type="monotone" dataKey="이완기" stroke="#E8A09A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="이완기(mmHg)"/>
                <Line type="monotone" dataKey="혈당" stroke="#5C7A5F" strokeWidth={2.5} dot={{r:4}} name="혈당(mg/dL)"/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">위에서 입소자를 선택하면 혈압·혈당 추이 그래프가 표시됩니다.</div>
          )}
        </div>
      </div>

      {/* 인바디 점수 변화 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">인바디 점수 Before → After</span>
          <input className="form-input" style={{width:160}} placeholder="🔍 이름 검색..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{padding:'12px 8px'}}>
          {filteredIb.length > 0 && filteredIb.some(r=>r.before!==r.after) && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={filteredIb.filter(r=>r.before!==r.after)} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE7"/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false} domain={[60,100]}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend/>
                <Bar dataKey="before" fill="#F4B942" name="입소 전" radius={[4,4,0,0]}/>
                <Bar dataKey="after"  fill="#5C7A5F" name="입소 후" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="card-body" style={{paddingTop:12}}>
            {filteredIb.length===0
              ? <div className="empty-state">인바디 데이터가 없습니다.</div>
              : filteredIb.map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',background:'var(--bg)',borderRadius:10,marginBottom:7}}>
                  <span style={{fontWeight:700,fontSize:'0.9rem'}}>{r.name}</span>
                  <div style={{display:'flex',alignItems:'center',gap:10,fontSize:'0.9rem'}}>
                    <span style={{color:'var(--text3)'}}>{r.before}점</span>
                    <span style={{color:'var(--border)'}}>→</span>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',fontWeight:400,color:r.diff>=0?'var(--accent)':'var(--red)'}}>{r.after}점</span>
                    <span style={{fontSize:'0.8rem',color:r.diff>=0?'var(--accent)':'var(--red)',fontWeight:600}}>
                      {r.diff>0?'▲':r.diff<0?'▼':'━'}{Math.abs(r.diff)}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
