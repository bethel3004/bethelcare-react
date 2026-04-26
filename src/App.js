import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import BpSugar from './pages/BpSugar';
import Inbody from './pages/Inbody';
import Consult from './pages/Consult';
import Groups from './pages/Groups';
import Stats from './pages/Stats';
import { SAMPLE_PATIENTS, SAMPLE_BP, SAMPLE_INBODY, SAMPLE_CONSULTS, SAMPLE_GROUPS } from './utils/sampleData';
import Login from './components/Login';
import { useSheets } from './hooks/useSheets';
import './App.css';

export default function App() {
  const [auth, setAuth] = useState(
    sessionStorage.getItem('bethelcare_auth') === 'true'
  );
  const [page, setPage] = useState('dashboard');
  const sheetsData = useSheets();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patients,  setPatients]  = useState(SAMPLE_PATIENTS);
  // 구글 시트 데이터 로드되면 교체
  useEffect(() => {
    if (sheetsData.patients) setPatients(sheetsData.patients);
    if (sheetsData.inbody)   setInbody(sheetsData.inbody);
    if (sheetsData.consults) setConsults(sheetsData.consults);
  }, [sheetsData.patients, sheetsData.inbody, sheetsData.consults]);
  const [bp,        setBp]        = useState(SAMPLE_BP);
  const [inbody,    setInbody]    = useState(SAMPLE_INBODY);
  const [consults,  setConsults]  = useState(SAMPLE_CONSULTS);
  const [groups,    setGroups]    = useState(SAMPLE_GROUPS);

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

  if (sheetsData.loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F5F2EE',flexDirection:'column',gap:16}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',color:'#2C2118',fontStyle:'italic'}}>벧엘수양원</div>
      <div style={{fontSize:'0.85rem',color:'#A89E94',letterSpacing:'0.05em'}}>데이터 불러오는 중...</div>
    </div>
  );

  return (
    <div className="app-root">
      <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} db={db} />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="page-wrapper">
          {pages[page] || pages.dashboard}
        </div>
      </main>
    </div>
  );
}
