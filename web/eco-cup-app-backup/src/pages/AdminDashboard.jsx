import { useState, useEffect } from 'react';
import { Shield, Users, Coffee, Store, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

export default function AdminDashboard({ admin, onLogout }) {
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const API_BASE = '/api/admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, storesRes] = await Promise.all([
        fetch(`${API_BASE}/stats/global`, { headers: { 'Authorization': `Bearer ${admin.token}` } }),
        fetch(`${API_BASE}/stores`, { headers: { 'Authorization': `Bearer ${admin.token}` } })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (storesRes.ok) setStores(await storesRes.json());
      
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>系統管理員</p>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield color="var(--primary)" /> 總控制台
          </h1>
        </div>
        <button onClick={onLogout} style={{ background: '#374151', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <LogOut size={16} /> 登出
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>載入中...</div>
      ) : (
        <>
          {/* Global Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> 總使用者</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_users || 0}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Coffee size={14} /> 總杯數</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_cups || 0}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>流通中 / 在庫</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats?.cups_borrowed} / {stats?.cups_in_stock}</div>
            </div>
            <div className="card" style={{ padding: '16px', background: '#fef2f2' }}>
              <div style={{ color: '#ef4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> 逾期總數</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{stats?.overdue_count || 0}</div>
            </div>
          </div>

          {/* Store List */}
          <h2>合作店家管理</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>店家名稱</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>庫存</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>狀態</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.store_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.store_id}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>{s.cups_in_stock}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <span className="badge badge-success">正常</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <button 
        onClick={fetchData}
        className="btn"
        style={{ width: '100%', marginTop: '24px', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> 刷新數據
      </button>
    </div>
  );
}
