import { useState, useEffect } from 'react';
import { Home, User, Clock, QrCode, Gift, Navigation, Coffee } from 'lucide-react';
import Scanner from '../components/Scanner';

export default function Dashboard({ user, onLogout }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'member'

  // Data States
  const [myCups, setMyCups] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingCups, setLoadingCups] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const API_BASE = '/api';

  useEffect(() => {
    fetchCups();
    fetchHistory();
  }, []);

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

  const handleScanSuccess = async (decodedText) => {
    setIsScanning(false);
    console.log("Scanned QR:", decodedText);
    setScanMessage('掃描成功，處理中...');

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
        body: JSON.stringify({
          scanner_id: scannerId,
          store_id: storeId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '推送失敗');
      }

      alert('會員登入成功，請進行掃杯 (UUID已傳送)');
      setTimeout(() => {
        fetchCups();
        fetchHistory();
      }, 2000);

    } catch (error) {
      alert(`處理失敗: ${error.message}`);
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
      <div className="content-area" style={{ paddingBottom: '100px' }}>
        {/* Tab Header */}
        <header style={{ marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{activeTab === 'home' ? '首頁' : '會員中心'}</p>
          <h1 style={{ margin: 0 }}>{activeTab === 'home' ? `您好，${user.name}` : '個人帳戶'}</h1>
        </header>

        {activeTab === 'home' && (
          <>
            {/* Ad Banner */}
            <div className="ad-banner">
              <div className="ad-banner-icon"><Gift size={32} /></div>
              <div className="ad-banner-title">自備環保杯 加碼送點！</div>
              <div className="ad-banner-subtitle">每次借還皆可累積專屬回饋，快來參加！</div>
            </div>

            {/* My Cups Section */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--primary)" />
              我的杯子
            </h2>
            {loadingCups ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                載入中...
              </div>
            ) : myCups.length > 0 ? (
              myCups.map(cup => {
                const isWarning = cup.days_remaining <= 3 && cup.days_remaining > 0;
                const statusClass = cup.is_overdue ? 'danger' : (isWarning ? 'warning' : 'success');
                const statusText = cup.is_overdue ? '已逾期' : `剩餘 ${cup.days_remaining} 天`;
                
                return (
                  <div className="card" key={cup.cup_id} style={{ borderLeft: `4px solid var(--${statusClass})`}}>
                    <div className="card-header">
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coffee size={16} /> {cup.cup_id}
                      </span>
                      <span className={`badge badge-${statusClass}`}>
                        {statusText}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Navigation size={12} /> 借出店家: {cup.borrow_store_name || cup.borrow_store_id || '未知'}
                        </p>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>借出: {formatDate(cup.borrow_time)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p>目前沒有借出的杯子</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'member' && (
          <>
            {/* User Profile Info Card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <User size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
            </div>

            {/* History Section */}
            <h2 style={{ marginTop: '24px' }}>借還歷史</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>載入中...</div>
              ) : history.filter(r => r.state === 'returned').length > 0 ? (
                history.filter(r => r.state === 'returned').map((record, index) => {
                  const filteredHistory = history.filter(r => r.state === 'returned');
                  return (
                    <div 
                      key={record.serial_num} 
                      style={{ 
                        padding: '16px', 
                        borderBottom: index !== filteredHistory.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>杯號: {record.cup_id}</span>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem' }}>
                          ✓ 已歸還
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>借出：{record.borrow_store_name || record.borrow_store_id}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(record.borrow_time)}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>歸還：{record.return_store_name || record.return_store_id}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(record.return_time)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                 <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>無歷史紀錄</div>
              )}
            </div>

            {/* Logout Button */}
            <button 
              className="card"
              onClick={onLogout}
              style={{ 
                width: '100%', 
                marginTop: '32px', 
                padding: '16px', 
                border: '1px solid #fee2e2', 
                background: '#fef2f2', 
                color: '#ef4444', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              登出帳號
            </button>
          </>
        )}
        
        {scanMessage && (
          <div style={{ position: 'fixed', top: '16px', left: '16px', right: '16px', background: 'var(--text-main)', color: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', zIndex: 100 }}>
            {scanMessage}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-bar">
        <div 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={24} />
          <span>首頁</span>
        </div>
        
        <button className="scan-fab" onClick={() => setIsScanning(true)}>
          <QrCode size={28} />
        </button>
        
        <div style={{ width: '64px' }}></div>
        
        <div 
          className={`nav-item ${activeTab === 'member' ? 'active' : ''}`}
          onClick={() => setActiveTab('member')}
        >
          <User size={24} />
          <span>會員</span>
        </div>
      </nav>

      {/* Scanner Overlay */}
      {isScanning && (
        <Scanner 
          onClose={() => setIsScanning(false)} 
          onScanSuccess={handleScanSuccess} 
        />
      )}
    </>
  );
}
