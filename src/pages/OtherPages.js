import React, { useState } from 'react';
import { appendToSheet } from '../utils/sheets';

export function Consult({ db }) {
  const { patients, consults, setConsults } = db;
  const [tab, setTab] = useState('list');
  const [sel, setSel] = useState('전체');
  const [form, setForm] = useState({ 성명:'', 날짜:'', 상담자:'', 증세:'', 변화:'', 비고:'' });
  const filtered = sel==='전체' ? consults : consults.filter(r=>r.성명===sel);
  const f = k => ({ value:form[k], onChange:e=>setForm({...form,[k]:e.target.value}) });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x=>x.성명===form.성명);
    const newId = String(Math.max(0,...consults.map(x=>parseInt(x.ID)))+1);
    const newConsult = { ...form, ID:newId, 입소자ID:p?.ID||'' };
    setConsults([...consults, newConsult]);
    appendToSheet('상담내역', newConsult);
    setTab('list');
  };

  return (
    <div>
      <div className="page-header"><h1>상담 일지</h1><p>날짜별 상담 기록 관리</p></div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>기록 조회</button>
          <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>상담 기록 입력</button>
        </div>
        {tab==='list'&&<select className="form-select" style={{width:160}} value={sel} onChange={e=>setSel(e.target.value)}>
          <option>전체</option>
          {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
        </select>}
      </div>

      {tab==='list' ? (
        filtered.length===0 ? <div className="empty-state">상담 기록이 없습니다.</div> :
        [...filtered].sort((a,b)=>b.날짜.localeCompare(a.날짜)).map(r=>(
          <div key={r.ID} className="timeline-item" style={{marginBottom:12}}>
            <div className="timeline-meta">📅 {r.날짜} · 상담자: <b>{r.상담자}</b> · <span style={{color:'var(--accent)',fontWeight:600}}>{r.성명}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:8}}>
              <div>
                <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--amber)',marginBottom:4,letterSpacing:'0.04em'}}>증 세</div>
                <div style={{fontSize:'0.8125rem',lineHeight:1.6}}>{r.증세}</div>
              </div>
              <div>
                <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--accent)',marginBottom:4,letterSpacing:'0.04em'}}>변화 / 권고</div>
                <div style={{fontSize:'0.8125rem',lineHeight:1.6}}>{r.변화}</div>
              </div>
            </div>
            {r.비고&&<div style={{marginTop:8,fontSize:'0.75rem',color:'var(--text3)',background:'var(--bg)',padding:'6px 10px',borderRadius:6}}>{r.비고}</div>}
          </div>
        ))
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
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">증세</label><textarea className="form-textarea" placeholder="현재 증세 및 호소 내용" {...f('증세')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">변화 / 권고</label><textarea className="form-textarea" placeholder="긍정적 변화, 생활 권고 사항" {...f('변화')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setTab('list')}>취소</button>
              <button type="submit" className="btn btn-primary">저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const TYPE_CFG = {
  '정기 기수':    {border:'#5C7A5F',bg:'var(--accent-bg)',text:'var(--accent)'},
  '특별 행사':    {border:'#6B1A5A',bg:'#F3E5F5',text:'#6B1A5A'},
  '단기 프로그램':{border:'#1A5A9A',bg:'var(--blue-bg)',text:'var(--blue)'},
  '개인 입소':    {border:'#C17A00',bg:'var(--amber-bg)',text:'var(--amber)'},
};

