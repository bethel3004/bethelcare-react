import React, { useState } from 'react';
import { appendToSheet, updateSheet, deleteFromSheet } from '../utils/sheets';

const AVATAR_COLORS = ['#7A6552','#5C7A6A','#7A5C6A','#6A7A5C','#5C6A7A','#7A7052'];

// 입소기간 달력 입력 컴포넌트
function AdmissionPicker({ value, onChange }) {
  const parse = (str) => {
    if (!str) return [{ start: '', end: '' }];
    return str.split(/[\n/]/).map(s => { s = s.trim();
      const m = s.trim().match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
      if (m) return { start: m[1], end: m[2] };
      return { start: '', end: '' };
    }).filter(a => a.start || a.end) || [{ start: '', end: '' }];
  };
  const format = (arr) => arr.filter(a=>a.start||a.end).map(a=>`${a.start} ~ ${a.end}`).join('\n');
  const [list, setList] = React.useState(() => parse(value) || [{ start:'', end:'' }]);

  const update = (newList) => { setList(newList); onChange(format(newList)); };

  return (
    <div>
      {list.map((a, i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <input type="date" className="form-input" value={a.start}
            onChange={e=>{const n=[...list];n[i]={...n[i],start:e.target.value};update(n);}}/>
          <span style={{color:'var(--text3)',flexShrink:0,fontWeight:500}}>~</span>
          <input type="date" className="form-input" value={a.end}
            onChange={e=>{const n=[...list];n[i]={...n[i],end:e.target.value};update(n);}}/>
          {list.length > 1 && (
            <button type="button" className="btn btn-danger btn-sm" style={{flexShrink:0}}
              onClick={()=>update(list.filter((_,j)=>j!==i))}>✕</button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:2}}
        onClick={()=>update([...list,{start:'',end:''}])}>
        + 입소 기간 추가
      </button>
    </div>
  );
}

export default function Patients({ db }) {
  const { patients, setPatients, isGuest } = db;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [tab, setTab] = useState('list');
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [admissions, setAdmissions] = useState([{ start: '', end: '' }]);
  const [form, setForm] = useState({
    캠프장소:'', 성명:'', 생년월일:'', 나이:'', 성별:'여', 종교:'', 신장:'', 현재체중:'',
    혈압_입소시:'', 혈당_입소시:'', 주소:'', 본인연락처:'',
    보호자이름:'', 보호자연락처:'', 보호자관계:'',
    병명:'', 치료경력:'', 입소기간:'', 상담자:'', 상태:'입소중'
  });

  const filtered = patients.filter(p => {
    if (statusFilter === '입소중' && p.상태 !== '입소중') return false;
    if (statusFilter === '퇴소' && p.상태 !== '퇴소') return false;
    if (search && !p.성명?.includes(search) && !p.병명?.includes(search)) return false;
    return true;
  });

  // 신장/체중 컬럼명 정규화
  // 입소기간 문자열 → 배열로 파싱
  const parseAdmissions = (str) => {
    if (!str) return [{ start: '', end: '' }];
    return str.split(/\n|,/).map(s => {
      const m = s.trim().match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
      if (m) return { start: m[1], end: m[2] };
      return { start: s.trim(), end: '' };
    }).filter(a => a.start || a.end);
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
    const newPatient = { ...form, ID: newId };
    setPatients([...patients, newPatient]);
    appendToSheet('입소자', newPatient);
    setForm({ 캠프장소:'', 성명:'', 생년월일:'', 나이:'', 성별:'여', 종교:'', 신장:'', 현재체중:'',
      혈압_입소시:'', 혈당_입소시:'', 주소:'', 본인연락처:'',
      보호자이름:'', 보호자연락처:'', 보호자관계:'',
      병명:'', 치료경력:'', 입소기간:'', 상담자:'', 상태:'입소중' });
    setTab('list');
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!editForm.성명 || !editForm.병명) return alert('성명과 병명은 필수입니다.');
    const updatedForm = { ...editForm, 입소기간: formatAdmissions(admissions) };
    setPatients(patients.map(p => p.ID === editTarget.ID ? updatedForm : p));
    if (updatedForm._rowIndex) updateSheet('입소자', updatedForm._rowIndex, updatedForm); else appendToSheet('입소자', updatedForm);
    setEditTarget(null); setEditForm(null); setAdmissions([{ start: '', end: '' }]); setTab('list');
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
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>목록</button>
          {!isGuest && <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>신규 등록</button>}
          {editTarget && (
            <button className={`tab ${tab==='edit'?'active':''}`} onClick={()=>setTab('edit')}>
              ✏️ {editTarget.성명} 수정
            </button>
          )}
        </div>
        {tab==='list' && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{display:'flex',gap:4}}>
              {['전체','입소중','퇴소'].map(s=>(
                <button key={s} onClick={()=>setStatusFilter(s)}
                  className={statusFilter===s?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'}>
                  {s}
                </button>
              ))}
            </div>
            <input className="form-input" style={{width:180}} placeholder="이름 또는 병명 검색..."
              value={search} onChange={e=>setSearch(e.target.value)} />
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
                  <div style={{fontWeight:600,fontSize:'0.9rem',display:'flex',alignItems:'center',gap:8}}>
                    {p.성명}
                    <span style={{fontSize:'0.75rem',fontWeight:400,color:'var(--text3)'}}>{p.나이}세 {p.성별} · {p.종교}</span>
                    {p.캠프장소 && <span className="badge badge-blue">{p.캠프장소}</span>}
                    <span className={`badge ${p.상태==='입소중'?'badge-green':'badge-gray'}`}>{p.상태||'퇴소'}</span>
                  </div>
                  <div style={{fontSize:'0.8rem',color:'var(--text3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.병명}
                  </div>
                </div>
                <div style={{fontSize:'0.8rem',color:'var(--text3)'}}>
                  {(p.입소기간||'').split(/[\n/]/).map(s=>s.trim()).filter(Boolean).slice(-1)[0] || ''}
                </div>
                <span style={{color:'var(--text3)',fontSize:'0.8rem'}}>{selected?.ID===p.ID?'▲':'▼'}</span>
              </div>

              {selected?.ID === p.ID && (
                <div className="card-body" style={{borderTop:'1px solid var(--border2)'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div className="section-label">인적사항</div>
                      {[
                        ['캠프장소', p.캠프장소],
                        ['최근 입소기간', (p.입소기간||'').split(/[\n/]/).map(s=>s.trim()).filter(Boolean).slice(-1)[0] || '-'],
                        ['전체 입소이력', (p.입소기간||'').split('\n').filter(Boolean).length > 1
                          ? (p.입소기간||'').split(/[\n/]/).map(s=>s.trim()).filter(Boolean).join('\n') : null],
                        ['생년월일', p.생년월일],
                        ['신장 / 체중', `${getVal(p,'신장','신장(cm)')||'-'}cm / ${getVal(p,'현재체중','현재체중(kg)')||'-'}kg`],
                        ['주소', p.주소],
                        ['연락처', p.본인연락처],
                        p.보호자이름 && ['보호자', `${p.보호자이름} (${p.보호자관계||''}) ${p.보호자연락처||''}`],
                      ].filter(Boolean).map(([k,v]) => (
                        <div key={k} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:'1px solid var(--border2)',fontSize:'0.8125rem'}}>
                          <span style={{color:'var(--text3)',width:80,flexShrink:0}}>{k}</span>
                          <span style={{fontWeight:500}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div>
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
                      <div style={{fontSize:'0.8rem',color:'var(--text2)',lineHeight:1.6,background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>{getTreatment(p)||'없음'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(p);setEditForm({...p});setAdmissions(parseAdmissions(p.입소기간));setSelected(null);setTab('edit');}}>✏️ 수정</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>{ if(p._rowIndex) deleteFromSheet('입소자', p._rowIndex); setPatients(patients.filter(x=>x.ID!==p.ID)); setSelected(null); }}>🗑️ 삭제</button>
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
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('list');}}>취소</button>
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
            </div>
            <div className="section-label">의료사항</div>
            <div className="form-grid form-grid-2" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label required">주요 병명</label><input className="form-input" {...ef('병명')}/></div>
              <div className="form-group"><label className="form-label">담당 상담자</label><input className="form-input" {...ef('상담자')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">치료 경력</label><textarea className="form-textarea" {...ef('치료경력')}/></div>
              <div className="form-group"><label className="form-label">입소기간</label><input className="form-input" {...ef('입소기간')}/></div>
              <div className="form-group"><label className="form-label">상태</label>
                <select className="form-select" {...ef('상태')}><option>입소중</option><option>퇴소</option></select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>{setEditTarget(null);setEditForm(null);setTab('list');}}>취소</button>
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
            </div>
            <div className="section-label">의료사항</div>
            <div className="form-grid form-grid-2" style={{marginBottom:16}}>
              <div className="form-group"><label className="form-label required">주요 병명</label><input className="form-input" placeholder="고혈압 / 당뇨 등" {...f('병명')}/></div>
              <div className="form-group"><label className="form-label">담당 상담자</label><input className="form-input" {...f('상담자')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">치료 경력</label><textarea className="form-textarea" placeholder="수술력, 복약이력 등" {...f('치료경력')}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">입소기간</label>
                <AdmissionPicker value={form.입소기간} onChange={v=>setForm({...form,입소기간:v})}/>
              </div>
              <div className="form-group"><label className="form-label">상태</label>
                <select className="form-select" {...f('상태')}><option>입소중</option><option>퇴소</option></select>
              </div>
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
