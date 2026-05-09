import { useState, useEffect } from 'react';
import { Shield, Users, Coffee, Store, AlertTriangle, LogOut, RefreshCw, Trophy, Medal } from 'lucide-react';
import { useI18n } from '../i18n';

export default function AdminDashboard({ admin, onLogout }) {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [rankings, setRankings] = useState({ borrow_rankings: [], return_rankings: [] });
  const [loading, setLoading] = useState(true);
  
  const API_BASE = '/api/admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, storesRes, rankRes] = await Promise.all([
        fetch(`${API_BASE}/stats/global`, { headers: { 'Authorization': `Bearer ${admin.token}` } }),
        fetch(`${API_BASE}/stores`, { headers: { 'Authorization': `Bearer ${admin.token}` } }),
        fetch(`${API_BASE}/stats/store-rankings`, { headers: { 'Authorization': `Bearer ${admin.token}` } })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (storesRes.ok) setStores(await storesRes.json());
      if (rankRes.ok) setRankings(await rankRes.json());
      
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
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('admin_system')}</p>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield color="var(--primary)" /> {t('control_panel')}
          </h1>
        </div>
        <button onClick={onLogout} style={{ background: '#374151', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <LogOut size={16} /> {t('logout')}
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('loading')}</div>
      ) : (
        <>
          {/* Global Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> {t('total_users')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_users || 0}</div>
            </div>
            <div className="card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Coffee size={14} /> {t('total_cups')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_cups || 0}</div>
            </div>
            <div className="card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t('in_circulation')}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats?.cups_borrowed} / {stats?.cups_in_stock}</div>
            </div>
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--danger)', marginBottom: 0 }}>
              <div style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> {t('total_overdue')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{stats?.overdue_count || 0}</div>
            </div>
          </div>

          {/* Store Rankings */}
          <h2>{t('store_rankings')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px' }}>
                <Trophy size={16} /> {t('most_borrowed')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rankings.borrow_rankings.slice(0, 3).map((r, i) => (
                  <div key={r.store_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{i+1}</span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{r.store_name}</span>
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px' }}>
                <Medal size={16} /> {t('most_returned')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rankings.return_rankings.slice(0, 3).map((r, i) => (
                  <div key={r.store_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{i+1}</span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{r.store_name}</span>
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Store List */}
          <h2>{t('store_management')}</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ background: 'var(--surface-hover)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>{t('store_name')}</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>{t('stock')}</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.store_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.store_id}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600 }}>{s.cups_in_stock}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <span className="badge badge-success">{t('normal')}</span>
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
        style={{ width: '100%', marginTop: '24px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> {t('refresh_data')}
      </button>
    </div>
  );
}
