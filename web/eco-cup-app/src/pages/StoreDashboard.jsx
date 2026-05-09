import { useState, useEffect } from 'react';
import { Store, Package, ArrowUpRight, ArrowDownLeft, LogOut, RefreshCw, PieChart, ChevronRight } from 'lucide-react';
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
      setTimeout(() => setLoading(false), 500);
    }
  };

  const SkeletonStat = () => (
    <div className="card" style={{ height: '120px' }}>
      <div className="skeleton" style={{ height: '14px', width: '50%', marginBottom: '12px' }}></div>
      <div className="skeleton" style={{ height: '32px', width: '40%', marginBottom: '8px' }}></div>
      <div className="skeleton" style={{ height: '12px', width: '60%' }}></div>
    </div>
  );

  return (
    <div className="content-area fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('store_backend')}</p>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{store.name}</h1>
        </div>
        <button onClick={onLogout} style={{ background: '#FEE2E2', border: 'none', color: '#991B1B', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
          <LogOut size={16} /> {t('logout')}
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      ) : (
        <>
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div className="card" style={{ padding: '24px', marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="var(--primary)" /> {t('in_stock')}
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.in_stock}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('cups_in_stock')}</div>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}>
                   <Package size={80} />
                </div>
              </div>

              <div className="card" style={{ padding: '24px', marginBottom: 0 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowUpRight size={16} color="var(--secondary)" /> {t('today_borrowed')}
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800 }}>{stats.today_borrowed}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('today_borrow_count')}</div>
              </div>

              <div className="card" style={{ padding: '24px', marginBottom: 0 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowDownLeft size={16} color="var(--success)" /> {t('today_returned')}
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800 }}>{stats.today_returned}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('today_return_count')}</div>
              </div>

              <div className="card" style={{ padding: '24px', background: '#FEF2F2', border: '1px solid #FEE2E2', marginBottom: 0 }}>
                <div style={{ color: '#991B1B', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>{t('overdue_unreturned')}</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#991B1B' }}>{stats.overdue_unreturned}</div>
                <div style={{ fontSize: '0.7rem', color: '#B91C1C', opacity: 0.8, marginTop: '4px' }}>{t('overdue_from_store')}</div>
              </div>
            </div>
          )}

          {/* Analysis Card */}
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('return_analysis')}</h2>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--accent)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                <PieChart size={20} color="var(--text)" />
              </div>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block' }}>杯子歸還分佈</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>從本店借出的杯子，最終還到了哪裡？</span>
              </div>
            </div>
            
            {destinations.destinations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {destinations.destinations.map((dest, i) => (
                  <div key={dest.store_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>
                      <span>{dest.store_name}</span>
                      <span style={{ color: 'var(--primary)' }}>{dest.percentage}%</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div 
                        className="fade-in"
                        style={{ 
                          width: `${dest.percentage}%`, height: '100%', 
                          background: `linear-gradient(90deg, var(--primary), var(--primary-light))`, 
                          borderRadius: '10px' 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <PieChart size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <div>{t('no_analysis_data')}</div>
              </div>
            )}
          </div>
        </>
      )}

      <button 
        onClick={fetchData}
        className="btn"
        style={{ width: '100%', marginTop: '32px', background: 'white', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> {t('refresh')}
      </button>

      <div style={{ marginTop: '48px', padding: '24px', background: 'rgba(0,0,0,0.02)', borderRadius: '20px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('contact_admin')}</p>
      </div>
    </div>
  );
}
