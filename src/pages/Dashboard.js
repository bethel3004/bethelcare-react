import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const AVATAR_COLORS = ['#7A6552','#5C7A6A','#7A5C6A','#6A7A5C','#5C6A7A','#7A7052'];

function Avatar({ name, idx }) {
  return (
    <div className="avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
      {name[0]}
    </div>
  );
}

function KpiCard({ label, value, unit, sub, color }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}<span className="kpi-unit">{unit}</span></div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ db, setPage }) {
  const { patients, bp, inbody } = db;
  const active   = patients.filter(p => p.상태 === '입소중').length;
  const total    = patients.length;
  const warnBp   = bp.filter(r => parseInt(r.혈압수축기) >= 140).length;
  const warnBs   = bp.filter(r => parseInt(r.혈당) >= 126).length;

  // 유태권 혈압 차트 데이터
  const chartData = bp.filter(r => r.입소자ID === '1').map(r => ({
    날짜: r.날짜.slice(5),
    수축기: parseInt(r.혈압수축기),
    이완기: parseInt(r.혈압이완기),
    혈당: parseInt(r.혈당),
  }));

  // 이상 알림
  const alerts = [];
  bp.forEach(r => {
    const s = parseInt(r.혈압수축기);
    if (s >= 160) alerts.push({ type:'danger', msg:`${r.성명} — 혈압 ${r.혈압수축기}/${r.혈압이완기}`, date: r.날짜 });
    else if (s >= 140) alerts.push({ type:'amber', msg:`${r.성명} — 혈압 ${r.혈압수축기}/${r.혈압이완기}`, date: r.날짜 });
    if (parseInt(r.혈당) >= 126) alerts.push({ type:'amber', msg:`${r.성명} — 혈당 ${r.혈당} mg/dL`, date: r.날짜 });
  });

  // 인바디 점수 변화
  const ibChanges = [];
  const pids = [...new Set(inbody.map(r => r.입소자ID))];
  pids.forEach(pid => {
    const rows = inbody.filter(r => r.입소자ID === pid).sort((a,b) => a.날짜.localeCompare(b.날짜));
    if (rows.length >= 2) {
      const diff = parseInt(rows[rows.length-1].점수) - parseInt(rows[0].점수);
      ibChanges.push({ name: rows[0].성명, before: parseInt(rows[0].점수), after: parseInt(rows[rows.length-1].점수), diff });
    }
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p,i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>오늘의 현황</h1>
        <p>벧엘수양원 건강 현황 한눈에 보기</p>
      </div>

      <div className="kpi-grid">
        <KpiCard label="전체 등록 인원" value={total} unit="명" color="#1A6B4A" />
        <KpiCard label="현재 입소 중"   value={active} unit="명" color="#1A5A9A" sub="퇴소 포함 전체" />
        <KpiCard label="혈압 이상 기록" value={warnBp} unit="건" color={warnBp > 0 ? '#C0392B' : '#1A6B4A'} />
        <KpiCard label="혈당 이상 기록" value={warnBs} unit="건" color={warnBs > 0 ? '#C17A00' : '#1A6B4A'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* 입소자 목록 */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">입소자 목록</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('patients')}>전체 보기</button>
          </div>
          {patients.map((p, i) => (
            <div key={p.ID} className="list-item" onClick={() => setPage('patients')}>
              <Avatar name={p.성명} idx={i} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.성명}
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>{p.나이}세 {p.성별}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.병명}
                </div>
              </div>
              <span className={`badge ${p.상태 === '입소중' ? 'badge-green' : 'badge-gray'}`}>{p.상태}</span>
            </div>
          ))}
        </div>

        {/* 오른쪽 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 이상 알림 */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">이상 수치 알림</span>
              <span className="badge badge-red">{Math.min(alerts.length, 99)}건</span>
            </div>
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              {alerts.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>이상 수치 없음 ✓</div>
              ) : alerts.slice(0, 5).map((a, i) => (
                <div key={i} className={`alert alert-${a.type === 'danger' ? 'red' : 'amber'}`}>
                  <div className="alert-dot" style={{ background: a.type === 'danger' ? 'var(--red)' : 'var(--amber)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{a.msg}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2 }}>{a.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 인바디 변화 */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">인바디 점수 변화</span>
            </div>
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              {ibChanges.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>기록 없음</div>
              ) : ibChanges.map((r, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < ibChanges.length-1 ? '1px solid var(--border2)' : 'none' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text3)' }}>{r.before}점</span>
                    <span style={{ color: 'var(--border)' }}>→</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: r.diff >= 0 ? 'var(--accent)' : 'var(--red)' }}>{r.after}점</span>
                    <span style={{ fontSize: '0.75rem', color: r.diff >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                      {r.diff >= 0 ? '▲' : '▼'}{Math.abs(r.diff)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 혈압 차트 */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">유태권 — 혈압·혈당 추이</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('bp_sugar')}>상세 보기</button>
          </div>
          <div style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="날짜" tick={{ fontSize: 11, fill: '#9A9A9A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9A9A9A' }} axisLine={false} tickLine={false} domain={[50, 200]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={140} stroke="#FFCDD2" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="수축기" stroke="#C0392B" strokeWidth={2} dot={{ r:3, fill:'#C0392B' }} name="수축기" />
                <Line type="monotone" dataKey="이완기" stroke="#E8A09A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="이완기" />
                <Line type="monotone" dataKey="혈당" stroke="#1A6B4A" strokeWidth={2} dot={{ r:3, fill:'#1A6B4A' }} yAxisId={0} name="혈당" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
