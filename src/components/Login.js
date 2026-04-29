import React, { useState } from 'react';

// 계정 설정 - 여기서 비밀번호 관리
const ACCOUNTS = [
  { id: 'admin',  pw: '@Matthew33',  role: 'admin',  name: '관리자' },
  { id: 'staff',  pw: 'Bethel3004',  role: 'staff',  name: 'STAFF' },
  { id: 'guest',  pw: 'guest0000',   role: 'guest',  name: '게스트' },
];

export default function Login({ onLogin }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const account = ACCOUNTS.find(a => a.pw === pw);
    if (account) {
      sessionStorage.setItem('bethelcare_auth', 'true');
      sessionStorage.setItem('bethelcare_role', account.role);
      sessionStorage.setItem('bethelcare_name', account.name);
      onLogin(account.role);
    } else {
      setError(true);
      setShake(true);
      setPw('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F2EE',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', 'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        padding: '0 24px',
        animation: shake ? 'shake 0.4s ease' : 'fadeUp 0.4s ease',
      }}>
        <style>{`
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(16px); }
            to   { opacity:1; transform:translateY(0); }
          }
          @keyframes shake {
            0%,100% { transform:translateX(0); }
            20%     { transform:translateX(-8px); }
            40%     { transform:translateX(8px); }
            60%     { transform:translateX(-5px); }
            80%     { transform:translateX(5px); }
          }
        `}</style>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '2.2rem',
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#2C2118',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}>
            벧엘수양원
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: '#A89E94',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}>
            BethelCare · 관리시스템
          </div>
        </div>

        <div style={{
          background: '#FDFCFA',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          padding: '32px 28px',
        }}>
          <div style={{
            fontSize: '0.8rem',
            color: '#6B6259',
            marginBottom: 20,
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            비밀번호를 입력하세요
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(false); }}
                placeholder="비밀번호"
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: `1.5px solid ${error ? '#9B4444' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#1E1A16',
                  background: error ? '#FAF0F0' : 'white',
                  outline: 'none',
                  transition: 'all 0.2s',
                  letterSpacing: '0.05em',
                }}
              />
              {error && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#9B4444',
                  marginTop: 6,
                  textAlign: 'center',
                }}>
                  비밀번호가 올바르지 않습니다
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '11px',
                background: '#5C7A5F',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = '#4A6650'}
              onMouseLeave={e => e.target.style.background = '#5C7A5F'}
            >
              로그인
            </button>
          </form>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: '0.72rem',
          color: '#C4BAB0',
          letterSpacing: '0.03em',
        }}>
          경남 하동군 고전면 황시골길 160-22
        </div>
      </div>
    </div>
  );
}
