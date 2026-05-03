import React, { useState, useEffect, useRef } from 'react';
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
  const getPageFromUrl = () => {
    const hash = window.location.hash.replace('#', '');
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

  const sheetsInitialized = useRef({
    patients: false, bp: false, inbody: false, consults: false, groups: false,
  });

  const sheets = useSheets();
  const reloadSheets = sheets.reload;

  useEffect(() => {
    if (!sheetsInitialized.current.patients && sheets.patients && sheets.patients.length > 0) {
      sheetsInitialized.current.patients = true;
      setPatients(sheets.patients);
    }
  }, [sheets.patients]);

  useEffect(() => {
    if (!sheetsInitialized.current.bp && sheets.bp && sheets.bp.length > 0) {
      sheetsInitialized.current.bp = true;
      setBp(sheets.bp);
    }
  }, [sheets.bp]);

  useEffect(() => {
    if (!sheetsInitialized.current.inbody && sheets.inbody && sheets.inbody.length > 0) {
      sheetsInitialized.current.inbody = true;
      setInbody(sheets.inbody);
    }
  }, [sheets.inbody]);

  useEffect(() => {
    if (!sheetsInitialized.current.consults && sheets.consults && sheets.consults.length > 0) {
      sheetsInitialized.current.consults = true;
      setConsults(sheets.consults);
    }
  }, [sheets.consults]);

  useEffect(() => {
    if (!sheetsInitialized.current.groups && sheets.groups !== null && sheets.groups !== undefined) {
      sheetsInitialized.current.groups = true;
      setGroups(sheets.groups);
    }
  }, [sheets.groups]);

  if (!auth) return <Login onLogin={(r) => {
    sessionStorage.setItem('bethelcare_role', r || 'admin');
    sessionStorage.setItem('bethelcare_auth', 'true');
    window.location.reload();
  }} />;

  const isGuest = role === 'guest';
  const db = { role, isGuest, patients, setPatients, bp, setBp, inbody, setInbody, consults, setConsults, groups, setGroups, reloadSheets };

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
