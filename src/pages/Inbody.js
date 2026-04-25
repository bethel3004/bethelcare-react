import React, { useState } from 'react';

export default function Inbody({ db }) {
  const { patients, inbody, setInbody } = db;
  const [tab, setTab] = useState('compare');
  const [sel, setSel] = useState('전체');
  const [form, setForm] = useState({ 성명:'', 날짜:'', 구분:'입소 전', 점수:'', 신체나이:'', 기초대사량:'', 체수분:'', 단백질:'', 무기질:'', 체지방:'', 체중:'', 골격근량:'', 체지방률:'', 내장지방레벨:'', 복부비만율:'', 권고:'' });

  const filtered = sel==='전체' ? inbody : inbody.filter(r=>r.성명===sel);
  const pids = [...new Set(filtered.map(r=>r.입소자ID))];
  const f = k => ({ value:form[k], onChange:e=>setForm({...form,[k]:e.target.value}) });

  const ITEMS = [
    ['기초대사량','기초대사량','kcal',true],['체수분','체수분','kg',true],
    ['단백질','단백질','kg',true],['무기질','무기질','kg',true],
    ['체지방','체지방','kg',false],['체중','체중','kg',null],
    ['골격근량','골격근량','kg',true],['체지방률','체지방률','%',false],
    ['내장지방','내장지방레벨','',false],['복부비만율','복부비만율','',false],
  ];

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x=>x.성명===form.성명);
    const newId = String(Math.max(0,...inbody.map(x=>parseInt(x.ID)))+1);
    setInbody([...inbody, { ...form, ID:newId, 입소자ID: p?.ID||'' }]);
    setTab('compare'); setSel(form.성명);
  };

  return (
    <div>
      <div className="page-header"><h1>인바디 체성분 분석</h1><p>Before &amp; After 비교 분석</p></div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div className="tabs">
          <button className={`tab ${tab==='compare'?'active':''}`} onClick={()=>setTab('compare')}>Before & After</button>
          <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>측정 기록 입력</button>
        </div>
        {tab==='compare' && (
          <select className="form-select" style={{width:160}} value={sel} onChange={e=>setSel(e.target.value)}>
            <option>전체</option>
            {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
          </select>
        )}
      </div>

      {tab==='compare' ? (
        pids.length === 0 ? <div className="empty-state">인바디 기록이 없습니다.</div> :
        pids.map(pid=>{
          const rows = filtered.filter(r=>r.입소자ID===pid).sort((a,b)=>a.날짜.localeCompare(b.날짜));
          const name = rows[0].성명;
          const bf = rows[0]; const af = rows[rows.length-1];
          const hasBoth = rows.length >= 2;
          const sDiff = hasBoth ? parseInt(af.점수)-parseInt(bf.점수) : 0;
          const aDiff = hasBoth ? parseInt(af.신체나이)-parseInt(bf.신체나이) : 0;
          return (
            <div key={pid} className="card" style={{marginBottom:16}}>
              <div className="card-header">
                <span className="card-title">{name}</span>
                {hasBoth && <span className={`badge ${sDiff>=0?'badge-green':'badge-red'}`}>{sDiff>=0?'▲':'▼'}{Math.abs(sDiff)}점 향상</span>}
              </div>
              <div className="card-body">
                {hasBoth && (
                  <div className="ib-compare">
                    <div className="ib-score">
                      <div style={{fontSize:'0.7rem',color:'var(--text3)',fontWeight:600,letterSpacing:'0.06em',marginBottom:6}}>입소 전</div>
                      <div className="ib-score-num" style={{color:'var(--amber)'}}>{bf.점수}</div>
                      <div className="ib-score-label">점 · 신체나이 {bf.신체나이}세</div>
                      <div style={{fontSize:'0.7rem',color:'var(--text3)',marginTop:4}}>{bf.날짜}</div>
                    </div>
                    <div className="ib-arrow">→</div>
                    <div className="ib-score">
                      <div style={{fontSize:'0.7rem',color:'var(--text3)',fontWeight:600,letterSpacing:'0.06em',marginBottom:6}}>입소 후</div>
                      <div className="ib-score-num" style={{color:'var(--accent)'}}>{af.점수}</div>
                      <div className="ib-score-label">점 · 신체나이 {af.신체나이}세</div>
                      <div style={{fontSize:'0.7rem',color:'var(--text3)',marginTop:4}}>{af.날짜}</div>
                    </div>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {ITEMS.map(([label,key,unit,better])=>{
                    const bv=parseFloat(bf[key]||0); const av=parseFloat((hasBoth?af:bf)[key]||0);
                    const diff=av-bv;
                    const col = !hasBoth||better===null?'var(--text3)':(diff>0&&better)||(diff<0&&!better)?'var(--accent)':'var(--red)';
                    const arr = !hasBoth||diff===0?'':diff>0?'▲':'▼';
                    return (
                      <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:'0.8125rem'}}>
                        <span style={{color:'var(--text3)'}}>{label}</span>
                        <span>
                          {hasBoth&&<span style={{color:'var(--text3)',marginRight:6}}>{bv.toFixed(1)}{unit} →</span>}
                          <b style={{color:'var(--text)'}}>{av.toFixed(1)}{unit}</b>
                          {hasBoth&&diff!==0&&<span style={{color:col,fontSize:'0.7rem',marginLeft:4}}>{arr}{Math.abs(diff).toFixed(1)}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {af.권고&&(
                  <div style={{marginTop:12,background:'var(--accent-bg)',borderRadius:10,padding:'12px 16px',fontSize:'0.8125rem',color:'var(--accent)',lineHeight:1.6}}>
                    <span style={{fontWeight:700}}>💡 권고사항</span><br/>{af.권고}
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="card">
          <div className="card-header"><span className="card-title">인바디 측정 기록 입력</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label required">입소자</label>
                <select className="form-select" value={form.성명} onChange={e=>setForm({...form,성명:e.target.value})}>
                  <option value="">선택</option>
                  {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">측정일</label><input type="date" className="form-input" {...f('날짜')}/></div>
              <div className="form-group"><label className="form-label">구분</label>
                <select className="form-select" {...f('구분')}><option>입소 전</option><option>입소 후</option><option>중간 측정</option></select>
              </div>
              <div className="form-group"><label className="form-label">종합점수</label><input type="number" className="form-input" placeholder="75" {...f('점수')}/></div>
              <div className="form-group"><label className="form-label">신체나이</label><input type="number" className="form-input" placeholder="70" {...f('신체나이')}/></div>
              <div className="form-group"><label className="form-label">기초대사량 (kcal)</label><input type="number" className="form-input" placeholder="1300" {...f('기초대사량')}/></div>
              <div className="form-group"><label className="form-label">체수분 (kg)</label><input type="number" step="0.1" className="form-input" placeholder="30.0" {...f('체수분')}/></div>
              <div className="form-group"><label className="form-label">단백질 (kg)</label><input type="number" step="0.1" className="form-input" placeholder="8.0" {...f('단백질')}/></div>
              <div className="form-group"><label className="form-label">무기질 (kg)</label><input type="number" step="0.1" className="form-input" placeholder="3.0" {...f('무기질')}/></div>
              <div className="form-group"><label className="form-label">체지방 (kg)</label><input type="number" step="0.1" className="form-input" placeholder="15.0" {...f('체지방')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input type="number" step="0.1" className="form-input" placeholder="60.0" {...f('체중')}/></div>
              <div className="form-group"><label className="form-label">골격근량 (kg)</label><input type="number" step="0.1" className="form-input" placeholder="25.0" {...f('골격근량')}/></div>
              <div className="form-group"><label className="form-label">체지방률 (%)</label><input type="number" step="0.1" className="form-input" placeholder="28.0" {...f('체지방률')}/></div>
              <div className="form-group"><label className="form-label">내장지방레벨</label><input type="number" className="form-input" placeholder="8" {...f('내장지방레벨')}/></div>
              <div className="form-group"><label className="form-label">복부비만율</label><input type="number" step="0.01" className="form-input" placeholder="0.85" {...f('복부비만율')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">권고사항</label><textarea className="form-textarea" {...f('권고')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setTab('compare')}>취소</button>
              <button type="submit" className="btn btn-primary">저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
