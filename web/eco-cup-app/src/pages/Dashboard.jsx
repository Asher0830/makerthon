import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, Clock, QrCode, Gift, Navigation, Coffee, Bell, ChevronRight, History, LogOut, Activity, Store, MapPin, Egg, Truck } from 'lucide-react';
import Scanner from '../components/Scanner';
import { useI18n } from '../i18n';
import cupImg from '../assets/cup.png';

export default function Dashboard({ user, onLogout }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [activeTab, setActiveTab] = useState('home');

  const [myCups, setMyCups] = useState([]);
  const [history, setHistory] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreIdx, setSelectedStoreIdx] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [userStats, setUserStats] = useState({ points: 0, total_borrow_count: 0 });
  const [loadingCups, setLoadingCups] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Pull to refresh state
  const [pullState, setPullState] = useState('idle'); // idle | pulling | ready | refreshing
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef(null);
  const touchStartY = useRef(0);
  const dialTouchStartX = useRef(0);
  const isDialSwiping = useRef(false);

  const API_BASE = '/api';

  useEffect(() => {
    fetchData();
    // Get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const loc = {
          lat: Math.round(position.coords.latitude * 10000),
          lng: Math.round(position.coords.longitude * 100000)
        };
        setUserLocation(loc);
        // We re-fetch or re-trigger to sort stores by distance
        fetchStores();
      });
    }
    // Check notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifEnabled(true);
    }
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchCups(), fetchHistory(), fetchStats(), fetchStores()]);
  };

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const response = await fetch(`${API_BASE}/user/stores`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        let data = await response.json();
        if (data && data.length > 0) {
          // If we have location, sort by distance
          if (userLocation) {
            data.sort((a, b) => {
              const d1 = Math.pow((a.latitude - userLocation.lat) / 10000 * 111, 2) + Math.pow((a.longitude - userLocation.lng) / 100000 * 101, 2);
              const d2 = Math.pow((b.latitude - userLocation.lat) / 10000 * 111, 2) + Math.pow((b.longitude - userLocation.lng) / 100000 * 101, 2);
              return d1 - d2;
            });
          }
          // Keep only top 6 to avoid overlapping on the wheel
          setStores(data.slice(0, 6));
        } else {
          setStores([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err);
    } finally {
      setLoadingStores(false);
    }
  };

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
      setTimeout(() => setLoadingCups(false), 500); // Subtle delay for smoother transition
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
      setTimeout(() => setLoadingHistory(false), 500);
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
      await fetchData();
      setPullState('idle');
      setPullDistance(0);
    } else {
      setPullState('idle');
      setPullDistance(0);
    }
  }, [pullState]);

  const handleDialTouchStart = (e) => {
    dialTouchStartX.current = e.touches[0].clientX;
    isDialSwiping.current = true;
  };

  const handleDialTouchMove = (e) => {
    if (!isDialSwiping.current) return;
    const diffX = e.touches[0].clientX - dialTouchStartX.current;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        rotateWheel(-1);
      } else {
        rotateWheel(1);
      }
      isDialSwiping.current = false;
    }
  };

  const rotateWheel = (direction) => {
    if (stores.length === 0) return;
    const angle = 360 / stores.length;
    const newIdx = (selectedStoreIdx + direction + stores.length) % stores.length;
    setSelectedStoreIdx(newIdx);
    setWheelRotation(prev => prev - direction * angle);
  };

  const handleDialTouchEnd = () => {
    isDialSwiping.current = false;
  };

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
      } catch (e) { }

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
      setTimeout(() => fetchData(), 2000);
    } catch (error) {
      alert(`${t('scan_fail')}: ${error.message}`);
    } finally {
      setScanMessage('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const RANKS = [
    { name: '環保新芽', count: 0, icon: '🌱', color: '#166534', bg: '#F0FDF4', desc: '環保之路的起點，繼續加油！' },
    { name: '減塑學徒', count: 10, icon: '🌿', color: '#92400E', bg: '#FFF7ED', desc: '你已經掌握了減塑的基本技巧。' },
    { name: '低碳騎士', count: 50, icon: '🛡️', color: '#4B5563', bg: '#F3F4F6', desc: '你是環保戰士，為地球減少負擔。' },
    { name: '不塑之客', count: 150, icon: '✨', color: '#D97706', bg: '#FFFBEB', desc: '減塑已經成為你的生活品味。' },
    { name: '綠能大師', count: 400, icon: '🌳', color: '#059669', bg: '#ECFDF5', desc: '你是綠色能量的傳播者。' },
    { name: '地球守護者', count: 1000, icon: '🌍', color: '#7C3AED', bg: '#F5F3FF', desc: '傳說級別的貢獻，地球感謝有你！' }
  ];

  const getUserRank = (count) => {
    return [...RANKS].reverse().find(r => count >= r.count) || RANKS[0];
  };

  const rank = getUserRank(userStats.total_borrow_count);

  const getStoreMockData = (sid) => {
    const mocks = {
      "S_TP_001": { intro: "座落於信義商圈，以極簡工業風打造，是繁華都會中的綠色綠洲。", hours: "08:00 - 22:00" },
      "S_TP_002": { intro: "中山捷運站旁的文青首選，充滿人文氣息，適合慢活品味咖啡。", hours: "09:00 - 21:00" },
      "S_TP_003": { intro: "正對大安森林公園，享受森呼吸的同時，也能實踐永續生活。", hours: "07:30 - 20:00" },
      "S_TP_004": { intro: "松菸文創園區內的創意聚落，將環保與美學完美融合的體驗空間。", hours: "10:00 - 22:00" },
      "S_TP_005": { intro: "西門鬧區中的寧靜一角，提供快捷且優質的租借服務，行動派的最愛。", hours: "11:00 - 23:00" },
      "S_TP_006": { intro: "101 高樓下的環保前哨站，向國際遊客展現台灣的永續力。", hours: "09:00 - 21:30" },
      "S_TP_007": { intro: "台大學區的活力據點，支持學生與教職員的無塑每日生活。", hours: "08:00 - 19:00" },
      "S_TP_008": { intro: "誠品南西的精緻選店，讓閱讀與環保杯成為您最有質感的配件。", hours: "11:00 - 22:00" },
      "S_TP_009": { intro: "公館台大商圈的補給站，伴隨書香與咖啡香的環保新選擇。", hours: "08:00 - 21:00" },
      "S_TP_010": { intro: "南港科技城中的綠能驛站，為通勤族提供最便利的借還體驗。", hours: "07:30 - 22:00" },
      "S_TP_011": { intro: "內科上班族的提神夥伴，瑞光路上的環保實踐基地。", hours: "08:00 - 20:00" },
      "S_TP_012": { intro: "板橋府中的在地好鄰居，連結新北生活圈的永續網絡。", hours: "10:00 - 22:00" },
      "S_TP_013": { intro: "天母異國風情中的慢活空間，推廣優質減塑生活的新標竿。", hours: "09:00 - 21:00" },
      "S_TP_014": { intro: "松山機場的旅客轉運站，讓環保杯跟隨您的旅行足跡。", hours: "06:00 - 22:00" },
      "S_TP_015": { intro: "北投溫泉鄉的悠閒據點，在放鬆身心的同時也為地球盡一份心。", hours: "09:00 - 18:00" },
    };
    return mocks[sid] || { intro: "友善地球的夥伴門市，與您一起守護環境。", hours: "09:00 - 21:00" };
  };

  const isStoreOpen = (hoursStr) => {
    const [start, end] = hoursStr.split(' - ');
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    return currentTime >= startTime && currentTime < endTime;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "晚安，還沒睡嗎？";
    if (hour < 12) return t('hello', { name: user.name.split(' ')[0] });
    if (hour < 18) return "午安！喝杯咖啡吧";
    return "晚安！辛苦了一天";
  };

  const calculateDistance = (sLat, sLng) => {
    if (!userLocation) return null;
    // Simple Euclidean distance for small distances (Taipei)
    // Degrees to meters (approx)
    const dLat = (sLat - userLocation.lat) / 10000;
    const dLng = (sLng - userLocation.lng) / 100000;
    const distanceKm = Math.sqrt(Math.pow(dLat * 111, 2) + Math.pow(dLng * 101, 2));
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
    return `${distanceKm.toFixed(1)}km`;
  };

  // Skeleton UI for loading
  const SkeletonCard = () => (
    <div className="card" style={{ height: '100px' }}>
      <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }}></div>
      <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '8px' }}></div>
      <div className="skeleton" style={{ height: '14px', width: '30%' }}></div>
    </div>
  );

  return (
    <>
      <div
        className="content-area fade-in"
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${pullDistance}px)`, transition: pullState === 'idle' ? 'transform 0.3s ease' : 'none' }}
      >
        {/* Pull to Refresh Indicator */}
        <div style={{
          position: 'absolute', top: -40, left: 0, right: 0,
          textAlign: 'center', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600,
          opacity: pullDistance > 10 ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          {pullState === 'refreshing' ? t('refreshing') : pullState === 'ready' ? t('release_to_refresh') : t('pull_to_refresh')}
        </div>

        {/* Header */}
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {activeTab === 'home' ? 'Hooray!' : t('personal_account')}
            </p>
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>
              {activeTab === 'home' ? getGreeting() : '我的設定'}
            </h1>
            {activeTab === 'home' && (
              <div
                onClick={() => setShowRankModal(true)}
                className="badge"
                style={{
                  display: 'inline-flex', marginTop: '4px', background: rank.bg, color: rank.color,
                  padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                  alignItems: 'center', gap: '4px', border: `1px solid ${rank.color}33`,
                  cursor: 'pointer'
                }}
              >
                {rank.icon} {rank.name}
              </div>
            )}
          </div>
          {activeTab === 'home' && (
            <div style={{ position: 'relative' }}>
              <div style={{ background: '#FEF3C7', color: '#B45309', padding: '8px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(180, 83, 9, 0.1)' }}>
                <Gift size={18} />
                <span>{userStats.points}</span>
              </div>
            </div>
          )}
        </header>

        {activeTab === 'home' && (
          <div className="fade-in">
            {/* Featured Ad - Premium Look */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #606C38, #283618)', color: 'white', padding: '24px', position: 'relative', overflow: 'hidden', border: 'none' }}>
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '65%' }}>
                <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '8px' }}>{t('ad_title')}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>{t('ad_subtitle')}</p>
              </div>
              <img src={cupImg} style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '160px', height: '160px', objectFit: 'contain', opacity: 0.8, transform: 'rotate(-10deg)' }} alt="Eco Cup" />
            </div>

            {/* Notification Toggle - Soft Warning */}
            {!notifEnabled && (
              <div
                onClick={requestNotification}
                className="card"
                style={{ background: '#FFF7ED', border: '1px dashed #FDBA74', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <div style={{ background: '#FDBA74', color: 'white', padding: '8px', borderRadius: '10px' }}>
                  <Bell size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>開啟提醒</div>
                  <div style={{ fontSize: '0.75rem', color: '#9A3412' }}>怕忘記還杯嗎？讓我們提醒你吧！</div>
                </div>
                <ChevronRight size={18} color="#9A3412" />
              </div>
            )}

            {/* My Cups Section */}
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={20} color="var(--primary)" />
              {t('my_cups')}
            </h2>

            {loadingCups ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : myCups.length > 0 ? (
              myCups.map(cup => {
                const isWarning = cup.days_remaining <= 1 && cup.days_remaining > 0;
                const statusClass = cup.is_overdue ? 'danger' : (isWarning ? 'warning' : 'success');
                const statusText = cup.is_overdue ? t('overdue') : t('days_remaining', { n: cup.days_remaining });
                return (
                  <div className="card" key={cup.cup_id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '14px' }}>
                      <Coffee size={32} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{cup.cup_id}</span>
                        <span className={`badge badge-${statusClass}`}>{statusText}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Navigation size={12} /> {cup.borrow_store_name || cup.borrow_store_id || t('unknown')}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', background: 'transparent', border: '2px dashed rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                <Coffee size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('no_cups')}</p>
              </div>
            )}

            {/* Store Dial Section */}
            <h2 style={{ fontSize: '1.25rem', marginTop: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={20} color="var(--primary)" />
              尋找夥伴門市
            </h2>
            <div
              className="store-dial-container"
              onTouchStart={handleDialTouchStart}
              onTouchMove={handleDialTouchMove}
              onTouchEnd={handleDialTouchEnd}
            >
              {/* Rotation Guidance Arrows */}
              <div style={{ position: 'absolute', left: '10px', top: '100px', zIndex: 10, color: 'var(--text-muted)', opacity: 0.3 }}>
                <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
              </div>
              <div style={{ position: 'absolute', right: '10px', top: '100px', zIndex: 10, color: 'var(--text-muted)', opacity: 0.3 }}>
                <ChevronRight size={24} />
              </div>

              <div className="dial-wheel" style={{ transform: `translateX(-50%) rotate(${wheelRotation}deg) translateZ(0)` }}>
                {stores.map((s, idx) => {
                  const angle = 360 / stores.length;
                  const rotation = idx * angle;
                  return (
                    <div
                      key={s.store_id}
                      className={`dial-item ${selectedStoreIdx === idx ? 'active' : ''}`}
                      style={{ '--rotation': `${rotation}deg`, transform: `rotate(${rotation}deg) translateZ(0)` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Calculate shortest rotation path
                        const diff = idx - (selectedStoreIdx % stores.length + stores.length) % stores.length;
                        let move = diff;
                        if (move > stores.length / 2) move -= stores.length;
                        if (move < -stores.length / 2) move += stores.length;
                        rotateWheel(move);
                      }}
                    >
                      <div className="dial-item-inner" style={{ transform: `rotate(${-(rotation + wheelRotation)}deg)` }}>
                        <Store size={22} />
                        <span style={{ fontSize: '0.5rem', marginTop: '2px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                          {s.name.replace('Eco-Cup ', '')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {stores.length > 0 && (
              <>
                <div className="store-info-card fade-in" key={stores[selectedStoreIdx].store_id}>
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>{stores[selectedStoreIdx].name}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {getStoreMockData(stores[selectedStoreIdx].store_id).intro}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ background: '#F0FDF4', color: '#166534', padding: '4px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Navigation size={12} /> {calculateDistance(stores[selectedStoreIdx].latitude, stores[selectedStoreIdx].longitude) || '定位中'}
                    </div>
                    <div style={{ background: '#F5F3FF', color: '#7C3AED', padding: '4px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {getStoreMockData(stores[selectedStoreIdx].store_id).hours}
                    </div>
                    {isStoreOpen(getStoreMockData(stores[selectedStoreIdx].store_id).hours) ? (
                      <div style={{ background: '#F0FDF4', color: '#166534', padding: '4px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #DCFCE7' }}>
                        {t('status')}: {t('normal')}
                      </div>
                    ) : (
                      <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '4px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #FEE2E2' }}>
                        {t('status')}: 休息中
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'center', justifyContent: 'center' }}>
                    <MapPin size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all', lineHeight: 1.4 }}>
                      {stores[selectedStoreIdx].real_local}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Bounty Task Section */}
            <h2 style={{ fontSize: '1.25rem', marginTop: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={20} color="var(--primary)" />
              配送任務懸賞
            </h2>

            <div
              onClick={() => navigate('/bounty')}
              className="card bounty-float bounty-card-adaptive"
              style={{
                borderRadius: '28px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--bounty-border)',
                background: 'var(--bounty-bg)',
                color: 'var(--bounty-text)',
                boxShadow: '0 15px 35px var(--bounty-shadow)'
              }}
            >
              {/* Background Glow Effect */}
              <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, var(--bounty-glow) 0%, transparent 70%)', animation: 'pulse 4s infinite' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'var(--bounty-icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={32} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--primary)', marginBottom: '4px', letterSpacing: '1px' }}>配送任務</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, lineHeight: 1.4, color: 'var(--bounty-text-muted)' }}>協助門市杯具調度，賺取環保積分</div>
                </div>
                <div style={{ background: 'var(--primary)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={24} />
                </div>
              </div>

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bounty-stats-bg)', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--bounty-stats-border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>平均收益</div>
                <div style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1.1rem' }}>~150 PTS</div>
              </div>
            </div>

            <style>{`
              :root {
                --bounty-bg: rgba(74, 222, 128, 0.08);
                --bounty-text: #166534;
                --bounty-text-muted: rgba(22, 101, 52, 0.7);
                --bounty-border: rgba(74, 222, 128, 0.4);
                --bounty-shadow: rgba(0, 0, 0, 0.05);
                --bounty-glow: rgba(74, 222, 128, 0.1);
                --bounty-icon-bg: rgba(74, 222, 128, 0.1);
                --bounty-stats-bg: rgba(255, 255, 255, 0.5);
                --bounty-stats-border: rgba(74, 222, 128, 0.1);
              }
              [data-theme='dark'] {
                --bounty-bg: rgba(255, 255, 255, 0.03);
                --bounty-text: #ffffff;
                --bounty-text-muted: rgba(255, 255, 255, 0.6);
                --bounty-border: rgba(74, 222, 128, 0.3);
                --bounty-shadow: rgba(0, 0, 0, 0.4);
                --bounty-glow: rgba(74, 222, 128, 0.05);
                --bounty-icon-bg: rgba(255, 255, 255, 0.05);
                --bounty-stats-bg: rgba(0, 0, 0, 0.4);
                --bounty-stats-border: rgba(255, 255, 255, 0.05);
              }
              .bounty-card-adaptive { 
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
              }
              .bounty-card-adaptive:hover {
                border-color: var(--primary) !important;
                box-shadow: 0 20px 40px var(--bounty-shadow) !important;
              }
              .bounty-float { animation: floating 6s ease-in-out infinite; }
              @keyframes floating {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                33% { transform: translateY(-6px) rotate(0.5deg); }
                66% { transform: translateY(-3px) rotate(-0.5deg); }
              }
              @keyframes pulse {
                0%, 100% { opacity: 0.1; transform: scale(1); }
                50% { opacity: 0.3; transform: scale(1.3); }
              }
            `}</style>
          </div>
        )}

        {activeTab === 'member' && (
          <div className="fade-in">
            {/* Profile Header */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', background: 'var(--surface)' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', boxShadow: 'var(--shadow-md)' }}>
                <User size={36} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{user.email}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    onClick={() => setShowRankModal(true)}
                    className="badge"
                    style={{
                      background: rank.bg, color: rank.color, border: `1px solid ${rank.color}33`,
                      display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'none',
                      letterSpacing: 'normal', cursor: 'pointer'
                    }}
                  >
                    {rank.icon} {rank.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div className="card" style={{ padding: '20px', textAlign: 'center', border: 'none' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>{t('points_earned')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{userStats.points}</div>
              </div>
              <div className="card" style={{ padding: '20px', textAlign: 'center', border: 'none' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>{t('total_borrow_count')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{userStats.total_borrow_count}</div>
              </div>
            </div>

            {/* History List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} color="var(--primary)" />
                {t('borrow_history')}
              </h2>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loadingHistory ? (
                <div style={{ padding: '20px' }}>
                  <div className="skeleton" style={{ height: '60px', width: '100%', marginBottom: '12px' }}></div>
                  <div className="skeleton" style={{ height: '60px', width: '100%' }}></div>
                </div>
              ) : history.filter(r => r.state === 'returned').length > 0 ? (
                history.filter(r => r.state === 'returned').map((record, index) => {
                  const filtered = history.filter(r => r.state === 'returned');
                  return (
                    <div key={record.serial_num} style={{ padding: '16px 20px', borderBottom: index !== filtered.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{record.cup_id}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>{t('returned')}</span>
                      </div>
                      <div style={{ borderLeft: '2px dashed #E5E7EB', marginLeft: '6px', paddingLeft: '16px', position: 'relative' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{record.borrow_store_name || record.borrow_store_id}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(record.borrow_time)}</div>
                          <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#E5E7EB' }}></div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{record.return_store_name || record.return_store_id}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(record.return_time)}</div>
                          <div style={{ position: 'absolute', left: '-5px', bottom: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  {t('no_history')}
                </div>
              )}
            </div>

            {/* QR Code Scan - Primary Action */}
            <button
              onClick={() => setIsScanning(true)}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <QrCode size={20} /> {t('scan_borrow')}
            </button>

            {/* Sponsor - Life Style Action */}
            <a
              href="https://youtu.be/dQw4w9WgXcQ?si=6Y9NjSGbY1CJXpCq"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ width: '100%', marginTop: '12px', padding: '16px', background: 'var(--accent)', color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', border: 'none' }}
            >
              <Gift size={20} /> {t('sponsor')}
            </a>

            {/* Logout - Soft Action */}
            <button
              onClick={onLogout}
              className="btn"
              style={{ width: '100%', marginTop: '12px', background: 'transparent', color: '#991B1B', border: '1px solid #FEE2E2', fontSize: '0.9rem' }}
            >
              <LogOut size={18} /> {t('logout')}
            </button>
          </div>
        )}

        {scanMessage && (
          <div style={{ position: 'fixed', top: '24px', left: '24px', right: '24px', background: 'var(--primary)', color: 'white', padding: '16px 24px', borderRadius: '16px', textAlign: 'center', zIndex: 1000, boxShadow: 'var(--shadow-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Activity size={20} className="spin" />
            {scanMessage}
          </div>
        )}
      </div>

      {/* Floating Action Bar - Life Style Design */}
      <nav className="nav-bar">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Home size={22} />
          <span>{t('nav_home')}</span>
        </button>

        {/* Main Tree Game Button */}
        <div style={{ position: 'relative', top: '-30px' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/tree')}
            style={{ width: '64px', height: '64px', borderRadius: '22px', padding: 0, boxShadow: '0 10px 25px rgba(96, 108, 56, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Egg size={32} color="white" />
          </button>
        </div>

        <button className={`nav-item ${activeTab === 'member' ? 'active' : ''}`} onClick={() => setActiveTab('member')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <User size={22} />
          <span>{t('nav_member')}</span>
        </button>
      </nav>

      {/* Rank Modal */}
      {showRankModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(8px)' }}>
          <div className="fade-in" style={{ background: 'var(--surface)', borderRadius: '32px', width: '100%', maxWidth: '360px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '32px 24px', background: 'linear-gradient(to bottom, var(--primary), transparent)', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{t('rank_explanation')}</h2>
              <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>{t('rank_subtitle')}</p>
            </div>

            <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              {RANKS.map((r, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px', marginBottom: '12px',
                  background: rank.name === r.name ? r.bg : 'rgba(0,0,0,0.02)',
                  border: rank.name === r.name ? `1px solid ${r.color}33` : '1px solid transparent',
                  opacity: userStats.total_borrow_count >= r.count ? 1 : 0.4
                }}>
                  <div style={{ fontSize: '1.5rem', width: '40px', textAlign: 'center' }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: r.color, fontSize: '1rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('total_borrow_count')} {r.count}+</div>
                    {rank.name === r.name && <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: r.color, fontStyle: 'italic' }}>{r.desc}</p>}
                  </div>
                  {userStats.total_borrow_count >= r.count && <div style={{ color: r.color, fontWeight: 900 }}>✓</div>}
                </div>
              ))}
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <button
                onClick={() => setShowRankModal(false)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 800 }}
              >
                {t('got_it')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isScanning && (
        <Scanner onClose={() => setIsScanning(false)} onScanSuccess={handleScanSuccess} />
      )}
    </>
  );
}


