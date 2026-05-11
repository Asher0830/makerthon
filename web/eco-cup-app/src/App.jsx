import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StoreDashboard from './pages/StoreDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ScanHandler from './pages/ScanHandler';
import TreeRewardDashboard from './pages/TreeRewardDashboard';
import BountyBoard from './pages/BountyBoard';

function WelcomeModal({ onClose }) {
  const { t } = useI18n();
  return (
    <div className="modal-overlay fade-in" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', padding: '20px'
    }}>
      <div className="card slide-up" style={{ 
        maxWidth: '400px', width: '100%', padding: '32px', 
        textAlign: 'center', background: 'var(--surface)',
        border: '2px solid var(--primary)', borderRadius: '32px'
      }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '40px', 
          backgroundColor: '#ECFDF5', color: '#10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '40px'
        }}>
          🎁
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--primary)' }}>
          {t('welcome_gift_title') || '🎉 恭喜獲得新手大禮包！'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
          {t('welcome_gift_msg') || '測試期間，我們已為您的帳戶注入專屬獎勵，讓您的環保之旅有個完美的開始：'}
        </p>
        
        <div style={{ textAlign: 'left', background: 'rgba(96, 108, 56, 0.05)', padding: '16px', borderRadius: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>💰</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>1,000 小樹點</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>已存入帳戶，可用於兌換獎勵</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📜</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>隨機借杯足跡</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>已生成 5 筆隨機歷史借還紀錄</div>
            </div>
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', height: '54px', borderRadius: '16px' }}>
          {t('start_journey') || '開啟我的環保之旅'}
        </button>
      </div>
    </div>
  );
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { lang, toggleLang } = useI18n();

  useEffect(() => {
    const savedUser = localStorage.getItem('ecoCupUser');
    const savedStore = localStorage.getItem('ecoCupStore');
    const savedAdmin = localStorage.getItem('ecoCupAdmin');
    const savedTheme = localStorage.getItem('ecoCupTheme');
    
    try {
      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedStore) setStore(JSON.parse(savedStore));
      if (savedAdmin) setAdmin(JSON.parse(savedAdmin));
    } catch (e) {
      console.error("Parse error", e);
    }
    
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
      if (data.is_new_user) {
        setShowWelcome(true);
      }
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
        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
        
        {/* Global Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0', gap: '10px' }}>
          <button
            onClick={toggleLang}
            style={{ 
              background: 'var(--surface)', border: '1px solid rgba(128,128,128,0.2)', 
              color: 'var(--text)', padding: '6px 12px', borderRadius: '12px', 
              fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
            }}
          >
            {lang === 'zh-TW' ? 'EN' : '繁中'}
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{ 
              background: 'var(--surface)', border: '1px solid rgba(128,128,128,0.2)', 
              color: 'var(--text)', padding: '6px 12px', borderRadius: '12px', 
              fontSize: '0.75rem', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={(data) => handleLogin('user', data)} />} 
          />
          <Route path="/tree" element={<TreeRewardDashboard />} />
          <Route path="/bounty" element={<BountyBoard />} />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} onLogout={() => handleLogout('user')} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store/*" 
            element={store ? <StoreDashboard store={store} onLogout={() => handleLogout('store')} /> : <Navigate to="/store/login" />} 
          />
          
          {/* Scan Route */}
          <Route path="/scan" element={<ScanHandler user={user} />} />
          <Route path="/scan/:id" element={<ScanHandler user={user} />} />

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
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
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
