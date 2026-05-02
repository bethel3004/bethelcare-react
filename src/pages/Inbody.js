import React, { useState } from 'react';
import { appendToSheet, updateSheet } from '../utils/sheets';

export default function Inbody({ db }) {
  const { patients, inbody, setInbody, isGuest, reloadSheets } = db;
  const [tab, setTab] = useState('compare');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState('전체');
  const [form, setForm] = useState({
    성명:'', 날짜:'', 구분:'입소 전', 점수:'', 신체나이:'',
    기초대사량:'', 체수분:'', 단백질:'', 무기질:'', 체지방:'',
    체중:'', 골격근량:'', 체지방률:'', 내장지방레벨:'', 복부비만율:'', 권고:''
  });

  // 구글 시트 컬럼명 정규화
  const getField = (r, ...keys) => {
    for (const k of keys) if (r[k] !== undefined && r[k] !== '') return r[k];
    return '';
  };
  const getName    = r => getField(r, '성명');
  const getScore   = r => getField(r, '점수', 'Before 점수', 'After 점수');
  const getAge     = r => getField(r, '신체나이', 'Before 신체나이', 'After 신체나이');
  const getScoreB  = r => getField(r, 'Before 점수', '점수');
  const getScoreA  = r => getField(r, 'After 점수', '점수');
  const getAgeB    = r => getField(r, 'Before 신체나이', '신체나이');
  const getAgeA    = r => getField(r, 'After 신체나이', '신체나이');
  const getAdvice  = r => getField(r, '권고', '권고 요약');

  const filtered = inbody.filter(r => {
    if (sel !== '전체') return getName(r) === sel;
    if (search) return (getName(r)||'').includes(search);
    return true;
  });

  // 성명 기준으로 그룹핑
  const names = [...new Set(filtered.map(r => getName(r)).filter(Boolean))];

  const f = k => ({ value: form[k], onChange: e => setForm({ ...form, [k]: e.target.value }) });

  const ITEMS = [
    ['기초대사량', '기초대사량', 'kcal', true],
    ['체수분', '체수분', 'kg', true],
    ['단백질', '단백질', 'kg', true],
    ['무기질', '무기질', 'kg', true],
    ['체지방', '체지방', 'kg', false],
    ['체중', '체중', 'kg', null],
    ['골격근량', '골격근량', 'kg', true],
    ['체지방률', '체지방률', '%', false],
    ['내장지방', '내장지방레벨', '', false],
    ['복부비만율', '복부비만율', '', false],
  ];

  const ef = k => ({ value: editForm?.[k]||'', onChange: e => setEditForm({ ...editForm, [k]: e.target.value }) });

  const handleEdit = (e) => {
    e.preventDefault();
    setInbody(inbody.map(r => (r._rowIndex && r._rowIndex === editTarget._rowIndex) || (r.ID && r.ID === editTarget.ID) || r === editTarget ? { ...editForm } : r));
    if (editForm._rowIndex) updateSheet('인바디', editForm._rowIndex, editForm);
    setEditTarget(null); setEditForm(null); setTab('compare');
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x => x.성명 === form.성명);
    const newId = String(Math.max(0, ...inbody.map(x => parseInt(x.ID) || 0)) + 1);
    const newIb = { ...form, ID: newId, 입소자ID: p?.ID || '' };
    setInbody([...inbody, newIb]);
    setTimeout(() => reloadSheets && reloadSheets(), 4000);
    appendToSheet('인바디', newIb);
    setTab('compare'); setSel(form.성명);
  };

  return (
    <div>
      <div className="page-header">
        <h1>인바디 체성분 분석</h1>
        <p>Before &amp; After 비교 분석</p>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div className="tabs">
          <button className={`tab ${tab==='compare'?'active':''}`} onClick={()=>setTab('compare')}>Before &amp; After</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>측정 기록 입력</button>}
        </div>
        {tab==='compare' && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input
              className="form-input"
              style={{width:200}}
              placeholder="🔍 이름 검색..."
              value={search}
              onChange={e=>{setSearch(e.target.value);setSel('전체');}}
            />
            {search && (
              <button className="btn btn-ghost btn-sm" onClick={()=>setSearch('')}>✕ 초기화</button>
            )}
          </div>
        )}
      </div>

      {tab === 'compare' ? (
        names.length === 0
          ? <div className="empty-state">인바디 기록이 없습니다.</div>
          : names.map(name => {
            const rows = filtered.filter(r => getName(r) === name)
              .sort((a,b) => (a?.날짜||'').localeCompare(b?.날짜||''));

            // Before/After 구분 (구글 시트는 한 행에 before/after 모두 있음)
            const firstRow = rows[0];
            const hasBothInOneRow = getScoreB(firstRow) && getScoreA(firstRow);

            let bf, af, sDiff, aDiff;

            if (hasBothInOneRow) {
              // 구글 시트 형식 (한 행에 Before/After)
              bf = { 점수: getScoreB(firstRow), 신체나이: getAgeB(firstRow) };
              af = { 점수: getScoreA(firstRow), 신체나이: getAgeA(firstRow), 권고: getAdvice(firstRow) };
            } else {
              // 앱 입력 형식 (여러 행)
              bf = rows[0];
              af = rows[rows.length - 1];
            }

            sDiff = parseInt(af.점수) - parseInt(bf.점수);
            aDiff = parseInt(af.신체나이) - parseInt(bf.신체나이);
            const hasBoth = bf.점수 && af.점수 && rows.length >= 1;

            return (
              <div key={name} className="card" style={{marginBottom:16}}>
                <div className="card-header">
                  <span className="card-title">{name}</span>
                  {hasBoth && !isNaN(sDiff) && (
                    <span className={`badge ${sDiff>=0?'badge-green':'badge-red'}`}>
                      {sDiff>=0?'▲':'▼'}{Math.abs(sDiff)}점 변화
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {hasBoth && !isNaN(sDiff) ? (
                    <>
                      {/* 점수 비교 배너 */}
                      <div style={{
                        display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr',
                        gap:16, alignItems:'center',
                        background:'linear-gradient(135deg,#F0F4F0,#F4F1EB)',
                        borderRadius:14, padding:24, marginBottom:16,
                        border:'1px solid rgba(92,122,95,0.12)'
                      }}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'0.7rem',color:'var(--text3)',fontWeight:600,letterSpacing:'0.06em',marginBottom:6}}>입소 전</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'3.5rem',fontWeight:300,color:'var(--amber)',lineHeight:1}}>{bf.점수}</div>
                          <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:4}}>점 · 신체나이 {bf.신체나이}세</div>
                        </div>
                        <div style={{fontSize:'1.2rem',color:'var(--border)',opacity:0.5}}>→</div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'0.7rem',color:'var(--text3)',fontWeight:600,letterSpacing:'0.06em',marginBottom:6}}>입소 후</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'3.5rem',fontWeight:300,color:'var(--accent)',lineHeight:1}}>{af.점수}</div>
                          <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:4}}>점 · 신체나이 {af.신체나이}세</div>
                        </div>
                        <div style={{width:1,height:60,background:'var(--border)'}}/>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'0.7rem',color:'var(--text3)',fontWeight:600,letterSpacing:'0.06em',marginBottom:6}}>변화</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'3.5rem',fontWeight:300,color:sDiff>=0?'var(--accent)':'var(--red)',lineHeight:1}}>
                            {sDiff>=0?'▲':'▼'}{Math.abs(sDiff)}
                          </div>
                          <div style={{fontSize:'0.72rem',color:aDiff<=0?'var(--accent)':'var(--red)',marginTop:4}}>
                            신체나이 {Math.abs(aDiff)}세 {aDiff<=0?'↓감소':'↑증가'}
                          </div>
                        </div>
                      </div>

                      {/* 상세 항목 (앱 입력 데이터만) */}
                      {!hasBothInOneRow && (
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                          {ITEMS.map(([label,key,unit,better]) => {
                            const bv = parseFloat(bf[key]||0);
                            const av = parseFloat(af[key]||0);
                            const diff = av - bv;
                            const col = better===null?'var(--text3)':(diff>0&&better)||(diff<0&&!better)?'var(--accent)':'var(--red)';
                            const arr = diff===0?'':(diff>0?'▲':'▼');
                            return (
                              <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:'0.8125rem'}}>
                                <span style={{color:'var(--text3)'}}>{label}</span>
                                <span>
                                  <span style={{color:'var(--text3)',marginRight:6}}>{bv.toFixed(1)}{unit} →</span>
                                  <b>{av.toFixed(1)}{unit}</b>
                                  {diff!==0&&<span style={{color:col,fontSize:'0.7rem',marginLeft:4}}>{arr}{Math.abs(diff).toFixed(1)}</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 권고사항 */}
                      {getAdvice(af) && (
                        <div style={{background:'var(--accent-bg)',borderRadius:10,padding:'12px 16px',fontSize:'0.8125rem',color:'var(--accent)',lineHeight:1.6}}>
                          <b>💡 권고사항</b><br/><span style={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{getAdvice(af)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{fontSize:'0.875rem',color:'var(--text3)',textAlign:'center',padding:'20px 0'}}>
                      Before 또는 After 데이터가 부족합니다.
                    </div>
                  )}
                </div>
                  {!isGuest && (
                    <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>{
                        const r = inbody.find(x=>getName(x)===name);
                        // 구글 시트 컬럼명 정규화
                        const normalized = {
                          ...r,
                          점수: getField(r,'점수','Before 점수','After 점수'),
                          신체나이: getField(r,'신체나이','Before 신체나이','After 신체나이'),
                          기초대사량: getField(r,'기초대사량','Before 기초대사량','After 기초대사량'),
                          체수분: getField(r,'체수분','Before 체수분','After 체수분'),
                          단백질: getField(r,'단백질','Before 단백질','After 단백질'),
                          무기질: getField(r,'무기질','Before 무기질','After 무기질'),
                          체지방: getField(r,'체지방','Before 체지방','After 체지방'),
                          체중: getField(r,'체중','Before 체중','After 체중'),
                          골격근량: getField(r,'골격근량','Before 골격근량','After 골격근량'),
                          체지방률: getField(r,'체지방률','Before 체지방률','After 체지방률'),
                          내장지방레벨: getField(r,'내장지방레벨','Before 내장지방레벨','After 내장지방레벨'),
                          복부비만율: getField(r,'복부비만율','Before 복부비만율','After 복부비만율'),
                          권고: getField(r,'권고','권고 요약'),
                          성명: getName(r),
                        };
                        setEditTarget(normalized); setEditForm(normalized); setTab('edit');
                      }}>✏️ 수정</button>
                    </div>
                  )}
              </div>
            );
          })
      ) : tab === 'edit' && editForm ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editTarget?.성명} 인바디 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('compare');}}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleEdit}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label">이름</label><input className="form-input" value={editForm.성명||''} disabled style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">측정일</label><input type="date" className="form-input" {...ef('날짜')}/></div>
              <div className="form-group"><label className="form-label">구분</label>
                <select className="form-select" {...ef('구분')}><option>입소 전</option><option>입소 후</option><option>중간 측정</option></select>
              </div>
              <div className="form-group"><label className="form-label">종합점수</label><input type="number" className="form-input" {...ef('점수')}/></div>
              <div className="form-group"><label className="form-label">신체나이</label><input type="number" className="form-input" {...ef('신체나이')}/></div>
              <div className="form-group"><label className="form-label">기초대사량 (kcal)</label><input type="number" className="form-input" {...ef('기초대사량')}/></div>
              <div className="form-group"><label className="form-label">체수분 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('체수분')}/></div>
              <div className="form-group"><label className="form-label">단백질 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('단백질')}/></div>
              <div className="form-group"><label className="form-label">무기질 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('무기질')}/></div>
              <div className="form-group"><label className="form-label">체지방 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('체지방')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('체중')}/></div>
              <div className="form-group"><label className="form-label">골격근량 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('골격근량')}/></div>
              <div className="form-group"><label className="form-label">체지방률 (%)</label><input type="number" step="0.1" className="form-input" {...ef('체지방률')}/></div>
              <div className="form-group"><label className="form-label">내장지방레벨</label><input type="number" className="form-input" {...ef('내장지방레벨')}/></div>
              <div className="form-group"><label className="form-label">복부비만율</label><input type="number" step="0.01" className="form-input" {...ef('복부비만율')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">권고사항</label><textarea className="form-textarea" rows={6} style={{minHeight:240,whiteSpace:'pre-wrap',wordBreak:'break-word'}} {...ef('권고')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('compare');}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
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
              <div className="form-group"><label className="form-label">체수분 (kg)</label><input type="number" step="0.1" className="form-input" {...f('체수분')}/></div>
              <div className="form-group"><label className="form-label">단백질 (kg)</label><input type="number" step="0.1" className="form-input" {...f('단백질')}/></div>
              <div className="form-group"><label className="form-label">무기질 (kg)</label><input type="number" step="0.1" className="form-input" {...f('무기질')}/></div>
              <div className="form-group"><label className="form-label">체지방 (kg)</label><input type="number" step="0.1" className="form-input" {...f('체지방')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input type="number" step="0.1" className="form-input" {...f('체중')}/></div>
              <div className="form-group"><label className="form-label">골격근량 (kg)</label><input type="number" step="0.1" className="form-input" {...f('골격근량')}/></div>
              <div className="form-group"><label className="form-label">체지방률 (%)</label><input type="number" step="0.1" className="form-input" {...f('체지방률')}/></div>
              <div className="form-group"><label className="form-label">내장지방레벨</label><input type="number" className="form-input" {...f('내장지방레벨')}/></div>
              <div className="form-group"><label className="form-label">복부비만율</label><input type="number" step="0.01" className="form-input" {...f('복부비만율')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">권고사항</label><textarea className="form-textarea" rows={6} style={{minHeight:240,whiteSpace:'pre-wrap',wordBreak:'break-word'}} {...f('권고')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setTab('compare')}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
