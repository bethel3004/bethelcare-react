import React, { useState } from 'react';
import { appendToSheet } from '../utils/sheets';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function BpSugar({ db }) {
  const { patients, bp, setBp } = db;
  const [tab, setTab] = useState('list');
  const [sel, setSel] = useState('전체');
  const [form, setForm] = useState({ 입소자ID:'', 성명:'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });

  const filtered = sel === '전체' ? bp : bp.filter(r => r.성명 === sel);
  const chartData = filtered.filter(r => sel !== '전체').sort((a,b)=>a.날짜.localeCompare(b.날짜)).map(r=>({
    날짜: r.날짜.slice(5),
    수축기: parseInt(r.혈압수축기), 이완기: parseInt(r.혈압이완기), 혈당: parseInt(r.혈당)
  }));

  const bpColor = v => parseInt(v) >= 160 ? 'val-danger' : parseInt(v) >= 140 ? 'val-warning' : 'val-good';
  const bsColor = v => parseInt(v) >= 126 ? 'val-danger' : parseInt(v) >= 100 ? 'val-warning' : 'val-good';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.성명) return alert('입소자를 선택하세요.');
    const p = patients.find(x => x.성명 === form.성명);
    const newId = String(Math.max(0,...bp.map(x=>parseInt(x.ID)))+1);
    setBp([...bp, { ...form, ID:newId, 입소자ID: p?.ID||'' }]);
    setForm({ 입소자ID:'', 성명:'', 날짜:'', 혈당:'', 혈압수축기:'', 혈압이완기:'', 비고:'' });
    setTab('list');
  };
  const f = k => ({ value:form[k], onChange:e=>setForm({...form,[k]:e.target.value}) });

  return (
    <div>
      <div className="page-header"><h1>혈당·혈압 기록</h1><p>날짜별 측정 기록 및 추이 분석</p></div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div className="tabs">
          <button className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>기록 조회</button>
          <button className={`tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>기록 입력</button>
        </div>
        {tab==='list' && (
          <select className="form-select" style={{width:160}} value={sel} onChange={e=>setSel(e.target.value)}>
            <option>전체</option>
            {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
          </select>
        )}
      </div>

      {tab==='list' ? (
        <>
          {chartData.length > 1 && (
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><span className="card-title">{sel} — 혈압·혈당 추이</span></div>
              <div style={{padding:'12px 8px'}}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="날짜" tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9A9A9A'}} axisLine={false} tickLine={false} domain={[50,210]}/>
                    <Tooltip contentStyle={{borderRadius:10,fontSize:12,border:'1px solid #eee'}}/>
                    <ReferenceLine y={140} stroke="#FFCDD2" strokeDasharray="4 2"/>
                    <Line type="monotone" dataKey="수축기" stroke="#C0392B" strokeWidth={2} dot={{r:3}} name="수축기"/>
                    <Line type="monotone" dataKey="이완기" stroke="#E8A09A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="이완기"/>
                    <Line type="monotone" dataKey="혈당" stroke="#1A6B4A" strokeWidth={2} dot={{r:3}} name="혈당"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><span className="card-title">날짜별 기록</span><span style={{fontSize:'0.8rem',color:'var(--text3)'}}>{filtered.length}건</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>날짜</th><th>이름</th><th>혈당 (mg/dL)</th><th>혈압 (mmHg)</th><th>비고</th></tr></thead>
                <tbody>
                  {[...filtered].sort((a,b)=>b.날짜.localeCompare(a.날짜)).map(r=>(
                    <tr key={r.ID}>
                      <td style={{fontWeight:600}}>{r.날짜}</td>
                      <td>{r.성명}</td>
                      <td><span className={bsColor(r.혈당)}>{r.혈당}</span> {parseInt(r.혈당)>=126&&<span className="badge badge-red" style={{fontSize:'0.65rem'}}>주의</span>}</td>
                      <td><span className={bpColor(r.혈압수축기)}>{r.혈압수축기}/{r.혈압이완기}</span> {parseInt(r.혈압수축기)>=160&&<span className="badge badge-red" style={{fontSize:'0.65rem'}}>매우높음</span>}{parseInt(r.혈압수축기)>=140&&parseInt(r.혈압수축기)<160&&<span className="badge badge-amber" style={{fontSize:'0.65rem'}}>높음</span>}</td>
                      <td style={{color:'var(--text3)',fontSize:'0.8rem'}}>{r.비고||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-header"><span className="card-title">혈당·혈압 기록 입력</span></div>
          <form className="card-body" onSubmit={handleAdd}>
            <div className="form-grid form-grid-2">
              <div className="form-group"><label className="form-label required">입소자</label>
                <select className="form-select" value={form.성명} onChange={e=>setForm({...form,성명:e.target.value})}>
                  <option value="">선택</option>
                  {patients.map(p=><option key={p.ID}>{p.성명}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">날짜</label><input type="date" className="form-input" {...f('날짜')}/></div>
              <div className="form-group"><label className="form-label">혈당 (mg/dL)</label><input type="number" className="form-input" placeholder="100" {...f('혈당')}/></div>
              <div className="form-group"><label className="form-label">혈압 수축기</label><input type="number" className="form-input" placeholder="120" {...f('혈압수축기')}/></div>
              <div className="form-group"><label className="form-label">혈압 이완기</label><input type="number" className="form-input" placeholder="80" {...f('혈압이완기')}/></div>
              <div className="form-group"><label className="form-label">비고</label><input className="form-input" placeholder="식전/식후, 특이사항" {...f('비고')}/></div>
            </div>
            {parseInt(form.혈압수축기)>=160&&<div className="alert alert-red" style={{marginTop:12}}>🔴 혈압 {form.혈압수축기} — 매우 높음! 즉시 확인 필요.</div>}
            {parseInt(form.혈압수축기)>=140&&parseInt(form.혈압수축기)<160&&<div className="alert alert-amber" style={{marginTop:12}}>⚠ 혈압 {form.혈압수축기} — 높음.</div>}
            {parseInt(form.혈당)>=126&&<div className="alert alert-amber" style={{marginTop:12}}>⚠ 혈당 {form.혈당} — 주의 수치.</div>}
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
