import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Students from './components/Students';
import Grades from './components/Grades';
import Activities from './components/Activities';
import Attendance from './components/Attendance';
import Settings from './components/Settings';
import NotificationBell from './components/NotificationBell';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [schoolYear, setSchoolYear] = useState('Loading...');

  useEffect(() => {
    const originalFetch = window.fetch;
    let isRedirecting = false; 
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 && !args[0].includes('/api/token/')) {
        if (!isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/'; 
        }
        return new Promise(() => {}); 
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('http://127.0.0.1:8000/api/accounts/settings/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.active_school_year) setSchoolYear(data.active_school_year);
      })
      .catch(() => setSchoolYear('Error fetching S.Y.'));
    }

    const handleSyUpdate = (e) => setSchoolYear(e.detail);
    window.addEventListener('schoolYearUpdated', handleSyUpdate);
    
    return () => window.removeEventListener('schoolYearUpdated', handleSyUpdate);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard />;
      case 'Profile': return <Profile />;
      case 'Students': return <Students />;
      case 'Grades': return <Grades />;
      case 'Activities': return <Activities />;
      case 'Attendance': return <Attendance />;
      case 'Settings': return <Settings />;
      default:
        return (
          <div className="mt-8">
            <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">{activeTab}</h1>
            <p className="text-gray-500 mt-2">The {activeTab} content will be built here next!</p>
          </div>
        );
    }
  };

  const token = localStorage.getItem('auth_token');
  if (!token) { return <Login />; }

  return (
    <div className="flex h-screen bg-[#FCFBF8] font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <header className="flex justify-end items-center px-10 py-6 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="px-4 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium transition-all">
              {schoolYear}
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-10 pb-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;