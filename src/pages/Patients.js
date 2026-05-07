// 전화번호 포맷: 010-1234-5678
function formatPhone(v) {
  if (!v) return '';
  const d = String(v).replace(/\D/g, '');
  const n = d.startsWith('0') ? d : '0' + d;
  if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6)}`;
  return n;
}

import React, { useState, useEffect, useCallback } from 'react';
import { getHashParams, pushHashParams } from '../utils/urlParams';
import { appendToSheet, updateSheet, deleteFromSheet } from '../utils/sheets';

const AVATAR_COLORS = ['#7A6552','#5C7A6A','#7A5C6A','#6A7A5C','#5C6A7A','#7A7052'];

// 유효한 입소기간만 반환
// 조건: YYYY-MM-DD ~ YYYY-MM-DD 형식 + 연도 2020 이상 + 일(day)이 00이 아님
function validAdmissions(str) {
  if (!str) return [];
  return str.split('\n').map(s => s.trim()).filter(s => {
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return false;
    const [, y1,,d1, y2,,d2] = m;
    if (parseInt(y1) < 2020 || parseInt(y2) < 2020) return false; // 생년월일 등 오래된 날짜 제외
    if (d1 === '00' || d2 === '00') return false; // 잘못된 날짜 제외
    return true;
  });
}

// 입소기간 달력 입력 컴포넌트 (전체 수정 가능)
// initialRows: 기존 입소기간 배열(수정 가능), onChange: 전체 기간 배열 콜백
function AdmissionPicker({ initialRows, onChange }) {
  const [rows, setRows] = React.useState(
    initialRows && initialRows.length > 0 ? initialRows : [{ start:'', end:'' }]
  );
  // initialRows가 바뀌면(수정 탭 진입 시) 동기화
  React.useEffect(() => {
    const r = initialRows && initialRows.length > 0 ? initialRows : [{ start:'', end:'' }];
    setRows(r);
  }, [JSON.stringify(initialRows)]);

  const update = (r) => { setRows(r); onChange(r); };

  return (
    <div>
      {rows.map((a, i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <input type="date" className="form-input" value={a.start}
            onChange={e=>{const n=[...rows];n[i]={...n[i],start:e.target.value};update(n);}}/>
          <span style={{color:'var(--text3)',flexShrink:0,fontWeight:500}}>~</span>
          <input type="date" className="form-input" value={a.end}
            onChange={e=>{const n=[...rows];n[i]={...n[i],end:e.target.value};update(n);}}/>
          <button type="button" className="btn btn-danger btn-sm" style={{flexShrink:0}}
            onClick={()=>update(rows.filter((_,j)=>j!==i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:2}}
        onClick={()=>update([...rows,{start:'',end:''}])}>
        + 기간 추가
      </button>
    </div>
  );
}

export default function Patients({ db }) {
  const { patients, setPatients, isGuest, reloadSheets } = db;
  const initState = () => {
    const p = getHashParams();
    return { search: p.search||'', statusFilter: p.status||'전체', campFilter: p.camp||'전체', tab: p.tab||'list', selected: p.patient||null };
  };
  const [urlState, setUrlState] = useState(initState);
  const { search, statusFilter, campFilter, tab, selected } = urlState;

  const updateState = useCallback((next) => {
    setUrlState(prev => {
      const merged = { ...prev, ...next };
      pushHashParams('patients', { search: merged.search, status: merged.statusFilter, camp: merged.campFilter, patient: merged.selected||'', tab: merged.tab });
      return merged;
    });
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (!window.location.hash.startsWith('#patients')) return;
      const p = getHashParams();
      setUrlState({ search: p.search||'', statusFilter: p.status||'전체', campFilter: p.camp||'전체', tab: p.tab||'list', selected: p.patient||null });
      setEditTarget(null); setEditForm(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [admissions, setAdmissions] = useState([{ start: '', end: '' }]);
  const [form, setForm] = useState({
    캠프장소:'', 성명:'', 생년월일:'', 나이:'', 성별:'여', 종교:'', 신장:'', 현재체중:'', 비고:'',
    혈압_입소시:'', 혈당_입소시:'', 주소:'', 본인연락처:'',
    보호자이름:'', 보호자연락처:'', 보호자관계:'',
    병명:'', 치료경력:'', 입소기간:'', 상담자:'', 상태:'입소중'
  });

  const filtered = patients.filter(p => {
    if (statusFilter === '입소중' && p.상태 !== '입소중') return false;
    if (statusFilter === '퇴소' && p.상태 !== '퇴소') return false;
    if (campFilter !== '전체' && p.캠프장소 !== campFilter) return false;
    if (search && !p.성명?.includes(search) && !p.병명?.includes(search)) return false;
    return true;
  });

  // 신장/체중 컬럼명 정규화
  // 입소기간 문자열 → 배열로 파싱
  const parseAdmissions = (str) => {
    if (!str) return [{ start: '', end: '' }];
    const lines = str.split(/\n/).map(s => s.trim()).filter(Boolean);
    const results = [];
    for (const line of lines) {
      // 반드시 두 날짜(YYYY-MM-DD)가 ~ 로 이어진 범위만 인정
      const m = line.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
      if (!m) continue;
      const [, start, end] = m;
      // 일(day)이 00인 잘못된 날짜 필터링 (예: 2026-01-00)
      if (start.endsWith('-00') || end.endsWith('-00')) continue;
      results.push({ start, end });
    }
    return results.length > 0 ? results : [{ start: '', end: '' }];
  };

  // 배열 → 입소기간 문자열로 변환
  const formatAdmissions = (arr) =>
    arr.filter(a => a.start || a.end)
       .map(a => `${a.start} ~ ${a.end}`)
       .join('\n');

  const getVal = (p, ...keys) => {
    for (const k of keys) if (p[k] && p[k] !== 'undefined') return p[k];
    return '';
  };
  const getTreatment = p => getVal(p, '치료경력', '치료경력(요약)', '치료 경력');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명 || !form.병명) return alert('성명과 병명은 필수입니다.');
    const newId = String(Math.max(0, ...patients.map(p => parseInt(p.ID)||0)) + 1);
    const 입소기간 = Array.isArray(form.입소기간)
      ? form.입소기간.filter(a=>a.start||a.end).map(a=>`${a.start} ~ ${a.end}`).join('\n')
      : form.입소기간;
    const newPatient = { ...form, ID: newId, 입소기간 };
    setPatients([...patients, newPatient]);
    appendToSheet('입소자', newPatient);
    setForm({ 캠프장소:'', 성명:'', 생년월일:'', 나이:'', 성별:'여', 종교:'', 신장:'', 현재체중:'', 비고:'',
      혈압_입소시:'', 혈당_입소시:'', 주소:'', 본인연락처:'',
      보호자이름:'', 보호자연락처:'', 보호자관계:'',
      병명:'', 치료경력:'', 입소기간:'', 상담자:'', 상태:'입소중' });
    updateState({tab:'list'});
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!editForm.성명 || !editForm.병명) return alert('성명과 병명은 필수입니다.');
    // admissions가 이미 전체 기간 목록 (기존 + 수정 포함) — 그대로 저장
    const 입소기간 = admissions.filter(a=>a.start&&a.end).map(a=>`${a.start} ~ ${a.end}`).join('\n');
    const updatedForm = { ...editForm, 입소기간 };
    // ID 또는 _rowIndex 기반으로만 매칭 (객체 참조 비교 제거)
    setPatients(prev => prev.map(p => {
      if (editTarget._rowIndex && p._rowIndex && p._rowIndex === editTarget._rowIndex) return updatedForm;
      if (editTarget.ID && p.ID && p.ID === editTarget.ID) return updatedForm;
      return p;
    }));
    // 구글 시트 쓰기 (로컬 상태는 이미 반영 — reloadSheets 호출 안 함)
    if (updatedForm._rowIndex) updateSheet('입소자', updatedForm._rowIndex, updatedForm);
    setEditTarget(null); setEditForm(null); setAdmissions([{ start: '', end: '' }]); updateState({tab:'list'});
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });
  const ef = (key) => ({ value: editForm?.[key]||'', onChange: e => setEditForm({ ...editForm, [key]: e.target.value }) });

  return (
    <div>
      <div className="page-header">
        <h1>입소자 관리</h1>
        <p>입소자 등록·조회·수정</p>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:20 }}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>updateState({tab:'list'})}>목록</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>updateState({tab:'add'})}>신규 등록</button>}
          {editTarget && (
            <button className={`tab ${tab==='edit'?'active':''}`} onClick={()=>updateState({tab:'edit'})}>
              ✏️ {editTarget.성명} 수정
            </button>
          )}
        </div>
        {tab==='list' && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
              {['전체','입소중','퇴소'].map(s=>(
                <button key={s} onClick={()=>updateState({statusFilter: s})}
                  className={statusFilter===s?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'}>
                  {s}
                </button>
              ))}
              <select
                value={campFilter}
                onChange={e=>updateState({campFilter: e.target.value})}
                className="form-select"
                style={{height:32,padding:'0 8px',fontSize:'0.85rem',minWidth:100}}>
                <option value="전체">캠프장소 전체</option>
                {[...new Set(patients.map(p=>p.캠프장소).filter(Boolean))].sort().map(c=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <input className="form-input" style={{width:180}} placeholder="이름 또는 병명 검색..."
              value={search} onChange={e=>updateState({search: e.target.value})} />
          </div>
        )}
      </div>

      {/* ── 목록 탭 ── */}
      {tab === 'list' && (
        <div>
          <div style={{fontSize:'0.8rem',color:'var(--text3)',marginBottom:10}}>{filtered.length}명</div>
          {filtered.map((p, i) => (
            <div key={p.ID} className="card" style={{marginBottom:10}}>
              <div className="list-item" style={{cursor:'pointer'}} onClick={()=>setSelected(selected?.ID===p.ID?null:p)}>
                <div className="avatar" style={{background:AVATAR_COLORS[i%AVATAR_COLORS.length]}}>{p.성명?.[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'0.9rem',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{whiteSpace:'nowrap'}}>{p.성명}</span>
                    <span style={{fontSize:'0.75rem',fontWeight:400,color:'var(--text3)',whiteSpace:'nowrap'}}>{p.나이}세 {p.성별} · {p.종교}</span>
                    {p.캠프장소 && <span className="badge badge-blue">{p.캠프장소}</span>}
                    <span className={`badge ${p.상태==='입소중'?'badge-green':'badge-gray'}`}>{p.상태||'퇴소'}</span>
                  </div>
                  <div style={{fontSize:'0.8rem',color:'var(--text3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.병명}
                  </div>
                </div>
                <div style={{fontSize:'0.8rem',color:'var(--text3)'}}>
                  {validAdmissions(p.입소기간).slice(-1)[0] || ''}
                </div>
                <span style={{color:'var(--text3)',fontSize:'0.8rem'}}>{selected?.ID===p.ID?'▲':'▼'}</span>
              </div>

              {selected?.ID === p.ID && (
                <div className="card-body" style={{borderTop:'1px solid var(--border2)'}}>
                  <div style={{display:"flex",flexDirection:window.innerWidth<=767?"column":"row",gap:20,alignItems:"flex-start"}}>
                    <div style={{flex:"0 0 auto",width:window.innerWidth<=767?"100%":"38%"}}>
                      <div className="section-label">인적사항</div>
                      {[
                        ['캠프장소', p.캠프장소],
                        validAdmissions(p.입소기간).slice(-1)[0]
                          ? ['최근 입소기간', validAdmissions(p.입소기간).slice(-1)[0]]
                          : null,
                        validAdmissions(p.입소기간).length > 1
                          ? ['전체 입소이력', validAdmissions(p.입소기간).join('\n')]
                          : null,
                        ['생년월일', p.생년월일],
                        ['신장 / 체중', `${getVal(p,'신장','신장(cm)')||'-'}cm / ${getVal(p,'현재체중','현재체중(kg)')||'-'}kg`],
                        ['주소', p.주소],
                        ['연락처', formatPhone(p.본인연락처)],
                        p.보호자이름 && ['보호자', `${p.보호자이름} (${p.보호자관계||''}) ${formatPhone(p.보호자연락처)||''}`],
                        p.비고 && ['비고', p.비고],
                      ].filter(Boolean).map(([k,v]) => (
                        <div key={k} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:'1px solid var(--border2)',fontSize:'0.8125rem'}}>
                          <span style={{color:'var(--text3)',width:90,flexShrink:0,whiteSpace:'nowrap',fontSize:'0.75rem'}}>{k}</span>
                          <span style={{fontWeight:500,fontSize:'0.8rem'}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{flex:1,width:window.innerWidth<=767?"100%":"auto"}}>
                      <div className="section-label">의료사항</div>
                      <div style={{background:'var(--amber-bg)',borderRadius:10,padding:'12px 14px',marginBottom:10}}>
                        <div style={{fontSize:'0.7rem',color:'var(--amber)',fontWeight:700,marginBottom:4}}>주요 병명</div>
                        <div style={{fontSize:'0.875rem',fontWeight:600}}>{p.병명}</div>
                      </div>
                      {(getVal(p,'혈압_입소시','혈압(입소시)') || getVal(p,'혈당_입소시','혈당(입소시)')) && (
                        <div style={{display:'flex',gap:8,marginBottom:10}}>
                          {getVal(p,'혈압_입소시','혈압(입소시)') && (
                            <div style={{flex:1,background:'var(--red-bg)',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                              <div style={{fontSize:'0.65rem',color:'var(--red)',fontWeight:700}}>입소시 혈압</div>
                              <div style={{fontSize:'0.9rem',fontWeight:700,color:'var(--red)',marginTop:2}}>{getVal(p,'혈압_입소시','혈압(입소시)')}</div>
                            </div>
                          )}
                          {getVal(p,'혈당_입소시','혈당(입소시)') && (
                            <div style={{flex:1,background:'var(--amber-bg)',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                              <div style={{fontSize:'0.65rem',color:'var(--amber)',fontWeight:700}}>입소시 혈당</div>
                              <div style={{fontSize:'0.9rem',fontWeight:700,color:'var(--amber)',marginTop:2}}>{getVal(p,'혈당_입소시','혈당(입소시)')}</div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="section-label">치료 경력</div>
                      <div style={{fontSize:'0.8rem',color:'var(--text2)',lineHeight:1.6,background:'var(--bg)',borderRadius:8,padding:'10px 12px',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{(getTreatment(p)||'없음').replace(/ > /g,'\n> ')}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(p);setEditForm({...p});setAdmissions(parseAdmissions(p.입소기간));setSelected(null);updateState({tab:'edit'});}}>✏️ 수정</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>{ if(p._rowIndex) deleteFromSheet('입소자', p._rowIndex); setPatients(patients.filter(x=> x._rowIndex ? x._rowIndex !== p._rowIndex : (x.ID ? x.ID !== p.ID : x !== p))); setSelected(null); }}>🗑️ 삭제</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 수정 탭 ── */}
      {tab === 'edit' && editForm && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editTarget?.성명} 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(null);setEditForm(null);updateState({tab:'list'});}}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleEdit}>
            <div className="section-label">기본 인적사항</div>
            <div className="form-grid form-grid-3" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label">캠프장소</label><input className="form-input" placeholder="부산동래교회" {...ef('캠프장소')}/></div>
              <div className="form-group"><label className="form-label required">성명</label><input className="form-input" {...ef('성명')}/></div>
              <div className="form-group"><label className="form-label">생년월일</label><input className="form-input" {...ef('생년월일')}/></div>
              <div className="form-group"><label className="form-label">나이</label><input className="form-input" type="number" {...ef('나이')}/></div>
              <div className="form-group"><label className="form-label">성별</label>
                <select className="form-select" {...ef('성별')}><option>여</option><option>남</option></select>
              </div>
              <div className="form-group"><label className="form-label">종교</label><input className="form-input" {...ef('종교')}/></div>
              <div className="form-group"><label className="form-label">신장 (cm)</label><input className="form-input" type="number" {...ef('신장')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input className="form-input" type="number" {...ef('현재체중')}/></div>
              <div className="form-group"><label className="form-label">혈압 (입소시)</label><input className="form-input" {...ef('혈압_입소시')}/></div>
              <div className="form-group"><label className="form-label">혈당 (입소시)</label><input className="form-input" {...ef('혈당_입소시')}/></div>
            </div>
            <div className="section-label">연락처</div>
            <div className="form-grid form-grid-2" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label">주소</label><input className="form-input" {...ef('주소')}/></div>
              <div className="form-group"><label className="form-label">본인 연락처</label><input className="form-input" {...ef('본인연락처')}/></div>
              <div className="form-group"><label className="form-label">보호자 이름</label><input className="form-input" {...ef('보호자이름')}/></div>
              <div className="form-group"><label className="form-label">보호자 연락처</label><input className="form-input" {...ef('보호자연락처')}/></div>
              <div className="form-group"><label className="form-label">보호자 관계</label><input className="form-input" {...ef('보호자관계')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">비고</label><input className="form-input" placeholder="신청자/봉사자 구분 등" {...ef('비고')}/></div>
            </div>
            <div className="section-label">의료사항</div>
            <div className="form-grid form-grid-2" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label required">주요 병명</label><input className="form-input" {...ef('병명')}/></div>
              <div className="form-group"><label className="form-label">담당 상담자</label><input className="form-input" {...ef('상담자')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">치료 경력</label><textarea className="form-textarea" rows={14} style={{minHeight:320,whiteSpace:'pre-wrap',wordBreak:'break-word'}} {...ef('치료경력')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">입소기간</label><AdmissionPicker initialRows={parseAdmissions(editTarget?.입소기간||'')} onChange={setAdmissions}/></div>
              <div className="form-group"><label className="form-label">상태</label>
                <select className="form-select" {...ef('상태')}><option>입소중</option><option>퇴소</option></select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditTarget(null);setEditForm(null);updateState({tab:'list'});}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}

      {/* ── 신규 등록 탭 ── */}
      {tab === 'add' && (
        <div className="card">
          <div className="card-header"><span className="card-title">신규 입소자 등록</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="section-label">기본 인적사항</div>
            <div className="form-grid form-grid-3" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label">캠프장소</label><input className="form-input" placeholder="부산동래교회" {...f('캠프장소')}/></div>
              <div className="form-group"><label className="form-label required">성명</label><input className="form-input" placeholder="홍길동" {...f('성명')}/></div>
              <div className="form-group"><label className="form-label">생년월일</label><input className="form-input" placeholder="1950.1.1" {...f('생년월일')}/></div>
              <div className="form-group"><label className="form-label">나이</label><input className="form-input" type="number" placeholder="70" {...f('나이')}/></div>
              <div className="form-group"><label className="form-label">성별</label>
                <select className="form-select" {...f('성별')}><option>여</option><option>남</option></select>
              </div>
              <div className="form-group"><label className="form-label">종교</label><input className="form-input" placeholder="기독교" {...f('종교')}/></div>
              <div className="form-group"><label className="form-label">신장 (cm)</label><input className="form-input" type="number" placeholder="160" {...f('신장')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input className="form-input" type="number" placeholder="55" {...f('현재체중')}/></div>
              <div className="form-group"><label className="form-label">혈압 (입소시)</label><input className="form-input" placeholder="120-80" {...f('혈압_입소시')}/></div>
              <div className="form-group"><label className="form-label">혈당 (입소시)</label><input className="form-input" placeholder="100" {...f('혈당_입소시')}/></div>
            </div>
            <div className="section-label">연락처</div>
            <div className="form-grid form-grid-2" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label">주소</label><input className="form-input" placeholder="시/도 구/군 주소" {...f('주소')}/></div>
              <div className="form-group"><label className="form-label">본인 연락처</label><input className="form-input" placeholder="010-0000-0000" {...f('본인연락처')}/></div>
              <div className="form-group"><label className="form-label">보호자 이름</label><input className="form-input" {...f('보호자이름')}/></div>
              <div className="form-group"><label className="form-label">보호자 연락처</label><input className="form-input" {...f('보호자연락처')}/></div>
              <div className="form-group"><label className="form-label">보호자 관계</label><input className="form-input" placeholder="자녀" {...f('보호자관계')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">비고</label><input className="form-input" placeholder="신청자/봉사자 구분 등" {...f('비고')}/></div>
            </div>
            <div className="section-label">의료사항</div>
            <div className="form-grid form-grid-2" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label required">주요 병명</label><input className="form-input" placeholder="고혈압 / 당뇨 등" {...f('병명')}/></div>
              <div className="form-group"><label className="form-label">담당 상담자</label><input className="form-input" {...f('상담자')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">치료 경력</label><textarea className="form-textarea" rows={14} style={{minHeight:320,whiteSpace:'pre-wrap',wordBreak:'break-word'}} placeholder="수술력, 복약이력 등" {...f('치료경력')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">입소기간</label>
                <AdmissionPicker initialRows={[]} onChange={v=>setForm({...form,입소기간:v})}/>
              </div>
              <div className="form-group"><label className="form-label">상태</label>
                <select className="form-select" {...f('상태')}><option>입소중</option><option>퇴소</option></select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>updateState({tab:'list'})}>취소</button>
              <button type="submit" className="btn btn-primary">등록하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
