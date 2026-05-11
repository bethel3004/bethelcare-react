import React, { useState, useEffect, useCallback } from 'react';
import { getHashParams, pushHashParams } from '../utils/urlParams';
import { appendToSheet, updateSheet } from '../utils/sheets';

export default function Inbody({ db }) {
  const { patients, inbody, setInbody, isGuest, reloadSheets } = db;

  const initState = () => {
    const p = getHashParams();
    return {
      tab: p.tab || 'compare', search: p.search || '',
      sel: p.patient || '전체', statusFilter: p.status || '전체', campFilter: p.camp || '전체',
    };
  };
  const [urlState, setUrlState] = useState(initState);
  const { tab, search, sel, statusFilter, campFilter } = urlState;
  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState(null);

  const updateState = useCallback((next) => {
    setUrlState(prev => {
      const merged = { ...prev, ...next };
      pushHashParams('inbody', { tab: merged.tab, search: merged.search, patient: merged.sel, status: merged.statusFilter, camp: merged.campFilter });
      return merged;
    });
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (!window.location.hash.startsWith('#inbody')) return;
      const p = getHashParams();
      setUrlState({ tab: p.tab||'compare', search: p.search||'', sel: p.patient||'전체', statusFilter: p.status||'전체', campFilter: p.camp||'전체' });
      setEditTarget(null); setEditForm(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const emptyForm = {
    캠프장소:'', 성명:'', 성별:'', 출생연도:'', 신장:'', 측정일:'', 구분:'1차',
    '체중(kg)':'', '골격근량(kg)':'', '체지방량(kg)':'', '체수분(L)':'',
    '단백질(kg)':'', '무기질(kg)':'', '체지방률(%)':'',
    내장지방레벨:'', '내장지방면적(cm²)':'', 복부비만율:'',
    '기초대사량(kcal)':'', 종합점수:'', 신체연령:'', 체형판정:'',
  };
  const [form, setForm] = useState(emptyForm);

  const g      = (r, ...keys) => { for (const k of keys) if (r?.[k] !== undefined && r?.[k] !== '') return r[k]; return ''; };
  const getName  = r => g(r, '성명', '이름', '환자명');
  const getCamp  = r => g(r, '캠프장소');
  const getPhase = r => String(g(r, '구분') || '').trim();
  const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };

  // 구분 → 차수 번호
  const phaseNum = r => {
    const d = getPhase(r).toLowerCase();
    if (d === '1차' || d.includes('before')) return 1;
    if (d === '2차' || d.includes('after'))  return 2;
    if (d === '3차') return 3;
    if (d === '4차') return 4;
    return 99;
  };

  const campList = ['전체', ...[...new Set([
    ...patients.map(p => p.캠프장소),
    ...inbody.map(r => getCamp(r)),
  ].filter(Boolean))].sort()];

  const filteredPatients = patients.filter(p => {
    if (statusFilter !== '전체' && (p.상태||'').trim() !== statusFilter) return false;
    if (campFilter !== '전체' && (p.캠프장소||'').trim() !== campFilter) return false;
    if (search && !(p.성명||'').includes(search)) return false;
    return true;
  });
  const filteredPatientNames = new Set(filteredPatients.map(p => (p.성명||'').trim()).filter(Boolean));

  const filtered = inbody.filter(r => {
    const name = (getName(r)||'').trim();
    const camp = (getCamp(r)||'').trim();
    if (sel !== '전체') return name === sel.trim();
    if (campFilter !== '전체' && camp && camp !== campFilter) return false;
    if (statusFilter === '전체' && campFilter === '전체' && !search) return true;
    if (search && !name.includes(search)) return false;
    return name ? filteredPatientNames.has(name) : false;
  });

  const allInbodyNames = [...new Set(inbody.map(r => (getName(r)||'').trim()).filter(Boolean))];
  const names = sel !== '전체'
    ? [sel].filter(n => inbody.some(r => (getName(r)||'').trim() === n))
    : (() => {
        const fromPatients = filteredPatients.map(p=>(p.성명||'').trim()).filter(n=>n && filtered.some(r=>(getName(r)||'').trim()===n));
        const fromInbody   = allInbodyNames.filter(n=>filtered.some(r=>(getName(r)||'').trim()===n) && !fromPatients.includes(n));
        return [...fromPatients, ...fromInbody];
      })();

  const f  = k => ({ value: form[k]||'',      onChange: e => setForm({...form, [k]:e.target.value}) });
  const ef = k => ({ value: editForm?.[k]||'', onChange: e => setEditForm({...editForm, [k]:e.target.value}) });

  // 체성분 항목 [표시명, 키, 단위, 증가좋음(true)/감소좋음(false)/중립(null)]
  const ITEMS = [
    ['체중',         '체중(kg)',           'kg',   null],
    ['골격근량',     '골격근량(kg)',       'kg',   true],
    ['체지방량',     '체지방량(kg)',       'kg',   false],
    ['체수분',       '체수분(L)',          'L',    true],
    ['단백질',       '단백질(kg)',         'kg',   true],
    ['무기질',       '무기질(kg)',         'kg',   true],
    ['체지방률',     '체지방률(%)',        '%',    false],
    ['내장지방레벨', '내장지방레벨',       '',     false],
    ['내장지방면적', '내장지방면적(cm²)',  'cm²',  false],
    ['복부비만율',   '복부비만율',         '',     false],
    ['기초대사량',   '기초대사량(kcal)',   'kcal', true],
  ];

  const scoreColor = s => {
    const n = num(s); if (n==null) return 'var(--text3)';
    if (n>=90) return '#1e8449'; if (n>=80) return '#27ae60';
    if (n>=70) return '#e67e22'; return '#e74c3c';
  };
  const diffColor = (diff, better) => {
    if (diff===0 || better===null) return 'var(--text3)';
    return (diff>0&&better)||(diff<0&&!better) ? '#27ae60' : '#e74c3c';
  };

  const handleEdit = e => {
    e.preventDefault();
    setInbody(inbody.map(r => (r._rowIndex && r._rowIndex===editTarget._rowIndex)||r===editTarget ? {...editForm} : r));
    if (editForm._rowIndex) updateSheet('인바디_상세', editForm._rowIndex, editForm);
    setEditTarget(null); setEditForm(null); updateState({tab:'compare'});
  };
  const handleAdd = e => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x=>x.성명===form.성명);
    const newId = String(Math.max(0, ...inbody.map(x=>parseInt(x.ID)||0))+1);
    const newIb = {...form, ID:newId, 입소자ID:p?.ID||''};
    setInbody([...inbody, newIb]);
    setTimeout(()=>reloadSheets?.(), 1000);
    appendToSheet('인바디_상세', newIb);
    updateState({tab:'compare', sel:form.성명});
  };

  // ── 다차수 비교 테이블 컴포넌트 ──────────────────────────────
  const MultiCompare = ({ rows }) => {
    // 차수 순 정렬
    const sorted = [...rows].sort((a,b) => phaseNum(a)-phaseNum(b));
    if (sorted.length < 2) return null;

    const base = sorted[0]; // 1차 기준

    return (
      <div style={{marginBottom:12}}>
        <div style={{fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, marginBottom:8, letterSpacing:'0.05em'}}>
          체성분 전체 비교 ({sorted.length}회 측정)
        </div>

        {/* 차수별 점수 요약 */}
        <div style={{display:'flex', gap:8, marginBottom:12, flexWrap:'wrap'}}>
          {sorted.map((r, i) => {
            const sc = num(r['종합점수']||r['점수']);
            const ag = num(r['신체연령'] ||r['신체나이']);
            const prevSc = i>0 ? num(sorted[i-1]['종합점수']||sorted[i-1]['점수']) : null;
            const diff = (sc!=null && prevSc!=null) ? sc-prevSc : null;
            return (
              <div key={i} style={{
                flex:'1', minWidth:100, textAlign:'center',
                background: i===0 ? '#eaf4fb' : i===1 ? '#eafaf1' : i===2 ? '#fef9e7' : '#f3f0ff',
                borderRadius:12, padding:'12px 8px',
                border:`1px solid ${i===0?'#aed6f1':i===1?'#a9dfbf':i===2?'#f9e79f':'#d7bde2'}`,
              }}>
                <div style={{fontSize:'0.68rem', color:'var(--text3)', fontWeight:600, marginBottom:4}}>
                  {getPhase(r)}
                  {r['측정일'] && <span style={{fontWeight:400, marginLeft:4}}>({r['측정일']})</span>}
                </div>
                <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'2.4rem', fontWeight:300, color:scoreColor(sc), lineHeight:1}}>
                  {sc??'-'}
                </div>
                <div style={{fontSize:'0.7rem', color:'var(--text3)', marginTop:3}}>점 · {ag??'-'}세</div>
                {diff!=null && (
                  <div style={{fontSize:'0.7rem', marginTop:4, color:diff>=0?'#27ae60':'#e74c3c', fontWeight:600}}>
                    {diff>=0?'▲':'▼'}{Math.abs(diff)}점
                  </div>
                )}
                {r['체형판정'] && (
                  <div style={{fontSize:'0.65rem', color:'var(--text3)', marginTop:3}}>{r['체형판정']}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* 항목별 다차수 비교 표 */}
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.8rem'}}>
            <thead>
              <tr style={{background:'#f0f4f0'}}>
                <th style={{padding:'7px 12px', textAlign:'left', color:'var(--text3)', fontWeight:600, whiteSpace:'nowrap', borderBottom:'2px solid var(--border)'}}>항목</th>
                {sorted.map((r,i) => (
                  <th key={i} style={{padding:'7px 10px', textAlign:'center', color:'var(--text3)', fontWeight:600, whiteSpace:'nowrap', borderBottom:'2px solid var(--border)'}}>
                    {getPhase(r)}
                  </th>
                ))}
                {/* 1차→최종 변화 */}
                {sorted.length>=2 && (
                  <th style={{padding:'7px 10px', textAlign:'center', color:'var(--text3)', fontWeight:600, whiteSpace:'nowrap', borderBottom:'2px solid var(--border)', background:'#e8f5e9'}}>
                    총 변화
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ITEMS.map(([label, key, unit, better]) => {
                const vals = sorted.map(r => num(r[key]));
                if (vals.every(v=>v==null)) return null;
                const first = vals[0];
                const last  = vals[vals.length-1];
                const totalDiff = (first!=null && last!=null) ? last-first : null;
                const dec = unit==='kcal'||unit==='' ? 0 : 1;
                return (
                  <tr key={key} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'7px 12px', color:'var(--text3)', whiteSpace:'nowrap'}}>{label}</td>
                    {vals.map((v, i) => {
                      const prev = i>0 ? vals[i-1] : null;
                      const d = (v!=null && prev!=null) ? v-prev : null;
                      return (
                        <td key={i} style={{padding:'7px 10px', textAlign:'center', background: i===0?'#f7fbff':i===1?'#f7fff9':'transparent'}}>
                          <div style={{fontWeight: i===sorted.length-1?700:400}}>
                            {v!=null ? v.toFixed(dec)+unit : '-'}
                          </div>
                          {d!=null && d!==0 && (
                            <div style={{fontSize:'0.68rem', color:diffColor(d,better)}}>
                              {d>0?'▲':'▼'}{Math.abs(d).toFixed(dec)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {sorted.length>=2 && (
                      <td style={{padding:'7px 10px', textAlign:'center', background:'#f1f8e9'}}>
                        {totalDiff!=null ? (
                          <span style={{fontWeight:700, color:diffColor(totalDiff,better)}}>
                            {totalDiff>0?'▲':totalDiff<0?'▼':'→'}{Math.abs(totalDiff).toFixed(dec)}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── 2차수 비교 (기존 Before/After) ───────────────────────────
  const TwoCompare = ({ bf, af }) => (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, marginBottom:8, letterSpacing:'0.05em'}}>체성분 상세 비교</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:6}}>
        {ITEMS.map(([label, key, unit, better]) => {
          const bv = num(bf?.[key]); const av = num(af?.[key]);
          if (bv==null && av==null) return null;
          const diff = bv!=null&&av!=null ? av-bv : null;
          const dec  = unit==='kcal'||unit==='' ? 0 : 1;
          return (
            <div key={key} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--bg)', borderRadius:8, fontSize:'0.8125rem'}}>
              <span style={{color:'var(--text3)', minWidth:72}}>{label}</span>
              <span style={{display:'flex', gap:6, alignItems:'center'}}>
                <span style={{color:'var(--text3)'}}>{bv!=null?bv.toFixed(dec)+unit:'-'}</span>
                <span style={{color:'var(--border)'}}>→</span>
                <b>{av!=null?av.toFixed(dec)+unit:'-'}</b>
                {diff!=null&&diff!==0&&(
                  <span style={{color:diffColor(diff,better), fontSize:'0.7rem', minWidth:36, textAlign:'right'}}>
                    {diff>0?'▲':'▼'}{Math.abs(diff).toFixed(dec)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  return (
    <div>
      <div className="page-header">
        <h1>인바디 체성분 분석</h1>
        <p>Before &amp; After 비교 분석</p>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8}}>
        <div className="tabs">
          <button className={`tab ${tab==='compare'?'active':''}`} onClick={()=>updateState({tab:'compare'})}>Before &amp; After</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>updateState({tab:'add'})}>측정 기록 입력</button>}
        </div>
      </div>

      {tab==='compare' && (
        <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center'}}>
          <input className="form-input" style={{maxWidth:180}} placeholder="🔍 이름 검색..."
            value={search} onChange={e=>updateState({search:e.target.value, sel:'전체'})}/>
          {search && <button className="btn btn-ghost btn-sm" onClick={()=>updateState({search:''})}>✕</button>}
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {['전체','입소중','퇴소'].map(s=>(
              <button key={s} className={statusFilter===s?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'}
                onClick={()=>updateState({statusFilter:s})}>{s}</button>
            ))}
          </div>
          <select value={campFilter} onChange={e=>updateState({campFilter:e.target.value})}
            className="form-select" style={{height:32, padding:'0 8px', fontSize:'0.85rem', minWidth:130}}>
            {campList.map(c=><option key={c} value={c}>{c==='전체'?'캠프장소 전체':c}</option>)}
          </select>
        </div>
      )}

      {/* ── COMPARE ─────────────────────────────────────────── */}
      {tab==='compare' ? (
        names.length===0
          ? <div className="empty-state">인바디 기록이 없습니다.</div>
          : names.map(name => {
            const rows = filtered
              .filter(r=>(getName(r)||'').trim()===name)
              .sort((a,b)=>phaseNum(a)-phaseNum(b));

            const bf = rows.find(r=>phaseNum(r)===1) || rows[0];
            const af = rows.find(r=>phaseNum(r)===2) || (rows.length>1?rows[1]:null);
            const hasMulti = rows.length >= 3; // 3차 이상

            const bScore = num(bf?.['종합점수']||bf?.['점수']);
            const aScore = af ? num(af['종합점수']||af['점수']) : null;
            const bAge   = num(bf?.['신체연령'] ||bf?.['신체나이']);
            const aAge   = af ? num(af['신체연령']||af['신체나이']) : null;
            const sDiff  = bScore!=null&&aScore!=null ? aScore-bScore : null;
            const aDiff  = bAge!=null&&aAge!=null     ? aAge-bAge    : null;
            const hasBoth = bScore!=null && aScore!=null;
            const camp   = getCamp(bf)||getCamp(af);

            // 최고 점수 측정
            const bestRow = rows.reduce((best,r) => {
              const sc = num(r['종합점수']||r['점수']);
              if (sc==null) return best;
              return (!best || sc > num(best['종합점수']||best['점수'])) ? r : best;
            }, null);

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
                    {rows.length>=3 && (
                      <span className="badge badge-gray" style={{fontSize:'0.7rem'}}>{rows.length}회 측정</span>
                    )}
                    {(af||bf)?.['체형판정'] && (
                      <span className="badge badge-gray" style={{fontSize:'0.7rem'}}>{(af||bf)['체형판정']}</span>
                    )}
                  </div>
                </div>

                <div className="card-body">
                  {/* 점수 배너 — 3차 이상이면 전체 차수 표시 */}
                  {hasMulti ? (
                    // 3차 이상: 가로 스크롤 카드
                    <div style={{
                      display:'flex', gap:12, overflowX:'auto',
                      background:'linear-gradient(135deg,#F0F4F0,#F4F1EB)',
                      borderRadius:14, padding:20, marginBottom:16,
                      border:'1px solid rgba(92,122,95,0.12)',
                    }}>
                      {rows.map((r,i) => {
                        const sc = num(r['종합점수']||r['점수']);
                        const ag = num(r['신체연령'] ||r['신체나이']);
                        const prevSc = i>0 ? num(rows[i-1]['종합점수']||rows[i-1]['점수']) : null;
                        const d = sc!=null&&prevSc!=null ? sc-prevSc : null;
                        const isBest = bestRow===r;
                        return (
                          <div key={i} style={{
                            flex:'0 0 auto', minWidth:130, textAlign:'center',
                            padding:'12px 16px', borderRadius:10,
                            background: isBest ? 'rgba(39,174,96,0.12)' : 'rgba(255,255,255,0.6)',
                            border: isBest ? '1.5px solid #27ae60' : '1px solid rgba(0,0,0,0.06)',
                            position:'relative',
                          }}>
                            {isBest && <div style={{position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', background:'#27ae60', color:'#fff', fontSize:'0.6rem', padding:'2px 6px', borderRadius:10, whiteSpace:'nowrap'}}>최고점</div>}
                            <div style={{fontSize:'0.68rem', color:'var(--text3)', fontWeight:600, marginBottom:4}}>
                              {getPhase(r)}
                              {r['측정일']&&<div style={{fontWeight:400, fontSize:'0.65rem'}}>{r['측정일']}</div>}
                            </div>
                            <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'2.8rem', fontWeight:300, color:scoreColor(sc), lineHeight:1}}>
                              {sc??'-'}
                            </div>
                            <div style={{fontSize:'0.7rem', color:'var(--text3)', marginTop:3}}>점 · {ag??'-'}세</div>
                            {d!=null&&(
                              <div style={{fontSize:'0.7rem', marginTop:4, color:d>=0?'#27ae60':'#e74c3c', fontWeight:600}}>
                                {d>=0?'▲':'▼'}{Math.abs(d)}점
                              </div>
                            )}
                            {r['체형판정']&&<div style={{fontSize:'0.65rem', color:'var(--text3)', marginTop:3}}>{r['체형판정']}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // 1~2차: 기존 Before/After 배너
                    <div style={{
                      display:'grid', gridTemplateColumns:hasBoth?'1fr auto 1fr auto 1fr':'1fr',
                      gap:16, alignItems:'center',
                      background:'linear-gradient(135deg,#F0F4F0,#F4F1EB)',
                      borderRadius:14, padding:24, marginBottom:16,
                      border:'1px solid rgba(92,122,95,0.12)',
                    }}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'0.7rem', color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', marginBottom:6}}>
                          입소 전{bf?.['측정일']?` (${bf['측정일']})`:''}</div>
                        <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:300, color:scoreColor(bScore), lineHeight:1}}>{bScore??'-'}</div>
                        <div style={{fontSize:'0.72rem', color:'var(--text3)', marginTop:4}}>점 · 신체나이 {bAge??'-'}세</div>
                        {bf?.['체형판정']&&<div style={{fontSize:'0.68rem', color:'var(--text3)', marginTop:3}}>{bf['체형판정']}</div>}
                      </div>
                      {hasBoth&&<>
                        <div style={{fontSize:'1.2rem', color:'var(--border)', opacity:0.4}}>→</div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'0.7rem', color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', marginBottom:6}}>
                            입소 후{af?.['측정일']?` (${af['측정일']})`:''}</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:300, color:scoreColor(aScore), lineHeight:1}}>{aScore??'-'}</div>
                          <div style={{fontSize:'0.72rem', color:'var(--text3)', marginTop:4}}>점 · 신체나이 {aAge??'-'}세</div>
                          {af?.['체형판정']&&<div style={{fontSize:'0.68rem', color:'var(--text3)', marginTop:3}}>{af['체형판정']}</div>}
                        </div>
                        <div style={{width:1, height:60, background:'var(--border)'}}/>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'0.7rem', color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', marginBottom:6}}>변화</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:300, color:sDiff>=0?'#27ae60':'#e74c3c', lineHeight:1}}>
                            {sDiff>=0?'▲':'▼'}{Math.abs(sDiff)}</div>
                          {aDiff!=null&&<div style={{fontSize:'0.72rem', marginTop:4, color:aDiff<=0?'#27ae60':'#e74c3c'}}>신체나이 {Math.abs(aDiff)}세 {aDiff<=0?'↓감소':'↑증가'}</div>}
                        </div>
                      </>}
                    </div>
                  )}

                  {/* 체성분 비교 — 3차 이상이면 표, 2차면 기존 그리드 */}
                  {hasMulti
                    ? <MultiCompare rows={rows} />
                    : hasBoth && <TwoCompare bf={bf} af={af} />
                  }
                </div>

                {!isGuest && (
                  <div style={{display:'flex', justifyContent:'flex-end', padding:'0 16px 12px'}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{
                      setEditTarget(rows[0]); setEditForm({...rows[0]}); updateState({tab:'edit'});
                    }}>✏️ 수정</button>
                  </div>
                )}
              </div>
            );
          })

      /* ── EDIT ────────────────────────────────────────────── */
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
                <select className="form-select" {...ef('구분')}><option>1차</option><option>2차</option><option>3차</option><option>4차</option></select></div>
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

      /* ── ADD ─────────────────────────────────────────────── */
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
                <select className="form-select" {...f('구분')}><option>1차</option><option>2차</option><option>3차</option><option>4차</option></select></div>
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
