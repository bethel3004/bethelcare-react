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
    const hash = window.location.hash.replace('#', '').split('?')[0];
    const valid = ['dashboard','patients','bp_sugar','inbody','consult','groups','stats'];
    return valid.includes(hash) ? hash : 'dashboard';
  };
  const [page, setPageState] = useState(getPageFromUrl);

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

  const GUEST_CAMPS = ['부산동래교회', '부산중앙교회'];

  const visiblePatients = isCampGuest
    ? patients.filter(p => (p.캠프장소 || '').trim() === currentCamp.trim())
    : isGuest
      ? patients.filter(p => GUEST_CAMPS.includes((p.캠프장소 || '').trim()))
      : patients;

  const campNames = isCampGuest
    ? new Set(visiblePatients.map(p => (p.성명 || '').trim()))
    : null;

  // 캠프장소 기준 필터 (혈당혈압 시트에도 캠프장소 열 추가됨)
  const filterByCamp = arr => {
    if (isCampGuest && campNames) {
      return arr.filter(r => campNames.has((r.성명 || '').trim()));
    }
    if (isGuest) {
      return arr.filter(r => GUEST_CAMPS.includes((r.캠프장소 || '').trim()));
    }
    return arr;
  };

  const db = {
    role, isGuest, isCampGuest, currentCamp,
    patients: visiblePatients, setPatients,
    bp: filterByCamp(bp), setBp,
    inbody: filterByCamp(inbody), setInbody,
    consults: filterByCamp(consults), setConsults,
    groups, setGroups,
    reloadSheets
  };

  // ★ 게스트는 bp_sugar, inbody만 허용 — 그 외 접근 시 bp_sugar로 이동
  const GUEST_ALLOWED = ['bp_sugar', 'inbody'];
  const safePage = (isGuest && !GUEST_ALLOWED.includes(page)) ? 'bp_sugar' : page;

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
          {pages[safePage] || pages.dashboard}
        </div>
      </main>
    </div>
  );
}
