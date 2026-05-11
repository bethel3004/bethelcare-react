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

function useBreakpoint() {
  const getBreakpoint = () => {
    if (window.innerWidth < 768) return 'mobile';
    if (window.innerWidth < 1024) return 'tablet';
    return 'desktop';
  };
  const [bp, setBp] = useState(getBreakpoint());
  useEffect(() => {
    const handler = () => setBp(getBreakpoint());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return bp;
}

export default function Sidebar({ page, setPage, open, setOpen, db }) {
  const active = db.patients.filter(p => p.상태 === '입소중').length;
  const total  = db.patients.length;
  const role = db.role || 'admin';
  const roleName = role === 'admin' ? '관리자'
    : role === 'staff' ? 'STAFF'
    : role === 'campGuest' ? (db.currentCamp || '캠프')
    : '게스트';
  const roleColor = role === 'guest' ? '#8A6B4A'
    : role === 'staff' ? '#4A6B8A'
    : role === 'campGuest' ? '#6B4A8A'
    : '#5C7A5F';
  const bp = useBreakpoint();

  // 모바일: 기본 닫힘, 태블릿: 항상 아이콘만, 데스크탑: open 상태 유지
  useEffect(() => {
    if (bp === 'mobile') setOpen(false);
    if (bp === 'tablet') setOpen(true);
    if (bp === 'desktop') setOpen(true);
  }, [bp]);

  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  // 사이드바 너비 결정
  const sidebarWidth = isMobile ? '200px' : (open ? '200px' : '64px');
  const showLabel = isMobile ? true : open;
  const transform = isMobile && !open ? 'translateX(-100%)' : 'translateX(0)';

  const handleMenuClick = (id) => {
    setPage(id);
    if (isMobile) setOpen(false);
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isMobile && open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 99,
        }}/>
      )}

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
        width: sidebarWidth,
        background: '#4A7C6A',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.3s ease, width 0.3s ease',
        zIndex: 100,
        overflow: 'hidden',
        transform,
      }}>

        {/* 로고 */}
        <div onClick={() => { setPage('dashboard'); if (isMobile) setOpen(false); }}
          style={{
            padding: showLabel ? '24px 20px 16px' : '20px 0',
            textAlign: showLabel ? 'left' : 'center',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0, cursor: 'pointer',
          }}>
          <div style={{
            fontSize: showLabel ? '1.3rem' : '0.7rem',
            fontFamily: "'Jua', sans-serif",
            fontWeight: 900,
            color: '#C4AD8C',
            lineHeight: 1.2,
          }}>
            {showLabel ? '벧엘수양원' : '벧'}
          </div>
          {showLabel && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>BethelCare</div>}
        </div>

        {/* 입소 현황 - 라벨 있을 때만 */}
        {showLabel && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
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
              <button key={m.id} onClick={() => handleMenuClick(m.id)} title={m.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: showLabel ? '12px' : '0',
                justifyContent: showLabel ? 'flex-start' : 'center',
                width: '100%',
                padding: showLabel ? '13px 20px' : '15px 0',
                background: isActive ? 'rgba(196,173,140,0.14)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid #C4AD8C' : '2px solid transparent',
                color: isActive ? '#C4AD8C' : 'rgba(255,255,255,0.65)',
                fontSize: showLabel ? '13px' : '18px',
                fontWeight: isActive ? '600' : '400',
                fontFamily: "'DM Sans', 'Noto Sans KR', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}>
                <span>{m.icon}</span>
                {showLabel && <span>{m.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 역할 배지 */}
        {showLabel && (
          <div style={{ padding: '8px 20px 4px' }}>
            <span style={{ fontSize: '0.7rem', background: roleColor, color: 'white', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
              {roleName}
            </span>
          </div>
        )}

        {/* 로그아웃 */}
        <button onClick={() => {
          sessionStorage.removeItem('bethelcare_auth');
          sessionStorage.removeItem('bethelcare_role');
            sessionStorage.removeItem('bethelcare_camp');
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
          transition: 'all 0.15s',
          flexShrink: 0,
          textAlign: 'center',
        }}>
          {showLabel ? '로그아웃' : '↩'}
        </button>

        {/* 데스크탑 토글 버튼 */}
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
