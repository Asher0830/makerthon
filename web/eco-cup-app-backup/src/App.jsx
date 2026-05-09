import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StoreDashboard from './pages/StoreDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ScanHandler from './pages/ScanHandler';

function AppInner() {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { lang, toggleLang } = useI18n();

  useEffect(() => {
    const savedUser = localStorage.getItem('ecoCupUser');
    const savedStore = localStorage.getItem('ecoCupStore');
    const savedAdmin = localStorage.getItem('ecoCupAdmin');
    const savedTheme = localStorage.getItem('ecoCupTheme');
    
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedStore) setStore(JSON.parse(savedStore));
    if (savedAdmin) setAdmin(JSON.parse(savedAdmin));
    if (savedTheme === 'dark') setDarkMode(true);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('ecoCupTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogin = (type, data) => {
    if (type === 'user') {
      localStorage.setItem('ecoCupUser', JSON.stringify(data));
      setUser(data);
    } else if (type === 'store') {
      localStorage.setItem('ecoCupStore', JSON.stringify(data));
      setStore(data);
    } else if (type === 'admin') {
      localStorage.setItem('ecoCupAdmin', JSON.stringify(data));
      setAdmin(data);
    }
  };

  const handleLogout = (type) => {
    if (type === 'user') {
      localStorage.removeItem('ecoCupUser');
      setUser(null);
    } else if (type === 'store') {
      localStorage.removeItem('ecoCupStore');
      setStore(null);
    } else if (type === 'admin') {
      localStorage.removeItem('ecoCupAdmin');
      setAdmin(null);
    }
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Top-right controls */}
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, display: 'flex', gap: '8px' }}>
          <button
            className="theme-toggle"
            onClick={toggleLang}
            style={{ position: 'static', fontSize: '0.7rem', fontWeight: 700 }}
          >
            {lang === 'zh-TW' ? 'EN' : '中'}
          </button>
          <button 
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
            style={{ position: 'static' }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <Routes>
          <Route 
            path="/login" 
            element={user ? (
              sessionStorage.getItem('pendingScan') 
                ? <Navigate to={`/scan?scanner_id=${JSON.parse(sessionStorage.getItem('pendingScan')).scanner_id}&store_id=${JSON.parse(sessionStorage.getItem('pendingScan')).store_id}`} />
                : <Navigate to="/" />
            ) : <Login type="user" onLogin={(d) => handleLogin('user', d)} />} 
          />
          <Route 
            path="/" 
            element={user ? <Dashboard user={user} onLogout={() => handleLogout('user')} /> : <Navigate to="/login" />} 
          />
          
          {/* Scan Route for external QR scanners */}
          <Route path="/scan" element={<ScanHandler user={user} />} />

          <Route 
            path="/store/login" 
            element={store ? <Navigate to="/store" /> : <Login type="store" onLogin={(d) => handleLogin('store', d)} />} 
          />
          <Route 
            path="/store" 
            element={store ? <StoreDashboard store={store} onLogout={() => handleLogout('store')} /> : <Navigate to="/store/login" />} 
          />
          <Route 
            path="/admin/login" 
            element={admin ? <Navigate to="/admin" /> : <Login type="admin" onLogin={(d) => handleLogin('admin', d)} />} 
          />
          <Route 
            path="/admin" 
            element={admin ? <AdminDashboard admin={admin} onLogout={() => handleLogout('admin')} /> : <Navigate to="/admin/login" />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
