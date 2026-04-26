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
import './App.css';

export default function App() {
  const [auth, setAuth] = useState(
    sessionStorage.getItem('bethelcare_auth') === 'true'
  );
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patients,  setPatients]  = useState(SAMPLE_PATIENTS);
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
