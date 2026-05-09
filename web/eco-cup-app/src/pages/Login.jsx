import { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Store as StoreIcon, ShieldCheck, ArrowLeft, Coffee, Activity, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../i18n';

export default function Login({ onLogin, type = 'user' }) {
  const { t } = useI18n();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '', // Also used for store_id and username
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Decide UI settings based on type
  let idLabelKey = 'email';
  let titleKey = 'login_title';
  let subtitleKey = 'login_subtitle';
  let icon = <Coffee size={40} color="white" />;

  if (type === 'store') {
    idLabelKey = 'store_id';
    titleKey = 'store_login_title';
    subtitleKey = 'processing';
    icon = <StoreIcon size={40} color="white" />;
  } else if (type === 'admin') {
    idLabelKey = 'admin_account';
    titleKey = 'admin_login_title';
    subtitleKey = 'processing';
    icon = <ShieldCheck size={40} color="white" />;
  }

  const API_BASE = `/api${type === 'user' ? '/auth' : type === 'store' ? '/store/auth' : '/admin/auth'}`;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint = isLoginMode ? '/login' : '/register';
      let payload = {};

      if (type === 'user') {
        payload = isLoginMode 
          ? { email: formData.email, password: formData.password }
          : { name: formData.name, email: formData.email, password: formData.password };
      } else if (type === 'store') {
        payload = { store_id: formData.email, password: formData.password };
      } else if (type === 'admin') {
        payload = { username: formData.email, password: formData.password };
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('connection_error'));
      }

      let userData = { token: data.access_token };
      if (type === 'user') {
        userData = { ...userData, uuid: data.uuid, name: data.name, email: data.email };
      } else if (type === 'store') {
        userData = { ...userData, store_id: data.store_id, name: data.store_name };
      } else if (type === 'admin') {
        userData = { ...userData, name: 'Admin' };
      }

      onLogin(userData);

    } catch (err) {
      console.error(err);
      setError(err.message === 'Failed to fetch' ? t('connection_error') : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '90vh' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          width: '88px', height: '88px', 
          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', 
          borderRadius: '28px', margin: '0 auto 20px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 24px rgba(96, 108, 56, 0.2)'
        }}>
          {icon}
        </div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>{t(titleKey)}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t(subtitleKey)}</p>
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {type === 'user' && !isLoginMode && (
            <div style={{ position: 'relative' }}>
              <UserIcon size={18} color="var(--primary)" style={{ position: 'absolute', left: '16px', top: '16px', zIndex: 1 }} />
              <input 
                type="text" 
                name="name" 
                placeholder={t('name')} 
                required 
                className="input-field"
                value={formData.name}
                onChange={handleChange}
                style={{ paddingLeft: '46px' }}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={18} color="var(--primary)" style={{ position: 'absolute', left: '16px', top: '16px', zIndex: 1 }} />
            <input 
              type={type === 'user' ? 'email' : 'text'} 
              name="email" 
              placeholder={t(idLabelKey)} 
              required 
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              style={{ paddingLeft: '46px' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="var(--primary)" style={{ position: 'absolute', left: '16px', top: '16px', zIndex: 1 }} />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder={t('password')} 
              required 
              className="input-field"
              value={formData.password}
              onChange={handleChange}
              style={{ paddingLeft: '46px', paddingRight: '46px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ 
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
              }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <div className="fade-in" style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', background: '#FEF2F2', padding: '10px', borderRadius: '10px' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '10px', height: '54px' }}>
            {loading ? <Activity className="spin" size={20} /> : isLoginMode ? <LogIn size={20} /> : <UserPlus size={20} />}
            {loading ? t('processing') : isLoginMode ? t('login_btn') : t('register_now')}
          </button>
        </form>

        {type === 'user' && (
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isLoginMode ? t('no_account') : t('has_account')}
            <button 
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', paddingLeft: '8px' }}
            >
              {isLoginMode ? t('register_now') : t('back_to_login')}
            </button>
          </p>
        )}
        
        {type !== 'user' && (
           <p style={{ textAlign: 'center', marginTop: '32px' }}>
             <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}>
               <ArrowLeft size={16} /> {t('back_home')}
             </a>
           </p>
        )}
      </div>
    </div>
  );
}


