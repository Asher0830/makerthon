import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { ChevronLeft, Home, User, Activity } from 'lucide-react';

const PET_DATABASE = [
  { id: "p1", name: "翠葉雛鳥", icon: "https://cdn.phototourl.com/free/2026-05-09-dd613d4b-2b49-47ff-811c-fe5d0f683687.png", rarity: "common" },
  { id: "p2", name: "月光靈兔", icon: "https://cdn.phototourl.com/free/2026-05-09-1735716c-3e10-4084-95b0-1c633446a8f3.png", rarity: "uncommon" },
  { id: "p3", name: "翡翠蒼龍", icon: "https://cdn.phototourl.com/free/2026-05-09-0b13da28-cf92-4f6b-bc75-8a0ce99d6d6b.png", rarity: "rare" },
];

const TIERS = [
  { name: "普通", icon: "🥚", cost: 20, count: 1,  rareBonus: 0 },
  { name: "閃耀", icon: "✨", cost: 50, count: 3,  rareBonus: 0.15 },
  { name: "幸運", icon: "🌟", cost: 100, count: 5,  rareBonus: 0.35 },
];

export default function TreeRewardDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hatch');
  const [balance, setBalance] = useState(0);
  const [myPets, setMyPets] = useState({});
  const [selectedTier, setSelectedTier] = useState(0);
  const [isHatching, setIsHatching] = useState(false);
  const [hatchResult, setHatchResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const savedPets = localStorage.getItem('treePoints_pets');
    if (savedPets) {
      try { setMyPets(JSON.parse(savedPets)); } catch (e) { setMyPets({}); }
    }
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const userStr = localStorage.getItem('ecoCupUser');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    try {
      const response = await fetch('/api/user/stats', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(Math.floor(data.points));
      }
    } catch (err) { console.error(err); }
  };

  const handleHatch = async () => {
    if (isHatching) return;
    const tier = TIERS[selectedTier];
    if (balance < tier.cost) {
      setToast({ title: t('points_insufficient'), msg: t('no_cups') }); // reuse no_cups for a nudge or add new key
      setTimeout(() => setToast(null), 2000);
      return;
    }

    const userStr = localStorage.getItem('ecoCupUser');
    const user = JSON.parse(userStr);

    try {
      const response = await fetch(`/api/user/deduct_points?amount=${tier.cost}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (!response.ok) {
        const err = await response.json();
        setToast({ title: '錯誤', msg: err.detail || '扣點失敗' });
        setTimeout(() => setToast(null), 2000);
        return;
      }

      const resData = await response.json();
      setBalance(resData.remaining_points);
      setIsHatching(true);
      
      // Animation timing based on index.html
      setTimeout(() => {
        const r = Math.random();
        const pet = r < 0.1 ? PET_DATABASE[2] : r < 0.4 ? PET_DATABASE[1] : PET_DATABASE[0];
        const newPets = { ...myPets, [pet.id]: (myPets[pet.id] || 0) + tier.count };
        localStorage.setItem('treePoints_pets', JSON.stringify(newPets));
        setMyPets(newPets);
        setHatchResult({ pet, total: tier.count });
        setShowModal(true);
        setIsHatching(false);
      }, 1500);
    } catch (err) {
      setToast({ title: '網路錯誤', msg: '請檢查連線' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <div style={{ 
      background: '#061a0e', 
      minHeight: '100vh', 
      width: '100vw', 
      position: 'fixed',
      top: 0, left: 0, bottom: 0, right: 0,
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 5000,
      overflow: 'hidden',
      color: '#fff',
      fontFamily: '"Noto Sans TC", sans-serif'
    }}>
      
      {/* Header */}
      <header style={{ padding: '24px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/dashboard')} style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.08)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft color="#4ade80" size={24} />
        </button>
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px 20px', borderRadius: '22px', border: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(74, 222, 128, 0.1)' }}>
          <span style={{ color: '#4ade80', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>{balance.toLocaleString()}</span>
          <span style={{ color: '#3e5c48', fontSize: '0.7rem', fontWeight: 900 }}>PTS</span>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '10px 24px 160px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, background: 'linear-gradient(to right, #fff, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('spirit_of_trees')}</h1>
          <p style={{ margin: '2px 0 0', color: '#3e5c48', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.2em' }}>{t('earth_guardian')}</p>
        </div>

        {activeTab === 'hatch' ? (
          <div className="fade-in">
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '40px', padding: '30px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              
              {/* Double Egg Animation Container - Reduced Size */}
              <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 24px' }}>
                <div className={isHatching ? 'egg-shake' : ''} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img 
                    id="egg-left" 
                    src="https://cdn.phototourl.com/free/2026-05-09-7d365162-479d-456d-b5f9-a1be725b76d4.png" 
                    className={isHatching ? 'hatch-crack-left' : ''}
                    style={{ width: '50%', height: '100%', objectFit: 'contain', objectPosition: 'right', transform: 'translateX(18px)', transition: 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} alt="egg-left" 
                  />
                  <img 
                    id="egg-right" 
                    src="https://cdn.phototourl.com/free/2026-05-09-6a6fbe21-a8a2-4a2f-930c-3fdd8def8bab.png" 
                    className={isHatching ? 'hatch-crack-right' : ''}
                    style={{ width: '50%', height: '100%', objectFit: 'contain', objectPosition: 'left', transform: 'translateX(-18px) translateY(-2px)', transition: 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} alt="egg-right" 
                  />
                </div>
                {/* Pet Appear Effect */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHatching ? 1 : 0, transition: 'opacity 0.5s', pointerEvents: 'none' }}>
                   <div className={isHatching ? 'pet-pulse' : ''} style={{ width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(74, 222, 128, 0.4) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {TIERS.map((tier, idx) => (
                  <button key={idx} onClick={() => setSelectedTier(idx)} style={{ 
                    padding: '16px 8px', borderRadius: '24px', border: selectedTier === idx ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedTier === idx ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.02)', transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{tier.icon}</div>
                    <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 800, opacity: selectedTier === idx ? 1 : 0.5 }}>{tier.name}</div>
                    <div style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 900, marginTop: '2px' }}>{tier.cost}</div>
                  </button>
                ))}
              </div>

              <button onClick={handleHatch} disabled={isHatching} style={{ 
                width: '100%', padding: '18px', borderRadius: '24px', background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#061a0e', fontWeight: 900, border: 'none', fontSize: '1.1rem',
                boxShadow: '0 10px 25px rgba(34, 197, 94, 0.2)', opacity: isHatching ? 0.6 : 1, cursor: 'pointer'
              }}>
                {isHatching ? t('hatching') : `${t('hatch')} (${TIERS[selectedTier].cost} PTS)`}
              </button>
            </div>
          </div>
        ) : (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {PET_DATABASE.map(pet => {
              const count = myPets[pet.id] || 0;
              return (
                <div key={pet.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '28px', padding: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', opacity: count > 0 ? 1 : 0.2 }}>
                  <img src={pet.icon} style={{ width: '55px', height: '55px', margin: '0 auto 10px', objectFit: 'contain' }} alt="" />
                  <div style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>{pet.name}</div>
                  <div style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 900, marginTop: '4px' }}>x {count}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Premium Glass Bottom Nav - Slimmer & Fixed Positioning */}
      <nav style={{ 
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', 
        width: '200px', height: '64px', 
        background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(30px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '0 6px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 5100
      }}>
        <button onClick={() => setActiveTab('hatch')} style={{ 
          flex: 1, height: '52px', borderRadius: '26px', border: 'none', 
          background: activeTab === 'hatch' ? 'rgba(255,255,255,0.1)' : 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
          cursor: 'pointer', transition: 'all 0.3s'
        }}>
          <span style={{ fontSize: '1.4rem' }}>🥚</span>
          <span style={{ fontSize: '8px', fontWeight: 900, color: activeTab === 'hatch' ? '#4ade80' : '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('hatch')}</span>
        </button>
        <button onClick={() => setActiveTab('collection')} style={{ 
          flex: 1, height: '52px', borderRadius: '26px', border: 'none', 
          background: activeTab === 'collection' ? 'rgba(255,255,255,0.1)' : 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
          cursor: 'pointer', transition: 'all 0.3s'
        }}>
          <span style={{ fontSize: '1.4rem' }}>📖</span>
          <span style={{ fontSize: '8px', fontWeight: 900, color: activeTab === 'collection' ? '#4ade80' : '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('book')}</span>
        </button>
      </nav>

      {/* Result Modal */}
      {showModal && hatchResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
           <div className="fade-in" style={{ background: 'linear-gradient(to bottom, #0d2d18, #061a0e)', borderRadius: '48px', padding: '48px 40px', textAlign: 'center', width: '100%', maxWidth: '340px', border: '1px solid rgba(74, 222, 128, 0.2)', boxShadow: '0 0 80px rgba(34, 197, 94, 0.15)' }}>
             <p style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.3em', marginBottom: '16px' }}>{t('new_spirit')}</p>
             <h2 style={{ color: 'white', margin: '0 0 24px', fontSize: '2rem', fontWeight: 900 }}>{hatchResult.pet.name}</h2>
             <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 40px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, transparent 70%)', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                <img src={hatchResult.pet.icon} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} alt="" />
             </div>
             <button onClick={() => setShowModal(false)} style={{ width: '100%', padding: '20px', borderRadius: '24px', background: '#fff', color: '#061a0e', fontWeight: 900, border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}>{t('got_it')}</button>
           </div>
        </div>
      )}

      <style>{`
        .egg-shake { animation: eggShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite; }
        @keyframes eggShake {
          10%, 90% { transform: translateX(-2px) rotate(-1deg); }
          30%, 70% { transform: translateX(3px) rotate(1deg); }
          50% { transform: translateX(-3px); }
        }
        .hatch-crack-left {
          transform: translateX(-80px) translateY(40px) rotate(-35deg) !important;
          opacity: 0 !important;
        }
        .hatch-crack-right {
          transform: translateX(80px) translateY(40px) rotate(35deg) !important;
          opacity: 0 !important;
        }
        .pet-pulse { animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.5); opacity: 0.1; } 100% { transform: scale(1); opacity: 0.4; } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}