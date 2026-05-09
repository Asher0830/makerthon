import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, User, Clock, QrCode, Gift, Navigation, Coffee, Bell } from 'lucide-react';
import Scanner from '../components/Scanner';
import { useI18n } from '../i18n';

export default function Dashboard({ user, onLogout }) {
  const { t } = useI18n();
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [activeTab, setActiveTab] = useState('home');

  const [myCups, setMyCups] = useState([]);
  const [history, setHistory] = useState([]);
  const [userStats, setUserStats] = useState({ points: 0, total_borrow_count: 0 });
  const [loadingCups, setLoadingCups] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Pull to refresh state
  const [pullState, setPullState] = useState('idle'); // idle | pulling | ready | refreshing
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef(null);
  const touchStartY = useRef(0);

  const API_BASE = '/api';

  useEffect(() => {
    fetchCups();
    fetchHistory();
    fetchStats();
    // Check notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifEnabled(true);
    }
  }, []);

  // Schedule push notifications for cups nearing due date
  useEffect(() => {
    if (!notifEnabled || myCups.length === 0) return;
    
    myCups.forEach(cup => {
      if (cup.days_remaining <= 1 && !cup.is_overdue) {
        // Show notification for cups due tomorrow
        new Notification('🥤 Eco-Cup 還杯提醒', {
          body: `杯子 ${cup.cup_id} 明天到期，請盡速歸還！`,
          icon: '🥤',
          tag: `cup-${cup.cup_id}`, // Prevent duplicate notifications
        });
      }
      if (cup.is_overdue) {
        new Notification('⚠️ Eco-Cup 逾期通知', {
          body: `杯子 ${cup.cup_id} 已逾期，請立即歸還！`,
          icon: '⚠️',
          tag: `cup-overdue-${cup.cup_id}`,
        });
      }
    });
  }, [myCups, notifEnabled]);

  const requestNotification = async () => {
    if (!('Notification' in window)) {
      alert('此瀏覽器不支援通知功能');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifEnabled(true);
      alert(t('notif_permission'));
    } else {
      alert(t('notif_denied'));
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/user/stats`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchCups = async () => {
    setLoadingCups(true);
    try {
      const response = await fetch(`${API_BASE}/user/cups`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyCups(data.cups || []);
      }
    } catch (err) {
      console.error("Failed to fetch cups:", err);
    } finally {
      setLoadingCups(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE}/user/history?page=1&per_page=10`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Pull to Refresh handlers
  const handleTouchStart = useCallback((e) => {
    if (contentRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setPullState('pulling');
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (pullState === 'idle') return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && contentRef.current?.scrollTop === 0) {
      const distance = Math.min(diff * 0.4, 80);
      setPullDistance(distance);
      setPullState(distance > 50 ? 'ready' : 'pulling');
    }
  }, [pullState]);

  const handleTouchEnd = useCallback(async () => {
    if (pullState === 'ready') {
      setPullState('refreshing');
      setPullDistance(40);
      await Promise.all([fetchCups(), fetchHistory()]);
      setPullState('idle');
      setPullDistance(0);
    } else {
      setPullState('idle');
      setPullDistance(0);
    }
  }, [pullState]);

  const handleScanSuccess = async (decodedText) => {
    setIsScanning(false);
    setScanMessage(t('scan_success'));

    try {
      let storeId = "";
      let scannerId = decodedText;
      try {
        const parsed = JSON.parse(decodedText);
        storeId = parsed.store_id || "";
        scannerId = parsed.scanner_id || decodedText;
      } catch(e) {}

      const response = await fetch(`${API_BASE}/qrcode/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ scanner_id: scannerId, store_id: storeId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '推送失敗');
      }

      alert(t('scan_member_ok'));
      setTimeout(() => { fetchCups(); fetchHistory(); }, 2000);
    } catch (error) {
      alert(`${t('scan_fail')}: ${error.message}`);
    } finally {
      setScanMessage('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <>
      <div 
        className="content-area" 
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ paddingBottom: '100px', transform: `translateY(${pullDistance}px)`, transition: pullState === 'idle' ? 'transform 0.3s ease' : 'none' }}
      >
        {/* Pull to Refresh Indicator */}
        <div style={{
          position: 'absolute', top: -40, left: 0, right: 0,
          textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)',
          opacity: pullDistance > 10 ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          {pullState === 'refreshing' ? t('refreshing') : pullState === 'ready' ? t('release_to_refresh') : t('pull_to_refresh')}
        </div>

        {/* Header */}
        <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {activeTab === 'home' ? t('home') : t('member_center')}
            </p>
            <h1 style={{ margin: 0 }}>
              {activeTab === 'home' ? `${t('hello')}${user.name}` : t('personal_account')}
            </h1>
          </div>
          {activeTab === 'home' && (
            <div style={{ background: 'var(--warning-soft)', color: 'var(--warning)', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <Gift size={18} />
              <span>{userStats.points} {t('points')}</span>
            </div>
          )}
        </header>

        {activeTab === 'home' && (
          <>
            {/* Ad Banner */}
            <div className="ad-banner">
              <div className="ad-banner-icon"><Gift size={32} /></div>
              <div className="ad-banner-title">{t('ad_title')}</div>
              <div className="ad-banner-subtitle">{t('ad_subtitle')}</div>
            </div>

            {/* Notification Toggle */}
            {!notifEnabled && (
              <button 
                onClick={requestNotification}
                className="card" 
                style={{ width: '100%', cursor: 'pointer', border: '1px solid var(--primary-soft)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                <Bell size={18} /> 開啟到期推播通知
              </button>
            )}

            {/* My Cups */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--primary)" />
              {t('my_cups')}
            </h2>
            {loadingCups ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>{t('loading')}</div>
            ) : myCups.length > 0 ? (
              myCups.map(cup => {
                const isWarning = cup.days_remaining <= 3 && cup.days_remaining > 0;
                const statusClass = cup.is_overdue ? 'danger' : (isWarning ? 'warning' : 'success');
                const statusText = cup.is_overdue ? t('overdue') : t('days_remaining', { n: cup.days_remaining });
                return (
                  <div className="card" key={cup.cup_id} style={{ borderLeft: `4px solid var(--${statusClass})`}}>
                    <div className="card-header">
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coffee size={16} /> {cup.cup_id}
                      </span>
                      <span className={`badge badge-${statusClass}`}>{statusText}</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <p style={{ fontSize: '0.75rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={12} /> {t('borrow_store')}: {cup.borrow_store_name || cup.borrow_store_id || t('unknown')}
                      </p>
                      <p style={{ fontSize: '0.75rem', margin: 0 }}>{t('borrow_time')}: {formatDate(cup.borrow_time)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p>{t('no_cups')}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'member' && (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <User size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
            </div>

            {/* User Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div className="card" style={{ padding: '16px', marginBottom: 0, textAlign: 'center', borderBottom: '3px solid var(--warning)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>{t('points_earned')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>{userStats.points}</div>
              </div>
              <div className="card" style={{ padding: '16px', marginBottom: 0, textAlign: 'center', borderBottom: '3px solid var(--primary)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>累積借用</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{userStats.total_borrow_count}</div>
              </div>
            </div>

            {/* History */}
            <h2 style={{ marginTop: '24px' }}>{t('borrow_history')}</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>{t('loading')}</div>
              ) : history.filter(r => r.state === 'returned').length > 0 ? (
                history.filter(r => r.state === 'returned').map((record, index) => {
                  const filteredHistory = history.filter(r => r.state === 'returned');
                  return (
                    <div key={record.serial_num} style={{ padding: '16px', borderBottom: index !== filteredHistory.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{t('cup_id')}: {record.cup_id}</span>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem' }}>{t('returned')}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('borrow_from')}：{record.borrow_store_name || record.borrow_store_id}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(record.borrow_time)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('return_to')}：{record.return_store_name || record.return_store_id}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(record.return_time)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>{t('no_history')}</div>
              )}
            </div>

            {/* Sponsor Button */}
            <a 
              href="https://youtu.be/dQw4w9WgXcQ?si=6Y9NjSGbY1CJXpCq" 
              target="_blank" 
              rel="noopener noreferrer"
              className="card"
              style={{ width: '100%', marginTop: '24px', padding: '16px', border: '1px solid var(--warning-soft)', background: 'var(--warning-soft)', color: 'var(--warning)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
            >
              <Gift size={20} /> {t('sponsor')}
            </a>

            {/* Logout */}
            <button className="card" onClick={onLogout}
              style={{ width: '100%', marginTop: '12px', padding: '16px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              {t('logout')}
            </button>
          </>
        )}
        
        {scanMessage && (
          <div style={{ position: 'fixed', top: '16px', left: '16px', right: '16px', background: 'var(--text)', color: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', zIndex: 100 }}>
            {scanMessage}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-bar">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={24} />
          <span>{t('nav_home')}</span>
        </div>
        <button className="scan-fab" onClick={() => setIsScanning(true)}>
          <QrCode size={28} />
        </button>
        <div style={{ width: '64px' }}></div>
        <div className={`nav-item ${activeTab === 'member' ? 'active' : ''}`} onClick={() => setActiveTab('member')}>
          <User size={24} />
          <span>{t('nav_member')}</span>
        </div>
      </nav>

      {isScanning && (
        <Scanner onClose={() => setIsScanning(false)} onScanSuccess={handleScanSuccess} />
      )}
    </>
  );
}
