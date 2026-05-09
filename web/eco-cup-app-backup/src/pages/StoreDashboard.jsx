import { useState, useEffect } from 'react';
import { Store, Package, ArrowUpRight, ArrowDownLeft, LogOut, RefreshCw, PieChart } from 'lucide-react';
import { useI18n } from '../i18n';

export default function StoreDashboard({ store, onLogout }) {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [destinations, setDestinations] = useState({ total: 0, destinations: [] });
  const [loading, setLoading] = useState(true);
  const API_BASE = '/api/store';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, destRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers: { 'Authorization': `Bearer ${store.token}` } }),
        fetch(`${API_BASE}/analytics/return-destinations`, { headers: { 'Authorization': `Bearer ${store.token}` } })
      ]);
      
      if (dashRes.ok) setStats(await dashRes.json());
      if (destRes.ok) setDestinations(await destRes.json());
    } catch (err) {
      console.error("Failed to fetch store dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for simple colors
  const colors = ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="content-area">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('store_backend')}</p>
          <h1 style={{ margin: 0 }}>{store.name}</h1>
        </div>
        <button onClick={onLogout} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <LogOut size={16} /> {t('logout')}
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('loading')}</div>
      ) : (
        <>
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={16} /> {t('in_stock')}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{stats.in_stock}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('cups_in_stock')}</div>
              </div>

              <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUpRight size={16} color="var(--danger)" /> {t('today_borrowed')}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.today_borrowed}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('today_borrow_count')}</div>
              </div>

              <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowDownLeft size={16} color="var(--success)" /> {t('today_returned')}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.today_returned}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('today_return_count')}</div>
              </div>

              <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)', marginBottom: 0 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>{t('overdue_unreturned')}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{stats.overdue_unreturned}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('overdue_from_store')}</div>
              </div>
            </div>
          )}

          {/* Return Destinations Analysis */}
          <h2>{t('return_analysis')}</h2>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <PieChart size={18} />
              <span style={{ fontSize: '0.875rem' }}>本店借出之杯子歸還分佈 (共 {destinations.total} 筆)</span>
            </div>
            
            {destinations.destinations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {destinations.destinations.map((dest, i) => (
                  <div key={dest.store_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 500 }}>{dest.store_name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{dest.percentage}% ({dest.count})</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${dest.percentage}%`, height: '100%', background: colors[i % colors.length], borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t('no_analysis_data')}
              </div>
            )}
          </div>
        </>
      )}

      <button 
        onClick={fetchData}
        className="btn"
        style={{ width: '100%', marginTop: '16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> {t('refresh')}
      </button>

      <div style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <p>{t('contact_admin')}</p>
      </div>
    </div>
  );
}
