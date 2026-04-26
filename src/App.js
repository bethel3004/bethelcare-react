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
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 로컬 상태 (샘플 데이터로 초기화)
  const [patients,  setPatients]  = useState(SAMPLE_PATIENTS);
  const [bp,        setBp]        = useState(SAMPLE_BP);
  const [inbody,    setInbody]    = useState(SAMPLE_INBODY);
  const [consults,  setConsults]  = useState(SAMPLE_CONSULTS);
  const [groups,    setGroups]    = useState(SAMPLE_GROUPS);

  // 구글 시트 연동
  const sheets = useSheets();

  useEffect(() => {
    if (sheets.patients && sheets.patients.length > 0) {
      console.log('[App] 구글 시트 입소자 데이터 적용:', sheets.patients.length, '명');
      setPatients(sheets.patients);
    }
  }, [sheets.patients]);

  useEffect(() => {
    if (sheets.inbody && sheets.inbody.length > 0) {
      setInbody(sheets.inbody);
    }
  }, [sheets.inbody]);

  useEffect(() => {
    if (sheets.consults && sheets.consults.length > 0) {
      setConsults(sheets.consults);
    }
  }, [sheets.consults]);

  const db = { patients, setPatients, bp, setBp, inbody, setInbody, consults, setConsults, groups, setGroups };

  const pages = {
    dashboard: <Dashboard db={db} setPage={setPage} />,
    patients:  <Patients  db={db} />,
    bp_sugar:  <BpSugar   db={db} />,
    inbody:    <Inbody    db={db} />,
    consult:   <Consult   db={db} />,
    groups:    <Groups    db={db} />,
    stats:     <Stats     db={db} />,
  };

  if (!auth) return <Login onLogin={() => setAuth(true)} />;

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
