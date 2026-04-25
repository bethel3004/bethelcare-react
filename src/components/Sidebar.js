import React from 'react';

const MENU = [
  { id:'dashboard', icon:'◈', label:'대시보드' },
  { id:'patients',  icon:'◉', label:'입소자 관리' },
  { id:'bp_sugar',  icon:'♥', label:'혈당·혈압' },
  { id:'inbody',    icon:'◎', label:'인바디 체성분' },
  { id:'consult',   icon:'✦', label:'상담 일지' },
  { id:'groups',    icon:'◆', label:'기수·행사' },
  { id:'stats',     icon:'◐', label:'통계·보고서' },
];

export default function Sidebar({ page, setPage, open, setOpen, db }) {
  const active = db.patients.filter(p => p.상태 === '입소중').length;
  const total  = db.patients.length;

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: open ? '240px' : '64px',
      background: '#0D1F17',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      zIndex: 100,
      overflow: 'hidden',
    }}>

      {/* 로고 */}
      <div style={{ padding: open ? '24px 20px 16px' : '20px 0', textAlign: open ? 'left' : 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ fontSize: open ? '18px' : '22px', fontFamily: "'Instrument Serif', serif", color: '#A8D5BC', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {open ? '벧엘수양원' : '벧'}
        </div>
        {open && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>BethelCare</div>}
      </div>

      {/* 입소 현황 */}
      {open && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>현황</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', color: '#A8D5BC', lineHeight: 1 }}>{active}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>입소 중</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>전체</div>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {MENU.map(m => {
          const isActive = page === m.id;
          return (
            <button key={m.id} onClick={() => setPage(m.id)} style={{
              display: 'flex',
              alignItems: 'center',
              gap: open ? '12px' : '0',
              justifyContent: open ? 'flex-start' : 'center',
              width: '100%',
              padding: open ? '11px 20px' : '13px 0',
              background: isActive ? 'rgba(168,213,188,0.12)' : 'transparent',
              border: 'none',
              borderLeft: isActive ? '2px solid #A8D5BC' : '2px solid transparent',
              color: isActive ? '#A8D5BC' : 'rgba(255,255,255,0.45)',
              fontSize: '13px',
              fontWeight: isActive ? '600' : '400',
              fontFamily: "'DM Sans', 'Noto Sans KR', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
              textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              <span style={{ fontSize: open ? '14px' : '18px', width: open ? 'auto' : '100%', textAlign: 'center' }}>{m.icon}</span>
              {open && <span>{m.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* 토글 버튼 */}
      <button onClick={() => setOpen(!open)} style={{
        padding: '14px',
        background: 'rgba(255,255,255,0.04)',
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        color: 'rgba(255,255,255,0.3)',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
      >
        {open ? '← 접기' : '→'}
      </button>
    </aside>
  );
}
