import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { ChevronLeft, Truck, Package, Activity, Crosshair, MapPin, Target, Navigation, Clock, ShieldCheck, Map as MapIcon, RotateCcw, AlertTriangle, CheckCircle, X } from 'lucide-react';

// Leaflet 相關匯入
import { MapContainer, TileLayer, Marker, Polyline, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 真實門市座標
const STORE_DATA = [
  ['S001', '5X嵐 台北信義店', 25.0355, 121.5661],
  ['S002', '可X不可 台北中山店', 25.0523, 121.5206],
  ['S003', '7-X1 台北八德店', 25.0485, 121.5501],
  ['S004', '星X克 台北忠孝店', 25.0412, 121.5433],
  ['S005', '迷X夏 台北站前店', 25.0462, 121.5175],
  ['S006', '5X嵐 台北公館店', 25.0131, 121.5364],
  ['S007', '清X福全 台北民生店', 25.0585, 121.5401],
  ['S008', '麻X茶坊 台北內湖店', 25.0805, 121.5678],
  ['S009', '龜X 台北西門店', 25.0428, 121.5082],
  ['S010', '珍X丹 台北南港店', 25.0521, 121.6069],
  ['S011', '路X莎 台北松山店', 25.0512, 121.5609],
  ['S012', 'cXma 台北大安店', 25.0332, 121.5427],
  ['S013', '康X龍 台北板橋店', 25.0132, 121.4627],
  ['S014', '萬X 台北天母店', 25.1160, 121.5284],
  ['S015', '一X 台北北投店', 25.1375, 121.5061]
];

const CENTRAL_HUB = { id: 'HUB_001', name: 'Eco-Central 清洗調度中心', lat: 25.0478, lng: 121.5171 };

const STORE_COORDS = STORE_DATA.reduce((acc, [id, name, lat, lng]) => {
  acc[id] = { lat, lng, name };
  return acc;
}, {});

const createTacticalIcon = (type, active = false, hasBounty = false) => {
  let color = type === 'hub' ? '#3b82f6' : '#4ade80';
  if (active) color = '#fbbf24';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
        ${hasBounty && !active ? `<div style="position: absolute; width: 60px; height: 60px; border: 2px solid ${color}; border-radius: 50%; animation: pulse-radar 2s infinite; opacity: 0.5;"></div>` : ''}
        <div style="
          background: ${active ? color : 'rgba(10, 20, 15, 0.98)'};
          border: 2.5px solid ${color};
          width: ${type === 'hub' ? '42px' : '36px'};
          height: ${type === 'hub' ? '42px' : '36px'};
          border-radius: ${type === 'hub' ? '14px' : '8px'};
          display: flex; align-items: center; justify-content: center;
          box-shadow: ${active ? `0 0 35px ${color}` : '0 12px 24px rgba(0,0,0,0.6)'};
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 10;
        ">
          <div style="color: ${active ? '#000' : color}; font-weight: 900; font-size: ${type === 'hub' ? '12px' : '10px'};">
            ${type === 'hub' ? 'HUB' : 'ST'}
          </div>
        </div>
      </div>
    `,
    iconSize: [50, 50], iconAnchor: [25, 25]
  });
};

function MapController({ targetBounty, userLoc }) {
  const map = useMap();
  useEffect(() => {
    if (targetBounty) {
      const bounds = L.latLngBounds([[targetBounty.coords.lat, targetBounty.coords.lng], [targetBounty.to_coords.lat, targetBounty.to_coords.lng]]);
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15, animate: true, duration: 1.5 });
    }
  }, [targetBounty, map]);
  return null;
}

export default function BountyBoard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [bounties, setBounties] = useState([]);
  const [myTask, setMyTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [routeData, setRouteData] = useState([]);
  const [takingId, setTakingId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
    }
  }, []);

  useEffect(() => {
    const target = myTask || selectedBounty;
    if (target) fetchRoute(target); else setRouteData([]);
  }, [selectedBounty, myTask]);

  const fetchRoute = async (target) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${target.coords.lng},${target.coords.lat};${target.to_coords.lng},${target.to_coords.lat}?overview=full&geometries=geojson`);
      if (res.ok) {
        const data = await res.json();
        setRouteData(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
      }
    } catch (err) { setRouteData([[target.coords.lat, target.coords.lng], [target.to_coords.lat, target.to_coords.lng]]); }
  };

  const fetchData = async () => {
    const userStr = localStorage.getItem('ecoCupUser');
    if (!userStr) { setLoading(false); return; }
    const user = JSON.parse(userStr);
    setLoading(true);
    try {
      const [listRes, myRes] = await Promise.all([
        fetch('/api/bounty/list'),
        fetch('/api/bounty/my', { headers: { 'Authorization': `Bearer ${user.token}` } })
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setBounties(data.map(b => ({
          ...b,
          coords: STORE_COORDS[b.from_store_id] || { lat: 25.04, lng: 121.53 },
          to_coords: { lat: CENTRAL_HUB.lat, lng: CENTRAL_HUB.lng },
          to_store_name: CENTRAL_HUB.name
        })));
      }
      if (myRes.ok) {
        const myData = await myRes.json();
        if (myData.has_task) setMyTask({ 
          ...myData, 
          coords: STORE_COORDS[myData.from_store_id], 
          to_coords: { lat: CENTRAL_HUB.lat, lng: CENTRAL_HUB.lng },
          to_store_name: CENTRAL_HUB.name
        });
        else setMyTask(null);
      }
    } catch (err) { console.error(err); }
    finally { setTimeout(() => setLoading(false), 1200); }
  };

  const handleTakeTask = async (id) => {
    const userStr = localStorage.getItem('ecoCupUser');
    const user = JSON.parse(userStr);
    setTakingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/bounty/take/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` } });
      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          fetchData();
          setSelectedBounty(null);
          setTakingId(null);
        }, 2000);
      } else {
        const d = await res.json();
        setError(d.detail || '接單失敗');
        setTakingId(null);
      }
    } catch (err) { setError('網路異常'); setTakingId(null); }
  };

  const activeTarget = myTask || selectedBounty;

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4ade80', zIndex: 9999 }}>
        <div style={{ position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '320px', height: '320px', border: '1px solid rgba(74, 222, 128, 0.1)', borderRadius: '50%', animation: 'spin 20s linear infinite' }}></div>
          <svg width="180" height="180" viewBox="0 0 100 100">
            <g style={{ transformOrigin: '50% 50%', animation: 'revolveFull 3s linear infinite' }}>
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <g key={angle}>
                  <circle cx={50 + 30 * Math.cos(angle * Math.PI / 180)} cy={50 + 30 * Math.sin(angle * Math.PI / 180)} r="9" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.3" />
                  <circle cx={50 + 30 * Math.cos(angle * Math.PI / 180)} cy={50 + 30 * Math.sin(angle * Math.PI / 180)} r="7" fill="#4ade80" style={{ animation: `fillStep 3s steps(1) infinite`, animationDelay: `${i * 0.5}s`, opacity: 0 }} />
                </g>
              ))}
            </g>
          </svg>
        </div>
        <div style={{ marginTop: '50px', fontWeight: 900, letterSpacing: '6px', fontSize: '0.9rem', color: '#4ade80', animation: 'blink 1.5s infinite', fontFamily: "'Outfit', sans-serif" }}>TACTICAL HUD INITIALIZING</div>
        <style>{`
          @keyframes revolveFull { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fillStep { 0% { opacity: 0; } 16.6% { opacity: 1; } 100% { opacity: 1; } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes pulse-radar { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0f0d', zIndex: 8000 }}>
      <button onClick={() => navigate('/dashboard')} style={{ position: 'absolute', top: '50px', left: '20px', zIndex: 9999, background: 'rgba(0,0,0,0.85)', border: '1px solid #4ade80', color: '#4ade80', width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={24} />
      </button>

      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} className="fade-in">
          <div style={{ padding: '40px', border: '2px solid #4ade80', borderRadius: '24px', textAlign: 'center', background: '#0a0f0d' }}>
            <CheckCircle size={64} color="#4ade80" style={{ marginBottom: '20px' }} />
            <div style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '4px' }}>MISSION LOCKED</div>
          </div>
        </div>
      )}

      <MapContainer center={[25.045, 121.53]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} onClick={() => setSelectedBounty(null)}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapController targetBounty={activeTarget} />

        <Marker position={[CENTRAL_HUB.lat, CENTRAL_HUB.lng]} icon={createTacticalIcon('hub', !!activeTarget)}>
          <Tooltip permanent direction="top"><div style={{ fontWeight: 900, color: '#3b82f6', fontSize: '0.7rem' }}>中央 HUB</div></Tooltip>
        </Marker>

        {Object.entries(STORE_COORDS).map(([id, s]) => {
          const bList = bounties.filter(x => x.from_store_id === id);
          const isSelected = activeTarget?.from_store_id === id;
          return (
            <Marker key={id} position={[s.lat, s.lng]} icon={createTacticalIcon('store', isSelected, bList.length > 0)} eventHandlers={{ click: () => {
              if (bList.length > 0) setSelectedBounty(bList[0]);
            }}}>
              <Tooltip direction="top" opacity={0.9} offset={[0, -15]}><div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{s.name}</div></Tooltip>
            </Marker>
          );
        })}

        {routeData.length > 0 && (
          <Polyline positions={routeData} color={myTask ? "#fbbf24" : "#4ade80"} weight={6} opacity={0.9} style={{ filter: 'drop-shadow(0 0 15px rgba(74, 222, 128, 0.8))' }} />
        )}
      </MapContainer>

      {activeTarget && (
        <div className="fade-in" style={{ position: 'absolute', bottom: '40px', left: '20px', right: '20px', background: 'rgba(10, 15, 13, 0.98)', backdropFilter: 'blur(30px)', border: `1px solid ${myTask ? '#fbbf24' : '#4ade80'}`, borderRadius: '32px', padding: '24px', zIndex: 2000, boxShadow: '0 40px 80px rgba(0,0,0,1)' }}>
          <button 
            onClick={() => setSelectedBounty(null)} 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ color: myTask ? '#fbbf24' : '#4ade80', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '2px' }}>{myTask ? 'MISSION ACTIVE' : 'MISSION READY'}</div>
              <h4 style={{ margin: '6px 0 0', color: 'white', fontSize: '1.4rem', fontWeight: 900 }}>{activeTarget.title}</h4>
              <div style={{ color: '#999', fontSize: '0.9rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} /> {activeTarget.from_store_name} ➔ HUB
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: myTask ? '#fbbf24' : '#4ade80', fontSize: '2.2rem', fontWeight: 900 }}>+{activeTarget.reward_points}</div>
            </div>
          </div>
          
          {error && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '15px' }}>{error}</div>}

          <button 
            disabled={!!takingId || showSuccess}
            onClick={() => myTask ? navigate('/bounty') : handleTakeTask(activeTarget.bounty_id)} 
            style={{ width: '100%', padding: '22px', background: myTask ? '#fbbf24' : '#4ade80', color: '#000', border: 'none', borderRadius: '20px', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 15px 30px rgba(0,0,0,0.4)', transition: 'all 0.3s' }}
          >
            {takingId ? '上傳指令中...' : myTask ? '查看配送細節' : '立即開始配送任務'}
          </button>
        </div>
      )}

      <style>{`
        .leaflet-container { filter: grayscale(1) invert(0.95) brightness(0.9) contrast(1.2); }
        .fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
