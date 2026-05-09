import { useState, useEffect } from 'react';
import { Shield, Users, Coffee, Store, AlertTriangle, LogOut, RefreshCw, Trophy, Medal, ClipboardList, Activity, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';

export default function AdminDashboard({ admin, onLogout }) {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [rankings, setRankings] = useState({ borrow_rankings: [], return_rankings: [] });
  const [overdueRecords, setOverdueRecords] = useState([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'logs'
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
      setTimeout(() => setLoading(false), 500);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/logs?limit=50`, { 
        headers: { 'Authorization': `Bearer ${admin.token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setActiveTab('logs');
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const fetchOverdueDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/overdue-records`, { 
        headers: { 'Authorization': `Bearer ${admin.token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setOverdueRecords(data.overdue_records);
        setShowOverdueModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch overdue details:", err);
    }
  };

  const toggleSuspension = async (userUuid, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const res = await fetch(`${API_BASE}/users/${userUuid}/suspend`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${admin.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_suspended: newStatus })
      });
      if (res.ok) {
        setOverdueRecords(prev => prev.map(r => r.user_uuid === userUuid ? { ...r, is_suspended: newStatus } : r));
      }
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  const SkeletonStat = () => (
    <div className="card" style={{ height: '80px' }}>
      <div className="skeleton" style={{ height: '14px', width: '50%', marginBottom: '8px' }}></div>
      <div className="skeleton" style={{ height: '24px', width: '70%' }}></div>
    </div>
  );

  return (
    <div className="content-area fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin_system')}</p>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '14px', display: 'flex' }}>
              <Shield size={24} />
            </div>
            {t('control_panel')}
          </h1>
        </div>
        <button onClick={onLogout} style={{ background: '#FEE2E2', border: 'none', color: '#991B1B', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
          <LogOut size={16} /> {t('logout')}
        </button>
      </header>

      {/* Modern Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '16px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', 
            background: activeTab === 'overview' ? 'white' : 'transparent', 
            color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)', 
            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: activeTab === 'overview' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <Activity size={18} /> {t('overview')}
        </button>
        <button 
          onClick={fetchLogs}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', 
            background: activeTab === 'logs' ? 'white' : 'transparent', 
            color: activeTab === 'logs' ? 'var(--primary)' : 'var(--text-muted)', 
            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: activeTab === 'logs' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <ClipboardList size={18} /> {t('system_logs')}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      ) : activeTab === 'overview' ? (
        <div className="fade-in">
          {/* Global Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Users size={14} /> {t('total_users')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats?.total_users || 0}</div>
            </div>
            <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Coffee size={14} /> {t('total_cups')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats?.total_cups || 0}</div>
            </div>
            <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>旅途中 / 休息中</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {stats?.cups_borrowed} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '1rem' }}>/ {stats?.cups_in_stock}</span>
              </div>
            </div>
            <div 
              className="card" 
              onClick={fetchOverdueDetails}
              style={{ padding: '20px', background: '#FEF2F2', border: '1px solid #FEE2E2', marginBottom: 0, cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ color: '#991B1B', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle size={14} /> {t('total_overdue')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {stats?.overdue_count || 0}
                <ChevronRight size={20} />
              </div>
            </div>
          </div>

          {/* Store Rankings */}
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('store_rankings')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px' }}>
                <Trophy size={18} /> {t('most_borrowed')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rankings.borrow_rankings.slice(0, 3).map((r, i) => (
                  <div key={r.store_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{r.store_name}</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px' }}>
                <Medal size={18} /> {t('most_returned')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rankings.return_rankings.slice(0, 3).map((r, i) => (
                  <div key={r.store_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{r.store_name}</span>
                    <span style={{ fontWeight: 800, color: 'var(--success)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Partner List */}
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('store_management')}</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ background: 'var(--background)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('store_name')}</th>
                  <th style={{ textAlign: 'center', padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('stock')}</th>
                  <th style={{ textAlign: 'center', padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.store_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.store_id}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '14px 20px', fontWeight: 800 }}>{s.cups_in_stock}</td>
                    <td style={{ textAlign: 'center', padding: '14px 20px' }}>
                      <span className="badge badge-success" style={{ padding: '4px 8px' }}>{t('normal')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Enhanced Logs Tab */
        <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', fontWeight: 800, fontSize: '1rem', background: 'var(--background)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <ClipboardList size={20} color="var(--primary)" />
             {t('latest_system_logs')}
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 20px', color: 'var(--text-muted)' }}>時間</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', color: 'var(--text-muted)' }}>事件內容</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      {new Date(log.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge" style={{ 
                          background: log.category === 'AUTH' ? '#E0F2FE' : log.category === 'BORROW' ? '#DCFCE7' : log.category === 'RETURN' ? '#FEF3C7' : '#F3F4F6',
                          color: log.category === 'AUTH' ? '#0369A1' : log.category === 'BORROW' ? '#166534' : log.category === 'RETURN' ? '#92400E' : '#374151',
                          fontSize: '0.65rem', padding: '2px 6px'
                        }}>
                          {log.category}
                        </span>
                        <span style={{ fontWeight: 700 }}>{log.event}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.details}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Modal with Life Style UI */}
      {showOverdueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(40, 54, 24, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0, border: 'none', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#991B1B', fontSize: '1.25rem' }}>{t('overdue_list')}</h3>
              <button onClick={() => setShowOverdueModal(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '20px' }}>
              {overdueRecords.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {overdueRecords.map((r) => (
                    <div key={r.serial_num} style={{ padding: '16px', background: 'var(--background)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{r.user_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user_email}</div>
                        </div>
                        <button 
                          onClick={() => toggleSuspension(r.user_uuid, r.is_suspended)}
                          className="btn"
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '10px', background: r.is_suspended === 1 ? 'var(--success)' : '#991B1B', color: 'white' }}
                        >
                          {r.is_suspended === 1 ? '解除停權' : '立即停權'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                         <span className="badge" style={{ background: 'white', border: '1px solid #E5E7EB', color: 'var(--text)' }}>杯號: {r.cup_id}</span>
                         <span className="badge" style={{ background: 'white', border: '1px solid #E5E7EB', color: 'var(--text)' }}>門市: {r.borrow_store_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>暫無逾期資料</div>
              )}
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowOverdueModal(false)}>我知道了</button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={activeTab === 'overview' ? fetchData : fetchLogs}
        className="btn"
        style={{ width: '100%', marginTop: '32px', background: 'white', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> {t('refresh_data')}
      </button>
    </div>
  );
}
