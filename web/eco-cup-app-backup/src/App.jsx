import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StoreDashboard from './pages/StoreDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore sessions from local storage
    const savedUser = localStorage.getItem('ecoCupUser');
    const savedStore = localStorage.getItem('ecoCupStore');
    const savedAdmin = localStorage.getItem('ecoCupAdmin');
    
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedStore) setStore(JSON.parse(savedStore));
    if (savedAdmin) setAdmin(JSON.parse(savedAdmin));
    
    setLoading(false);
  }, []);

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
        <Routes>
          {/* --- Customer Routes --- */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login type="user" onLogin={(d) => handleLogin('user', d)} />} 
          />
          <Route 
            path="/" 
            element={user ? <Dashboard user={user} onLogout={() => handleLogout('user')} /> : <Navigate to="/login" />} 
          />

          {/* --- Store Admin Routes --- */}
          <Route 
            path="/store/login" 
            element={store ? <Navigate to="/store" /> : <Login type="store" onLogin={(d) => handleLogin('store', d)} />} 
          />
          <Route 
            path="/store" 
            element={store ? <StoreDashboard store={store} onLogout={() => handleLogout('store')} /> : <Navigate to="/store/login" />} 
          />

          {/* --- Super Admin Routes --- */}
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