export function Groups({ db }) {
  const { patients, groups, setGroups } = db;
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ 그룹명:'', 유형:'정기 기수', 시작일:'', 종료일:'', 설명:'', 멤버IDs:'' });
  const [selected, setSelected] = useState([]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.그룹명) return alert('기수·행사명을 입력하세요.');
    const newId = String(Math.max(0,...groups.map(x=>parseInt(x.ID)))+1);
    setGroups([...groups, { ...form, ID:newId, 멤버IDs:selected.join(',') }]);
    setForm({ 그룹명:'', 유형:'정기 기수', 시작일:'', 종료일:'', 설명:'', 멤버IDs:'' });
    setSelected([]); setTab('list');
  };

  return (
    <div>
      <div className="page-header"><h1>기수·행사 관리</h1><p>프로그램 기수별 입소자 분류</p></div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>목록</button>
          <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>새 기수·행사 등록</button>
        </div>
      </div>

      {tab==='list' ? (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14,marginBottom:24}}>
            {groups.map(g=>{
              const cfg = TYPE_CFG[g.유형]||TYPE_CFG['개인 입소'];
              const ids = (g.멤버IDs||'').split(',').filter(Boolean).map(Number);
              const members = patients.filter(p=>ids.includes(parseInt(p.ID)));
              return (
                <div key={g.ID} className="card" style={{borderTop:`3px solid ${cfg.border}`}}>
                  <div className="card-body">
                    <div style={{display:'inline-block',background:cfg.bg,color:cfg.text,padding:'2px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,marginBottom:10}}>{g.유형}</div>
                    <div style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>{g.그룹명}</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text3)',marginBottom:g.설명?6:10}}>{g.시작일} ~ {g.종료일}</div>
                    {g.설명&&<div style={{fontSize:'0.8rem',color:'var(--text2)',marginBottom:10}}>{g.설명}</div>}
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{display:'flex'}}>
                        {members.slice(0,5).map((p,i)=>(
                          <div key={p.ID} style={{width:24,height:24,borderRadius:'50%',background:cfg.border,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,marginLeft:i?-6:0,border:'2px solid white',zIndex:5-i}}>{p.성명[0]}</div>
                        ))}
                      </div>
                      <span style={{fontSize:'0.8125rem',fontWeight:600,color:cfg.text}}>{members.length}명</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">전체 입소자 기수 현황</span></div>
            {patients.map(p=>{
              const myGroups = groups.filter(g=>(g.멤버IDs||'').split(',').includes(p.ID));
              return (
                <div key={p.ID} className="list-item">
                  <div className="avatar" style={{background:'#7A6552',width:32,height:32,fontSize:'0.8rem'}}>{p.성명[0]}</div>
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
      ) : (
        <div className="card">
          <div className="card-header"><span className="card-title">기수·행사 등록</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label required">기수·행사명</label><input className="form-input" placeholder="2026년 3기" value={form.그룹명} onChange={e=>setForm({...form,그룹명:e.target.value})}/></div>
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
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {patients.map(p=>(
                <label key={p.ID} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--bg)',borderRadius:8,cursor:'pointer',border:`1.5px solid ${selected.includes(p.ID)?'var(--accent)':'transparent'}`,transition:'all 0.15s'}}>
                  <input type="checkbox" checked={selected.includes(p.ID)} onChange={e=>{
                    setSelected(e.target.checked ? [...selected,p.ID] : selected.filter(x=>x!==p.ID));
                  }} style={{accentColor:'var(--accent)'}}/>
                  <span style={{fontSize:'0.875rem',fontWeight:500}}>{p.성명}</span>
                  <span style={{fontSize:'0.75rem',color:'var(--text3)'}}>{p.나이}세</span>
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setTab('list')}>취소</button>
              <button type="submit" className="btn btn-primary">등록하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function Stats({ db }) {
  const { patients, bp, inbody } = db;
  const keywords = ['고혈압','당뇨','암','대사증후군','고지혈','협착','골다공','불면','갑상선','통풍','간염','뇌경색','부정맥'];
  const diseaseCount = keywords.map(k=>({ name:k, count:patients.filter(p=>p.병명.includes(k)).length })).filter(d=>d.count>0).sort((a,b)=>b.count-a.count);
  const maxCount = Math.max(1,...diseaseCount.map(d=>d.count));

  const warnColors = { '암':'var(--red)', '고혈압':'var(--amber)', '당뇨':'var(--amber)' };

  const ibChanges = [];
  const pids = [...new Set(inbody.map(r=>r.입소자ID))];
  pids.forEach(pid=>{
    const rows = inbody.filter(r=>r.입소자ID===pid).sort((a,b)=>a.날짜.localeCompare(b.날짜));
    if(rows.length>=2){
      const diff=parseInt(rows[rows.length-1].점수)-parseInt(rows[0].점수);
      ibChanges.push({ name:rows[0].성명, before:parseInt(rows[0].점수), after:parseInt(rows[rows.length-1].점수), diff });
    }
  });

  const bpDist = [
    { label:'정상 (<140)', count:bp.filter(r=>parseInt(r.혈압수축기)<140).length, color:'var(--accent)' },
    { label:'높음 (140~159)', count:bp.filter(r=>parseInt(r.혈압수축기)>=140&&parseInt(r.혈압수축기)<160).length, color:'var(--amber)' },
    { label:'매우높음 (160+)', count:bp.filter(r=>parseInt(r.혈압수축기)>=160).length, color:'var(--red)' },
  ];
  const maxBp = Math.max(1,...bpDist.map(d=>d.count));

  const genderCount = { 남:patients.filter(p=>p.성별==='남').length, 여:patients.filter(p=>p.성별==='여').length };

  return (
    <div>
      <div className="page-header"><h1>통계·보고서</h1><p>입소자 건강 현황 종합 분석</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div className="card-header"><span className="card-title">질환별 현황</span></div>
          <div className="card-body">
            {diseaseCount.map(d=>(
              <div key={d.name} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
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
            <div className="card-body" style={{display:'flex',gap:16,justifyContent:'center',padding:'20px'}}>
              {Object.entries(genderCount).map(([g,c])=>(
                <div key={g} style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Instrument Serif',serif",fontSize:'2.5rem',color:g==='남'?'var(--blue)':'var(--accent)',lineHeight:1}}>{c}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text3)',marginTop:4}}>{g}성 {Math.round(c/patients.length*100)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">혈압 분포</span></div>
            <div className="card-body">
              {bpDist.map(d=>(
                <div key={d.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:'0.75rem',color:'var(--text3)',width:110,flexShrink:0}}>{d.label}</span>
                  <div style={{flex:1,height:8,background:'var(--bg2)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{width:`${d.count/maxBp*100}%`,height:'100%',background:d.color,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:'0.875rem',fontWeight:700,color:d.color,width:20,textAlign:'right'}}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ibChanges.length>0&&(
        <div className="card">
          <div className="card-header"><span className="card-title">인바디 점수 Before → After</span></div>
          <div className="card-body">
            {ibChanges.map((r,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--bg)',borderRadius:10,marginBottom:8}}>
                <span style={{fontWeight:700,fontSize:'0.9rem'}}>{r.name}</span>
                <div style={{display:'flex',alignItems:'center',gap:10,fontSize:'0.9rem'}}>
                  <span style={{color:'var(--text3)'}}>{r.before}점</span>
                  <span style={{color:'var(--border)'}}>→</span>
                  <span style={{fontFamily:"'Instrument Serif',serif",fontSize:'1.3rem',fontWeight:400,color:r.diff>=0?'var(--accent)':'var(--red)'}}>{r.after}점</span>
                  <span style={{fontSize:'0.8rem',color:r.diff>=0?'var(--accent)':'var(--red)',fontWeight:600}}>
                    {r.diff>=0?'▲':'▼'}{Math.abs(r.diff)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
