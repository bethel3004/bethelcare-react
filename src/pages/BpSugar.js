import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { appendToSheet, updateSheet, deleteFromSheet } from '../utils/sheets';

const AVATAR_COLORS = ['#7A6552','#5C7A6A','#7A5C6A','#6A7A5C','#5C6A7A','#7A7052'];
const BASE_HASH = '#bp_sugar';

// ── URL 파라미터 유틸 ─────────────────────────────────────
function getHashParams() {
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return {};
  const params = {};
  hash.slice(qIdx + 1).split('&').forEach(part => {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    const k = decodeURIComponent(part.slice(0, eq));
    const v = decodeURIComponent(part.slice(eq + 1));
    params[k] = v;
  });
  return params;
}

function buildHash(params) {
  const entries = Object.entries(params).filter(([, v]) => v && v !== '전체' && v !== 'list' && v !== '');
  if (!entries.length) return BASE_HASH;
  const query = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `${BASE_HASH}?${query}`;
}

function pushParams(params) {
  const newHash = buildHash(params);
  if (window.location.hash !== newHash) {
    window.history.pushState(null, '', newHash);
  }
}

// ── 컴포넌트 ─────────────────────────────────────────────
export default function BpSugar({ db }) {
  const { patients, bp, setBp, isGuest } = db;

  // URL에서 초기 상태 읽기
  const initFromURL = useCallback(() => {
    const p = getHashParams();
    return {
      tab:          p.tab        || 'list',
      search:       p.search     || '',
      statusFilter: p.status     || '전체',
      campFilter:   p.camp       || '전체',
      selected:     p.patient    || null,
    };
  }, []);

  const [state, setState] = useState(initFromURL);
  const { tab, search, statusFilter, campFilter, selected } = state;

  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState(null);
  const [form, setForm] = useState({ 성명:'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });

  // 상태 변경 시 URL 업데이트
  const updateState = useCallback((next) => {
    const merged = { ...state, ...next };
    setState(merged);
    pushParams({
      status:  merged.statusFilter,
      camp:    merged.campFilter,
      search:  merged.search,
      patient: merged.selected || '',
      tab:     merged.tab,
    });
  }, [state]);

  // 뒤로가기/앞으로가기 처리
  useEffect(() => {
    const onPop = () => {
      const p = getHashParams();
      // 현재 페이지가 bp_sugar인지 확인
      if (!window.location.hash.startsWith(BASE_HASH)) return;
      setState({
        tab:          p.tab     || 'list',
        search:       p.search  || '',
        statusFilter: p.status  || '전체',
        campFilter:   p.camp    || '전체',
        selected:     p.patient || null,
      });
      setEditTarget(null);
      setEditForm(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── 데이터 계산 ─────────────────────────────────────────
  const bpColor = v => parseInt(v)>=160?'val-danger':parseInt(v)>=140?'val-warning':'val-good';
  const bsColor = v => parseInt(v)>=126?'val-danger':parseInt(v)>=100?'val-warning':'val-good';

  const getLatestRecord = (name) => {
    const records = bp.filter(r => r.성명 === name);
    if (!records.length) return null;
    return [...records].sort((a,b) => (b.날짜||'').localeCompare(a.날짜||''))[0];
  };
  const getRecordCount = (name) => bp.filter(r => r.성명 === name).length;

  const campList = ['전체', ...[...new Set(patients.map(p => p.캠프장소).filter(Boolean))].sort()];

  const filteredPatients = patients.filter(p => {
    if (statusFilter === '입소중' && p.상태 !== '입소중') return false;
    if (statusFilter === '퇴소'   && p.상태 !== '퇴소')   return false;
    if (campFilter !== '전체' && p.캠프장소 !== campFilter) return false;
    if (search && !p.성명?.includes(search)) return false;
    return true;
  });

  const selectedRecords = selected
    ? [...bp.filter(r => r.성명 === selected)].sort((a,b) => (b.날짜||'').localeCompare(a.날짜||''))
    : [];

  const chartData = selected
    ? [...bp.filter(r => r.성명 === selected)]
        .sort((a,b) => (a.날짜||'').localeCompare(b.날짜||''))
        .map(r => ({
          날짜: (r.날짜||'').slice(5),
          수축기: parseInt(r.혈압수축기)||0,
          이완기: parseInt(r.혈압이완기)||0,
          혈당: parseInt(r.혈당)||0,
        }))
    : [];

  // ── 이벤트 핸들러 ────────────────────────────────────────
  const goList = () => updateState({ tab:'list', selected:null });
  const goDetail = (name) => updateState({ tab:'detail', selected:name });
  const goAdd = () => {
    setForm({ 성명: selected||'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });
    updateState({ tab:'add' });
  };
  const goEdit = (r) => {
    setEditTarget(r);
    setEditForm({...r});
    updateState({ tab:'edit' });
  };
  const goBackToDetail = () => {
    setEditTarget(null);
    setEditForm(null);
    updateState({ tab:'detail' });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x => x.성명 === form.성명);
    const newId = String(Math.max(0, ...bp.map(x => parseInt(x.ID)||0)) + 1);
    const newBp = { ...form, ID: newId, 입소자ID: p?.ID||'' };
    setBp([...bp, newBp]);
    appendToSheet('혈당혈압', newBp);
    setForm({ 성명: selected||'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });
    updateState({ tab:'detail' });
  };

  const handleEdit = (e) => {
    e.preventDefault();
    setBp(bp.map(r =>
      (r._rowIndex && r._rowIndex === editTarget._rowIndex) ||
      (r.ID && r.ID === editTarget.ID) ||
      r === editTarget ? { ...editForm } : r
    ));
    if (editForm._rowIndex) updateSheet('혈당혈압', editForm._rowIndex, editForm);
    setEditTarget(null);
    setEditForm(null);
    updateState({ tab:'detail' });
  };

  const handleDelete = (r) => {
    if (!window.confirm(`${r.날짜} 기록을 삭제할까요?`)) return;
    if (r._rowIndex) deleteFromSheet('혈당혈압', r._rowIndex);
    setBp(bp.filter(x =>
      x._rowIndex ? x._rowIndex !== r._rowIndex : (x.ID ? x.ID !== r.ID : x !== r)
    ));
  };

  const f  = k => ({ value: form[k],       onChange: e => setForm({...form, [k]: e.target.value}) });
  const ef = k => ({ value: editForm?.[k]||'', onChange: e => setEditForm({...editForm, [k]: e.target.value}) });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{background:'white',border:'1px solid #eee',borderRadius:10,padding:'10px 14px',fontSize:12}}>
        <div style={{fontWeight:600,marginBottom:4}}>{label}</div>
        {payload.map((p,i) => <div key={i} style={{color:p.color}}>{p.name}: {p.value}</div>)}
      </div>
    );
  };

  // ── 렌더 ────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1>혈당·혈압 기록</h1>
        <p>입소자별 측정 기록 및 추이 분석</p>
      </div>

      {/* 탭 */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={goList}>입소자 목록</button>
          {selected && <button className={`tab ${tab==='detail'?'active':''}`} onClick={()=>updateState({tab:'detail'})}>📋 {selected} 기록</button>}
          {selected && !isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={goAdd}>+ 기록 입력</button>}
          {editTarget && <button className={`tab ${tab==='edit'?'active':''}`} onClick={()=>updateState({tab:'edit'})}>✏️ 수정</button>}
        </div>
      </div>

      {/* ── 입소자 목록 ── */}
      {tab === 'list' && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <input className="form-input" style={{maxWidth:180}} placeholder="🔍 이름 검색..."
              value={search} onChange={e => updateState({search: e.target.value})}/>
            {search && <button className="btn btn-ghost btn-sm" onClick={()=>updateState({search:''})}>✕</button>}
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {['전체','입소중','퇴소'].map(s => (
                <button key={s}
                  className={statusFilter===s?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'}
                  onClick={()=>updateState({statusFilter:s})}>{s}</button>
              ))}
            </div>
            <select
              value={campFilter}
              onChange={e => updateState({campFilter: e.target.value})}
              className="form-select"
              style={{height:32,padding:'0 8px',fontSize:'0.85rem',minWidth:120}}>
              <option value="전체">캠프장소 전체</option>
              {campList.filter(c => c !== '전체').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
            {filteredPatients.map((p, idx) => {
              const latest = getLatestRecord(p.성명);
              const count  = getRecordCount(p.성명);
              return (
                <div key={p.ID||idx} className="card"
                  style={{cursor:'pointer',transition:'box-shadow 0.15s'}}
                  onClick={()=>goDetail(p.성명)}>
                  <div style={{padding:'16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                      <div className="avatar" style={{background:AVATAR_COLORS[idx%AVATAR_COLORS.length],flexShrink:0}}>
                        {p.성명?.[0]}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontWeight:700,fontSize:'0.95rem'}}>{p.성명}</span>
                          <span style={{fontSize:'0.75rem',color:'var(--text3)'}}>{p.나이}세 {p.성별}</span>
                          <span className={`badge ${p.상태==='입소중'?'badge-green':'badge-gray'}`}>{p.상태}</span>
                        </div>
                        <div style={{fontSize:'0.75rem',color:'var(--text3)',marginTop:2}}>{p.병명}</div>
                      </div>
                    </div>
                    {latest ? (
                      <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                        <div style={{fontSize:'0.7rem',color:'var(--text3)',marginBottom:6}}>최근 기록 — {latest.날짜} ({count}건)</div>
                        <div style={{display:'flex',gap:12}}>
                          {latest.혈당 && (
                            <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>혈당</div>
                              <div style={{fontWeight:700,fontSize:'0.95rem'}} className={bsColor(latest.혈당)}>{latest.혈당}</div>
                              <div style={{fontSize:'0.6rem',color:'var(--text3)'}}>mg/dL</div>
                            </div>
                          )}
                          {latest.혈압수축기 && (
                            <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>혈압</div>
                              <div style={{fontWeight:700,fontSize:'0.95rem'}} className={bpColor(latest.혈압수축기)}>{latest.혈압수축기}/{latest.혈압이완기}</div>
                              <div style={{fontSize:'0.6rem',color:'var(--text3)'}}>mmHg</div>
                            </div>
                          )}
                          {!latest.혈당 && !latest.혈압수축기 && (
                            <div style={{fontSize:'0.8rem',color:'var(--text3)'}}>기록 없음</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px',fontSize:'0.8rem',color:'var(--text3)',textAlign:'center'}}>
                        기록 없음
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 상세 기록 ── */}
      {tab === 'detail' && selected && (
        <div>
          {chartData.length > 1 && (
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><span className="card-title">{selected} — 혈압·혈당 추이</span></div>
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
              <span className="card-title">{selected} 날짜별 기록</span>
              <span style={{fontSize:'0.8rem',color:'var(--text3)'}}>{selectedRecords.length}건</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{whiteSpace:'nowrap'}}>날짜</th>
                    <th>혈당(mg/dL)</th>
                    <th>혈압(mmHg)</th>
                    <th>비고</th>
                    {!isGuest && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:24}}>기록이 없습니다</td></tr>
                  ) : selectedRecords.map((r,i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600,whiteSpace:'nowrap'}}>{r.날짜}</td>
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
                      {!isGuest && (
                        <td style={{whiteSpace:'nowrap'}}>
                          <button className="btn btn-ghost btn-sm" style={{marginRight:4}}
                            onClick={()=>goEdit(r)}>✏️</button>
                          <button className="btn btn-danger btn-sm"
                            onClick={()=>handleDelete(r)}>🗑️</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 폼 ── */}
      {tab === 'edit' && editForm && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✏️ {editTarget?.성명} {editTarget?.날짜} 수정</span>
            <button className="btn btn-ghost btn-sm" onClick={goBackToDetail}>취소</button>
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
              <button type="button" className="btn btn-ghost" onClick={goBackToDetail}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}

      {/* ── 신규 입력 폼 ── */}
      {tab === 'add' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{selected} — 혈당·혈압 기록 입력</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>updateState({tab:'detail'})}>취소</button>
          </div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label">이름</label><input className="form-input" value={selected} disabled style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">날짜</label><input type="date" className="form-input" {...f('날짜')}/></div>
              <div className="form-group"><label className="form-label">혈당 (mg/dL)</label><input type="number" className="form-input" placeholder="100" {...f('혈당')}/></div>
              <div className="form-group"><label className="form-label">혈압 수축기</label><input type="number" className="form-input" placeholder="120" {...f('혈압수축기')}/></div>
              <div className="form-group"><label className="form-label">혈압 이완기</label><input type="number" className="form-input" placeholder="80" {...f('혈압이완기')}/></div>
              <div className="form-group"><label className="form-label">비고</label><input className="form-input" placeholder="식전/식후, 특이사항" {...f('비고')}/></div>
            </div>
            {parseInt(form.혈압수축기)>=160 && <div className="alert alert-red" style={{marginTop:12}}>🔴 혈압 {form.혈압수축기} — 매우 높음!</div>}
            {parseInt(form.혈압수축기)>=140&&parseInt(form.혈압수축기)<160 && <div className="alert alert-amber" style={{marginTop:12}}>⚠ 혈압 {form.혈압수축기} — 높음.</div>}
            {parseInt(form.혈당)>=126 && <div className="alert alert-amber" style={{marginTop:12}}>⚠ 혈당 {form.혈당} — 주의 수치.</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>updateState({tab:'detail'})}>취소</button>
              <button type="submit" className="btn btn-primary">💾 저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
