import React from 'react';

const MENU = [
  { id:'dashboard', icon:'◈', label:'오늘의 현황' },
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
  const role = db.role || 'admin';
  const roleName = role === 'admin' ? '관리자' : role === 'staff' ? '직원' : '게스트';
  const roleColor = role === 'guest' ? '#8A6B4A' : role === 'staff' ? '#4A6B8A' : '#5C7A5F';

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: open ? '240px' : '64px',
      background: '#4A7C6A',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      zIndex: 100,
      overflow: 'hidden',
    }}>

      {/* 로고 */}
      <div onClick={()=>setPage('dashboard')} style={{ padding: open ? '24px 20px 16px' : '20px 0', textAlign: open ? 'left' : 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink:0, cursor:'pointer' }}>
        <div style={{ fontSize: open ? '27px' : '33px', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, color: '#C4AD8C', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
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
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: '#C4AD8C', lineHeight: 1 }}>{active}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>입소 중</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{total}</div>
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
              background: isActive ? 'rgba(196,173,140,0.14)' : 'transparent',
              border: 'none',
              borderLeft: isActive ? '2px solid #C4AD8C' : '2px solid transparent',
              color: isActive ? '#C4AD8C' : 'rgba(255,255,255,0.45)',
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

      {/* 역할 배지 */}
      {open && (
        <div style={{padding:'8px 20px 4px'}}>
          <span style={{fontSize:'0.7rem',background:roleColor,color:'white',padding:'2px 10px',borderRadius:20,fontWeight:600}}>
            {roleName}
          </span>
        </div>
      )}

      {/* 로그아웃 */}
      <button onClick={() => {
        sessionStorage.removeItem('bethelcare_auth');
        sessionStorage.removeItem('bethelcare_role');
        window.location.reload();
      }} style={{
        padding: '12px',
        background: 'transparent',
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.25)',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.05em',
        transition: 'all 0.15s',
        flexShrink: 0,
        textAlign: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
      >
        {open ? '로그아웃' : '↩'}
      </button>

      {/* 토글 버튼 */}
      <button onClick={() => setOpen(!open)} style={{
        padding: '14px',
        background: 'rgba(255,255,255,0.03)',
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
