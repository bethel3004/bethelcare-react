import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import BpSugar from './pages/BpSugar';
import Inbody from './pages/Inbody';
import Consult from './pages/Consult';
import Groups from './pages/Groups';
import Stats from './pages/Stats';
import Login from './components/Login';
import { useSheets } from './hooks/useSheets';
import { SAMPLE_PATIENTS, SAMPLE_BP, SAMPLE_INBODY, SAMPLE_CONSULTS, SAMPLE_GROUPS } from './utils/sampleData';
import './App.css';

export default function App() {
  const [auth, setAuth] = useState(
    sessionStorage.getItem('bethelcare_auth') === 'true'
  );
  const [role, setRole] = useState(
    sessionStorage.getItem('bethelcare_role') || 'admin'
  );
  const currentCamp = sessionStorage.getItem('bethelcare_camp') || '';
  const getPageFromUrl = () => {
    // ?파라미터 제거 후 페이지명만 추출 (예: #bp_sugar?status=입소중 → bp_sugar)
    const hash = window.location.hash.replace('#', '').split('?')[0];
    const valid = ['dashboard','patients','bp_sugar','inbody','consult','groups','stats'];
    return valid.includes(hash) ? hash : 'dashboard';
  };
  const [page, setPageState] = useState(getPageFromUrl);

  // URL ↔ page 양방향 연동
  const setPage = (p) => {
    setPageState(p);
    window.location.hash = p;
  };

  useEffect(() => {
    const onPopState = () => setPageState(getPageFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [patients,  setPatients]  = useState(SAMPLE_PATIENTS);
  const [bp,        setBp]        = useState(SAMPLE_BP);
  const [inbody,    setInbody]    = useState(SAMPLE_INBODY);
  const [consults,  setConsults]  = useState(SAMPLE_CONSULTS);
  const [groups,    setGroups]    = useState(SAMPLE_GROUPS);

  const sheets = useSheets();
  const reloadSheets = sheets.reload;

  // 구글 시트 데이터는 최초 1회만 적용 (이후 자동 갱신이 로컬 편집을 덮어쓰지 않도록)
  const initialLoadDone = React.useRef({ patients: false, inbody: false, consults: false, bp: false, groups: false });

  useEffect(() => {
    if (!initialLoadDone.current.patients && sheets.patients && sheets.patients.length > 0) {
      console.log('[App] 구글 시트 입소자 데이터 적용:', sheets.patients.length, '명');
      setPatients(sheets.patients);
      initialLoadDone.current.patients = true;
    }
  }, [sheets.patients]);

  useEffect(() => {
    if (!initialLoadDone.current.inbody && sheets.inbody && sheets.inbody.length > 0) {
      setInbody(sheets.inbody);
      initialLoadDone.current.inbody = true;
    }
  }, [sheets.inbody]);

  useEffect(() => {
    if (!initialLoadDone.current.consults && sheets.consults && sheets.consults.length > 0) {
      setConsults(sheets.consults);
      initialLoadDone.current.consults = true;
    }
  }, [sheets.consults]);

  useEffect(() => {
    if (!initialLoadDone.current.bp && sheets.bp && sheets.bp.length > 0) {
      setBp(sheets.bp);
      initialLoadDone.current.bp = true;
    }
  }, [sheets.bp]);

  useEffect(() => {
    if (!initialLoadDone.current.groups && sheets.groups !== null && sheets.groups !== undefined) {
      console.log('[App] 구글 시트 기수행사 데이터 적용:', sheets.groups.length, '건');
      setGroups(sheets.groups);
      initialLoadDone.current.groups = true;
    }
  }, [sheets.groups]);

  if (!auth) return <Login onLogin={(r) => {
    sessionStorage.setItem('bethelcare_role', r || 'admin');
    sessionStorage.setItem('bethelcare_auth', 'true');
    window.location.reload();
  }} />;

  const isGuest = role === 'guest' || role === 'campGuest';
  const isCampGuest = role === 'campGuest';

  // 캠프 게스트: 해당 캠프 환자 데이터만 필터링
  const visiblePatients = isCampGuest
    ? patients.filter(p => (p.캠프장소 || '').trim() === currentCamp.trim())
    : patients;
  const campNames = isCampGuest
    ? new Set(visiblePatients.map(p => (p.성명 || '').trim()))
    : null;
  const filterByCamp = arr => (isCampGuest && campNames)
    ? arr.filter(r => {
        const name = (r.성명 || '').trim();
        return campNames.has(name);
      })
    : arr;

  const db = {
    role, isGuest, isCampGuest, currentCamp,
    patients: visiblePatients, setPatients,
    bp: filterByCamp(bp), setBp,
    inbody: filterByCamp(inbody), setInbody,
    consults: filterByCamp(consults), setConsults,
    groups, setGroups,
    reloadSheets
  };

  const pages = {
    dashboard: <Dashboard db={db} setPage={setPage} />,
    patients:  <Patients  db={db} />,
    bp_sugar:  <BpSugar   db={db} />,
    inbody:    <Inbody    db={db} />,
    consult:   <Consult   db={db} />,
    groups:    <Groups    db={db} />,
    stats:     <Stats     db={db} />,
  };

  return (
    <div className="app-root">
      {sheets.error && (
        <div style={{
          position:'fixed', top:0, left:0, right:0,
          background:'#9B4444', color:'white',
          padding:'8px 16px', fontSize:'12px',
          textAlign:'center', zIndex:999
        }}>
          ⚠ 구글 시트 연결 실패 — 샘플 데이터 표시 중
        </div>
      )}
      <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} db={db} />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="page-wrapper">
          {pages[page] || pages.dashboard}
        </div>
      </main>
    </div>
  );
}
