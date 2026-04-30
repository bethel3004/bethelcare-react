import React, { useEffect, useState } from 'react';

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
  const roleName = role === 'admin' ? '관리자' : role === 'staff' ? 'STAFF' : '게스트';
  const roleColor = role === 'guest' ? '#8A6B4A' : role === 'staff' ? '#4A6B8A' : '#5C7A5F';

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // 모바일에서는 기본 닫힘
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  const handleMenuClick = (id) => {
    setPage(id);
    if (isMobile) setOpen(false); // 모바일에서 메뉴 선택 후 자동 닫힘
  };

  // 모바일 오버레이 (사이드바 열렸을 때 배경 클릭하면 닫힘)
  const overlay = isMobile && open ? (
    <div onClick={() => setOpen(false)} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 99,
    }}/>
  ) : null;

  return (
    <>
      {overlay}

      {/* 모바일 햄버거 버튼 */}
      {isMobile && (
        <button onClick={() => setOpen(!open)} style={{
          position: 'fixed', top: 12, left: 12,
          width: 40, height: 40,
          background: '#4A7C6A',
          border: 'none', borderRadius: 10,
          color: 'white', fontSize: 18,
          cursor: 'pointer', zIndex: 101,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {open ? '✕' : '☰'}
        </button>
      )}

      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: isMobile ? '240px' : (open ? '240px' : '64px'),
        background: '#4A7C6A',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 100,
        overflow: 'hidden',
        transform: isMobile && !open ? 'translateX(-100%)' : 'translateX(0)',
      }}>

        {/* 로고 */}
        <div onClick={()=>{setPage('dashboard'); if(isMobile) setOpen(false);}} style={{
          padding: '24px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0, cursor: 'pointer',
          marginTop: isMobile ? 0 : 0,
        }}>
          <div style={{
            fontSize: '2.6rem',
            fontFamily: "'Jua', sans-serif",
            fontWeight: 900,
            color: '#C4AD8C',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            벧엘수양원
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>BethelCare</div>
        </div>

        {/* 입소 현황 */}
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

        {/* 메뉴 */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          {MENU.map(m => {
            const isActive = page === m.id;
            return (
              <button key={m.id} onClick={() => handleMenuClick(m.id)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'flex-start',
                width: '100%',
                padding: '13px 20px',
                background: isActive ? 'rgba(196,173,140,0.14)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid #C4AD8C' : '2px solid transparent',
                color: isActive ? '#C4AD8C' : 'rgba(255,255,255,0.65)',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '400',
                fontFamily: "'DM Sans', 'Noto Sans KR', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '-0.01em',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: '15px' }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 역할 배지 */}
        <div style={{padding:'8px 20px 4px'}}>
          <span style={{fontSize:'0.7rem',background:roleColor,color:'white',padding:'2px 10px',borderRadius:20,fontWeight:600}}>
            {roleName}
          </span>
        </div>

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
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: '0.05em',
          transition: 'all 0.15s',
          flexShrink: 0,
          textAlign: 'center',
        }}>
          로그아웃
        </button>

        {/* 토글 버튼 (데스크탑만) */}
        {!isMobile && (
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
          }}>
            {open ? '← 접기' : '→'}
          </button>
        )}
      </aside>
    </>
  );
}
