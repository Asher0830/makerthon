import { useState, useEffect } from 'react';
import { Store, Package, ArrowUpRight, ArrowDownLeft, LogOut, RefreshCw } from 'lucide-react';

export default function StoreDashboard({ store, onLogout }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = '/api/store';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dashboard`, {
        headers: { 'Authorization': `Bearer ${store.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch store dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>店家後台</p>
          <h1 style={{ margin: 0 }}>{store.name}</h1>
        </div>
        <button onClick={onLogout} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <LogOut size={16} /> 登出
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>載入中...</div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Package size={16} /> 目前庫存
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{stats.in_stock}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>在庫杯數</div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={16} color="var(--danger)" /> 今日借出
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.today_borrowed}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>本日租借次數</div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDownLeft size={16} color="var(--success)" /> 今日歸還
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.today_returned}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>本日回收次數</div>
          </div>

          <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>逾期未還</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{stats.overdue_unreturned}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>本店借出之逾期杯</div>
          </div>

        </div>
      ) : null}

      <button 
        onClick={fetchData}
        className="btn"
        style={{ width: '100%', marginTop: '24px', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> 重新整理
      </button>

      <div style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <p>如需調整庫存或報修掃杯器，請聯繫超級管理員。</p>
      </div>
    </div>
  );
}
