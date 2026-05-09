import { useState, useEffect } from 'react';
import { Shield, Users, Coffee, Store, AlertTriangle, LogOut, RefreshCw, Trophy, Medal, ClipboardList, Activity } from 'lucide-react';
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
      setLoading(false);
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
      setLoading(false);
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--surface-hover)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ background: 'none', border: 'none', color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
        >
          <Activity size={18} /> {t('overview')}
        </button>
        <button 
          onClick={fetchLogs}
          style={{ background: 'none', border: 'none', color: activeTab === 'logs' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
        >
          <ClipboardList size={18} /> {t('system_logs')}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('loading')}</div>
      ) : activeTab === 'overview' ? (
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
            <div 
              className="card" 
              onClick={fetchOverdueDetails}
              style={{ padding: '16px', borderLeft: '4px solid var(--danger)', marginBottom: 0, cursor: 'pointer' }}
            >
              <div style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> {t('total_overdue')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {stats?.overdue_count || 0}
                <span style={{ fontSize: '0.65rem', background: 'var(--danger)', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>查看</span>
              </div>
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
                    <span style={{ fontWeight: 500 }}>{r.store_name}</span>
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
                    <span style={{ fontWeight: 500 }}>{r.store_name}</span>
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
              <thead style={{ background: 'var(--surface-hover)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>{t('store_name')}</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>{t('stock')}</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.store_id} style={{ borderBottom: '1px solid var(--surface-hover)' }}>
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
      ) : (
        /* Logs Tab */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--surface-hover)', fontWeight: 700, fontSize: '0.9rem', background: 'var(--surface-hover)' }}>
            📋 {t('latest_system_logs')} (50)
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 16px' }}>時間</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px' }}>類別</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px' }}>事件</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-hover)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`badge`} style={{ 
                        background: log.category === 'AUTH' ? '#dcfce7' : log.category === 'BORROW' ? '#dbeafe' : log.category === 'RETURN' ? '#fef9c3' : '#f3f4f6',
                        color: log.category === 'AUTH' ? '#166534' : log.category === 'BORROW' ? '#1e40af' : log.category === 'RETURN' ? '#854d0e' : '#374151',
                        fontSize: '0.7rem'
                      }}>
                        {log.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{log.event}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.details}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Modal */}
      {showOverdueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--danger)' }}>{t('overdue_list')}</h3>
              <button onClick={() => setShowOverdueModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px' }}>
              {overdueRecords.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {overdueRecords.map((r) => (
                    <div key={r.serial_num} style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '12px', borderLeft: '4px solid var(--danger)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div>
                          <span style={{ fontWeight: 700 }}>{r.user_name}</span>
                          {r.is_suspended === 1 && <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>已停權</span>}
                        </div>
                        <button 
                          onClick={() => toggleSuspension(r.user_uuid, r.is_suspended)}
                          style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: r.is_suspended === 1 ? 'var(--success)' : 'var(--danger)', color: 'white' }}
                        >
                          {r.is_suspended === 1 ? '解除停權' : '立即停權'}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.user_email}</div>
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>杯子: {r.cup_id} | 門市: {r.borrow_store_name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>暫無逾期資料</div>
              )}
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid var(--surface-hover)' }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowOverdueModal(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={activeTab === 'overview' ? fetchData : fetchLogs}
        className="btn"
        style={{ width: '100%', marginTop: '24px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <RefreshCw size={18} /> {t('refresh_data')}
      </button>
    </div>
  );
}
