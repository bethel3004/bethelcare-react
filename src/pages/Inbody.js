import React, { useState, useEffect, useCallback } from 'react';
import { getHashParams, pushHashParams } from '../utils/urlParams';
import { appendToSheet, updateSheet } from '../utils/sheets';

// ─────────────────────────────────────────────────────────────────
// 인바디_상세 시트 컬럼 구조 (A~U):
// 캠프장소 | 성명 | 성별 | 출생연도 | 신장 | 측정일 | 구분 |
// 체중(kg) | 골격근량(kg) | 체지방량(kg) | 체수분(L) |
// 단백질(kg) | 무기질(kg) | 체지방률(%) | 내장지방레벨 |
// 내장지방면적(cm²) | 복부비만율 | 기초대사량(kcal) |
// 종합점수 | 신체연령 | 체형판정
// ─────────────────────────────────────────────────────────────────

export default function Inbody({ db }) {
  const { patients, inbody, setInbody, isGuest, reloadSheets } = db;

  const initState = () => {
    const p = getHashParams();
    return {
      tab: p.tab || 'compare',
      search: p.search || '',
      sel: p.patient || '전체',
      statusFilter: p.status || '전체',
      campFilter: p.camp || '전체',
    };
  };
  const [urlState, setUrlState] = useState(initState);
  const { tab, search, sel, statusFilter, campFilter } = urlState;
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const updateState = useCallback((next) => {
    setUrlState(prev => {
      const merged = { ...prev, ...next };
      pushHashParams('inbody', {
        tab: merged.tab, search: merged.search,
        patient: merged.sel, status: merged.statusFilter, camp: merged.campFilter,
      });
      return merged;
    });
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (!window.location.hash.startsWith('#inbody')) return;
      const p = getHashParams();
      setUrlState({ tab: p.tab || 'compare', search: p.search || '', sel: p.patient || '전체', statusFilter: p.status || '전체', campFilter: p.camp || '전체' });
      setEditTarget(null); setEditForm(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── 빈 폼 ──────────────────────────────────────────────────────
  const emptyForm = {
    캠프장소: '', 성명: '', 성별: '', 출생연도: '', 신장: '', 측정일: '', 구분: '1차',
    'body중(kg)': '', '골격근량(kg)': '', '체지방량(kg)': '', '체수분(L)': '',
    '단백질(kg)': '', '무기질(kg)': '', '체지방률(%)': '',
    내장지방레벨: '', '내장지방면적(cm²)': '', 복부비만율: '',
    '기초대사량(kcal)': '', 종합점수: '', 신체연령: '', 체형판정: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ── 헬퍼 ───────────────────────────────────────────────────────
  const g = (r, ...keys) => { for (const k of keys) if (r?.[k] !== undefined && r?.[k] !== '') return r[k]; return ''; };
  const getName  = r => g(r, '성명', '이름', '환자명');
  const getCamp  = r => g(r, '캠프장소');
  const getPhase = r => String(g(r, '구분') || '').trim();
  const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const fmt = (v, d = 1) => { const n = num(v); return n == null ? '-' : n.toFixed(d); };

  const isBefore = r => { const d = getPhase(r).toLowerCase(); return d === '1차' || d.includes('before'); };
  const isAfter  = r => { const d = getPhase(r).toLowerCase(); return d === '2차' || d.includes('after'); };

  // ── 캠프 목록 (인바디 시트 + 환자 시트 통합) ──────────────────
  const campList = ['전체', ...[...new Set([
    ...patients.map(p => p.캠프장소),
    ...inbody.map(r => getCamp(r)),
  ].filter(Boolean))].sort()];

  // ── 환자 필터 ──────────────────────────────────────────────────
  const filteredPatients = patients.filter(p => {
    if (statusFilter !== '전체' && (p.상태 || '').trim() !== statusFilter) return false;
    if (campFilter !== '전체' && (p.캠프장소 || '').trim() !== campFilter) return false;
    if (search && !(p.성명 || '').includes(search)) return false;
    return true;
  });
  const filteredPatientNames = new Set(filteredPatients.map(p => (p.성명 || '').trim()).filter(Boolean));

  // ── 인바디 기록 필터 ───────────────────────────────────────────
  const filtered = inbody.filter(r => {
    const name = (getName(r) || '').trim();
    const camp = (getCamp(r) || '').trim();
    if (sel !== '전체') return name === sel.trim();
    // 캠프 필터: 인바디 시트의 캠프장소 컬럼 직접 사용
    if (campFilter !== '전체' && camp && camp !== campFilter) return false;
    if (statusFilter === '전체' && campFilter === '전체' && !search) return true;
    if (search && !name.includes(search)) return false;
    return name ? filteredPatientNames.has(name) : false;
  });

  // ── 이름 목록 (인바디 기록 있는 사람 기준) ────────────────────
  const allInbodyNames = [...new Set(inbody.map(r => (getName(r) || '').trim()).filter(Boolean))];

  const names = sel !== '전체'
    ? [sel].filter(n => inbody.some(r => (getName(r) || '').trim() === n))
    : (() => {
        // 환자 테이블 순서 우선, 없으면 인바디 시트 순서
        const fromPatients = filteredPatients
          .map(p => (p.성명 || '').trim())
          .filter(n => n && filtered.some(r => (getName(r) || '').trim() === n));
        const fromInbody = allInbodyNames
          .filter(n => filtered.some(r => (getName(r) || '').trim() === n) && !fromPatients.includes(n));
        return [...fromPatients, ...fromInbody];
      })();

  // ── 폼 바인딩 ──────────────────────────────────────────────────
  const f  = k => ({ value: form[k] || '',     onChange: e => setForm({ ...form, [k]: e.target.value }) });
  const ef = k => ({ value: editForm?.[k] || '', onChange: e => setEditForm({ ...editForm, [k]: e.target.value }) });

  // ── 체성분 항목 ────────────────────────────────────────────────
  // [표시명, 시트컬럼키, 단위, 증가가좋음(true)/감소가좋음(false)/중립(null)]
  const ITEMS = [
    ['체중',       '체중(kg)',          'kg',   null],
    ['골격근량',   '골격근량(kg)',      'kg',   true],
    ['체지방량',   '체지방량(kg)',      'kg',   false],
    ['체수분',     '체수분(L)',         'L',    true],
    ['단백질',     '단백질(kg)',        'kg',   true],
    ['무기질',     '무기질(kg)',        'kg',   true],
    ['체지방률',   '체지방률(%)',       '%',    false],
    ['내장지방레벨','내장지방레벨',     '',     false],
    ['내장지방면적','내장지방면적(cm²)','cm²',  false],
    ['복부비만율', '복부비만율',        '',     false],
    ['기초대사량', '기초대사량(kcal)',  'kcal', true],
  ];

  // ── 점수 색상 ──────────────────────────────────────────────────
  const scoreColor = s => {
    const n = num(s);
    if (n == null) return 'var(--text3)';
    if (n >= 90) return '#1e8449';
    if (n >= 80) return '#27ae60';
    if (n >= 70) return '#e67e22';
    return '#e74c3c';
  };

  const diffColor = (diff, better) => {
    if (diff === 0 || better === null) return 'var(--text3)';
    return (diff > 0 && better) || (diff < 0 && !better) ? '#27ae60' : '#e74c3c';
  };

  // ── 저장 ───────────────────────────────────────────────────────
  const handleEdit = e => {
    e.preventDefault();
    setInbody(inbody.map(r =>
      (r._rowIndex && r._rowIndex === editTarget._rowIndex) || r === editTarget
        ? { ...editForm } : r
    ));
    if (editForm._rowIndex) updateSheet('인바디_상세', editForm._rowIndex, editForm);
    setEditTarget(null); setEditForm(null); updateState({ tab: 'compare' });
  };

  const handleAdd = e => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x => x.성명 === form.성명);
    const newId = String(Math.max(0, ...inbody.map(x => parseInt(x.ID) || 0)) + 1);
    const newIb = { ...form, ID: newId, 입소자ID: p?.ID || '' };
    setInbody([...inbody, newIb]);
    setTimeout(() => reloadSheets?.(), 1000);
    appendToSheet('인바디_상세', newIb);
    updateState({ tab: 'compare', sel: form.성명 });
  };

  // ══════════════════════════════════════════════════════════════
  return (
    <div>
      <div className="page-header">
        <h1>인바디 체성분 분석</h1>
        <p>Before &amp; After 비교 분석</p>
      </div>

      {/* 탭 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div className="tabs">
          <button className={`tab ${tab==='compare'?'active':''}`} onClick={()=>updateState({tab:'compare'})}>Before &amp; After</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>updateState({tab:'add'})}>측정 기록 입력</button>}
        </div>
      </div>

      {/* 필터 바 */}
      {tab==='compare' && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="form-input" style={{maxWidth:180}} placeholder="🔍 이름 검색..."
            value={search} onChange={e=>updateState({search:e.target.value, sel:'전체'})}/>
          {search && <button className="btn btn-ghost btn-sm" onClick={()=>updateState({search:''})}>✕</button>}
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {['전체','입소중','퇴소'].map(s=>(
              <button key={s}
                className={statusFilter===s?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'}
                onClick={()=>updateState({statusFilter:s})}>{s}</button>
            ))}
          </div>
          <select value={campFilter} onChange={e=>updateState({campFilter:e.target.value})}
            className="form-select" style={{height:32, padding:'0 8px', fontSize:'0.85rem', minWidth:130}}>
            {campList.map(c=><option key={c} value={c}>{c==='전체'?'캠프장소 전체':c}</option>)}
          </select>
        </div>
      )}

      {/* ── COMPARE 탭 ─────────────────────────────────────── */}
      {tab==='compare' ? (
        names.length===0
          ? <div className="empty-state">인바디 기록이 없습니다.</div>
          : names.map(name => {
            const rows = filtered
              .filter(r=>(getName(r)||'').trim()===name)
              .sort((a,b)=>(a.측정일||a.날짜||'').localeCompare(b.측정일||b.날짜||''));

            const bf = rows.find(isBefore) || rows[0];
            const af = rows.find(isAfter)  || (rows.length>1 ? rows[rows.length-1] : null);
            const extras = rows.filter(r=>r!==bf && r!==af);

            const bScore = num(bf?.['종합점수'] || bf?.['점수']);
            const aScore = af ? num(af['종합점수'] || af['점수']) : null;
            const bAge   = num(bf?.['신체연령']  || bf?.['신체나이']);
            const aAge   = af ? num(af['신체연령'] || af['신체나이']) : null;
            const sDiff  = bScore!=null && aScore!=null ? aScore-bScore : null;
            const aDiff  = bAge!=null   && aAge!=null   ? aAge-bAge    : null;
            const hasBoth = bScore!=null && aScore!=null;
            const camp    = getCamp(bf) || getCamp(af);

            return (
              <div key={name} className="card" style={{marginBottom:16}}>
                <div className="card-header">
                  <div style={{display:'flex', flexDirection:'column', gap:2}}>
                    <span className="card-title">{name}</span>
                    {camp && <span style={{fontSize:'0.72rem', color:'var(--text3)'}}>{camp}</span>}
                  </div>
                  <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
                    {hasBoth && sDiff!=null && (
                      <span className={`badge ${sDiff>=0?'badge-green':'badge-red'}`}>
                        {sDiff>=0?'▲':'▼'}{Math.abs(sDiff)}점
                      </span>
                    )}
                    {(af||bf)?.['체형판정'] && (
                      <span className="badge badge-gray" style={{fontSize:'0.7rem'}}>
                        {(af||bf)['체형판정']}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-body">
                  {/* 점수 배너 */}
                  <div style={{
                    display:'grid',
                    gridTemplateColumns: hasBoth ? '1fr auto 1fr auto 1fr' : '1fr',
                    gap:16, alignItems:'center',
                    background:'linear-gradient(135deg,#F0F4F0,#F4F1EB)',
                    borderRadius:14, padding:24, marginBottom:16,
                    border:'1px solid rgba(92,122,95,0.12)',
                  }}>
                    {/* Before */}
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'0.7rem', color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', marginBottom:6}}>
                        입소 전{bf?.['측정일'] ? ` (${bf['측정일']})` : ''}
                      </div>
                      <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:300, color:scoreColor(bScore), lineHeight:1}}>
                        {bScore ?? '-'}
                      </div>
                      <div style={{fontSize:'0.72rem', color:'var(--text3)', marginTop:4}}>
                        점 · 신체나이 {bAge ?? '-'}세
                      </div>
                      {bf?.['체형판정'] && (
                        <div style={{fontSize:'0.68rem', color:'var(--text3)', marginTop:3}}>{bf['체형판정']}</div>
                      )}
                    </div>

                    {hasBoth && <>
                      <div style={{fontSize:'1.2rem', color:'var(--border)', opacity:0.4}}>→</div>

                      {/* After */}
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'0.7rem', color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', marginBottom:6}}>
                          입소 후{af?.['측정일'] ? ` (${af['측정일']})` : ''}
                        </div>
                        <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:300, color:scoreColor(aScore), lineHeight:1}}>
                          {aScore ?? '-'}
                        </div>
                        <div style={{fontSize:'0.72rem', color:'var(--text3)', marginTop:4}}>
                          점 · 신체나이 {aAge ?? '-'}세
                        </div>
                        {af?.['체형판정'] && (
                          <div style={{fontSize:'0.68rem', color:'var(--text3)', marginTop:3}}>{af['체형판정']}</div>
                        )}
                      </div>

                      <div style={{width:1, height:60, background:'var(--border)'}}/>

                      {/* 변화 */}
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'0.7rem', color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', marginBottom:6}}>변화</div>
                        <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:300,
                          color: sDiff>=0 ? '#27ae60' : '#e74c3c', lineHeight:1}}>
                          {sDiff>=0?'▲':'▼'}{Math.abs(sDiff)}
                        </div>
                        {aDiff!=null && (
                          <div style={{fontSize:'0.72rem', marginTop:4, color: aDiff<=0?'#27ae60':'#e74c3c'}}>
                            신체나이 {Math.abs(aDiff)}세 {aDiff<=0?'↓감소':'↑증가'}
                          </div>
                        )}
                      </div>
                    </>}
                  </div>

                  {/* 체성분 상세 비교 */}
                  {hasBoth && (
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, marginBottom:8, letterSpacing:'0.05em'}}>
                        체성분 상세 비교
                      </div>
                      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:6}}>
                        {ITEMS.map(([label, key, unit, better]) => {
                          const bv = num(bf?.[key]);
                          const av = num(af?.[key]);
                          if (bv==null && av==null) return null;
                          const diff = bv!=null && av!=null ? av-bv : null;
                          const col  = diff!=null ? diffColor(diff, better) : 'var(--text3)';
                          const arrow = diff==null ? '' : diff>0 ? '▲' : diff<0 ? '▼' : '→';
                          const dec  = unit==='kcal' || unit==='' ? 0 : 1;
                          return (
                            <div key={key} style={{
                              display:'flex', justifyContent:'space-between', alignItems:'center',
                              padding:'8px 12px', background:'var(--bg)', borderRadius:8, fontSize:'0.8125rem',
                            }}>
                              <span style={{color:'var(--text3)', minWidth:72}}>{label}</span>
                              <span style={{display:'flex', gap:6, alignItems:'center'}}>
                                <span style={{color:'var(--text3)'}}>{bv!=null ? bv.toFixed(dec)+unit : '-'}</span>
                                <span style={{color:'var(--border)'}}>→</span>
                                <b>{av!=null ? av.toFixed(dec)+unit : '-'}</b>
                                {diff!=null && diff!==0 && (
                                  <span style={{color:col, fontSize:'0.7rem', minWidth:36, textAlign:'right'}}>
                                    {arrow}{Math.abs(diff).toFixed(dec)}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3차 이상 추가 측정 */}
                  {extras.length>0 && (
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, marginBottom:8, letterSpacing:'0.05em'}}>추가 측정</div>
                      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                        {extras.map((r,i) => {
                          const sc = num(r['종합점수']||r['점수']);
                          const ag = num(r['신체연령'] ||r['신체나이']);
                          return (
                            <div key={i} style={{
                              background:'var(--bg)', borderRadius:10, padding:'10px 16px',
                              fontSize:'0.8rem', border:'1px solid var(--border)',
                            }}>
                              <div style={{color:'var(--text3)', fontSize:'0.68rem', marginBottom:4}}>
                                {r['구분']} · {r['측정일']||r['날짜']}
                              </div>
                              <span style={{fontWeight:700, color:scoreColor(sc)}}>{sc??'-'}점</span>
                              <span style={{color:'var(--text3)', marginLeft:8, fontSize:'0.75rem'}}>신체나이 {ag??'-'}세</span>
                              {r['체형판정'] && <span style={{color:'var(--text3)', marginLeft:8, fontSize:'0.7rem'}}>· {r['체형판정']}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {!isGuest && (
                  <div style={{display:'flex', justifyContent:'flex-end', padding:'0 16px 12px'}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{
                      const r = rows[0];
                      setEditTarget(r); setEditForm({...r}); updateState({tab:'edit'});
                    }}>✏️ 수정</button>
                  </div>
                )}
              </div>
            );
          })

      /* ── EDIT 탭 ───────────────────────────────────────── */
      ) : tab==='edit' && editForm ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editTarget?.성명} 인바디 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(null);setEditForm(null);updateState({tab:'compare'});}}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleEdit}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label">캠프장소</label><input className="form-input" {...ef('캠프장소')}/></div>
              <div className="form-group"><label className="form-label">이름</label><input className="form-input" value={editForm.성명||''} disabled style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">측정일</label><input type="date" className="form-input" {...ef('측정일')}/></div>
              <div className="form-group"><label className="form-label">구분</label>
                <select className="form-select" {...ef('구분')}><option>1차</option><option>2차</option><option>3차</option></select>
              </div>
              <div className="form-group"><label className="form-label">종합점수</label><input type="number" className="form-input" {...ef('종합점수')}/></div>
              <div className="form-group"><label className="form-label">신체연령</label><input type="number" className="form-input" {...ef('신체연령')}/></div>
              <div className="form-group"><label className="form-label">체형판정</label><input className="form-input" {...ef('체형판정')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('체중(kg)')}/></div>
              <div className="form-group"><label className="form-label">골격근량 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('골격근량(kg)')}/></div>
              <div className="form-group"><label className="form-label">체지방량 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('체지방량(kg)')}/></div>
              <div className="form-group"><label className="form-label">체수분 (L)</label><input type="number" step="0.1" className="form-input" {...ef('체수분(L)')}/></div>
              <div className="form-group"><label className="form-label">단백질 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('단백질(kg)')}/></div>
              <div className="form-group"><label className="form-label">무기질 (kg)</label><input type="number" step="0.1" className="form-input" {...ef('무기질(kg)')}/></div>
              <div className="form-group"><label className="form-label">체지방률 (%)</label><input type="number" step="0.1" className="form-input" {...ef('체지방률(%)')}/></div>
              <div className="form-group"><label className="form-label">내장지방레벨</label><input type="number" className="form-input" {...ef('내장지방레벨')}/></div>
              <div className="form-group"><label className="form-label">내장지방면적 (cm²)</label><input type="number" className="form-input" {...ef('내장지방면적(cm²)')}/></div>
              <div className="form-group"><label className="form-label">복부비만율</label><input type="number" step="0.01" className="form-input" {...ef('복부비만율')}/></div>
              <div className="form-group"><label className="form-label">기초대사량 (kcal)</label><input type="number" className="form-input" {...ef('기초대사량(kcal)')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditTarget(null);setEditForm(null);updateState({tab:'compare'});}}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>

      /* ── ADD 탭 ────────────────────────────────────────── */
      ) : (
        <div className="card">
          <div className="card-header"><span className="card-title">인바디 측정 기록 입력</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label">캠프장소</label><input className="form-input" placeholder="예: 부산동래교회" {...f('캠프장소')}/></div>
              <div className="form-group"><label className="form-label required">입소자</label>
                <select className="form-select" value={form.성명} onChange={e=>setForm({...form,성명:e.target.value})}>
                  <option value="">선택</option>
                  {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">측정일</label><input type="date" className="form-input" {...f('측정일')}/></div>
              <div className="form-group"><label className="form-label">구분</label>
                <select className="form-select" {...f('구분')}><option>1차</option><option>2차</option><option>3차</option></select>
              </div>
              <div className="form-group"><label className="form-label">종합점수</label><input type="number" className="form-input" placeholder="75" {...f('종합점수')}/></div>
              <div className="form-group"><label className="form-label">신체연령</label><input type="number" className="form-input" placeholder="70" {...f('신체연령')}/></div>
              <div className="form-group"><label className="form-label">체형판정</label><input className="form-input" placeholder="예: 표준, 경도비만" {...f('체형판정')}/></div>
              <div className="form-group"><label className="form-label">체중 (kg)</label><input type="number" step="0.1" className="form-input" {...f('체중(kg)')}/></div>
              <div className="form-group"><label className="form-label">골격근량 (kg)</label><input type="number" step="0.1" className="form-input" {...f('골격근량(kg)')}/></div>
              <div className="form-group"><label className="form-label">체지방량 (kg)</label><input type="number" step="0.1" className="form-input" {...f('체지방량(kg)')}/></div>
              <div className="form-group"><label className="form-label">체수분 (L)</label><input type="number" step="0.1" className="form-input" {...f('체수분(L)')}/></div>
              <div className="form-group"><label className="form-label">단백질 (kg)</label><input type="number" step="0.1" className="form-input" {...f('단백질(kg)')}/></div>
              <div className="form-group"><label className="form-label">무기질 (kg)</label><input type="number" step="0.1" className="form-input" {...f('무기질(kg)')}/></div>
              <div className="form-group"><label className="form-label">체지방률 (%)</label><input type="number" step="0.1" className="form-input" {...f('체지방률(%)')}/></div>
              <div className="form-group"><label className="form-label">내장지방레벨</label><input type="number" className="form-input" {...f('내장지방레벨')}/></div>
              <div className="form-group"><label className="form-label">내장지방면적 (cm²)</label><input type="number" className="form-input" {...f('내장지방면적(cm²)')}/></div>
              <div className="form-group"><label className="form-label">복부비만율</label><input type="number" step="0.01" className="form-input" {...f('복부비만율')}/></div>
              <div className="form-group"><label className="form-label">기초대사량 (kcal)</label><input type="number" className="form-input" {...f('기초대사량(kcal)')}/></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>updateState({tab:'compare'})}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
