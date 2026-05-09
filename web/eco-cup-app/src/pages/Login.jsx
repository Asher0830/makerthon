import { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Store as StoreIcon, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin, type = 'user' }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '', // Also used for store_id and username
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Decide API settings based on type
  let apiPath = '';
  let idLabel = 'Email';
  let title = '環保杯管理系統';
  let icon = '🥤';

  if (type === 'user') {
    apiPath = '/auth';
    idLabel = 'Email';
    title = 'Eco-Cup 會員登入';
  } else if (type === 'store') {
    apiPath = '/store/auth';
    idLabel = '店家 ID';
    title = '店家管理後台';
    icon = '🏬';
  } else if (type === 'admin') {
    apiPath = '/admin/auth';
    idLabel = '管理員帳號';
    title = '超級管理員後台';
    icon = '👑';
  }

  const API_BASE = `/api${apiPath}`;

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
        throw new Error(data.detail || '發生錯誤，請檢查您的輸入');
      }

      // Format response data consistently for App.js
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
      setError(err.message === 'Failed to fetch' 
        ? '無法連線到伺服器' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '20px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
          {icon}
        </div>
        <h1>{title}</h1>
        {type === 'user' && <p>一秒借杯，環保無負擔</p>}
      </div>

      <div style={{ width: '100%', maxWidth: '320px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {type === 'user' && !isLoginMode && (
            <div className="input-group">
              <UserIcon size={20} color="var(--text-muted)" style={{ position: 'absolute', margin: '12px' }} />
              <input 
                type="text" 
                name="name" 
                placeholder="姓名" 
                required 
                value={formData.name}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 'var(--radius)', border: '1px solid #e5e7eb', fontSize: '1rem' }}
              />
            </div>
          )}

          <div className="input-group" style={{ position: 'relative' }}>
            {type === 'user' ? <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', margin: '12px' }} /> :
             type === 'store' ? <StoreIcon size={20} color="var(--text-muted)" style={{ position: 'absolute', margin: '12px' }} /> :
             <ShieldCheck size={20} color="var(--text-muted)" style={{ position: 'absolute', margin: '12px' }} />}
            <input 
              type={type === 'user' ? 'email' : 'text'} 
              name="email" 
              placeholder={idLabel} 
              required 
              value={formData.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 'var(--radius)', border: '1px solid #e5e7eb', fontSize: '1rem' }}
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', margin: '12px' }} />
            <input 
              type="password" 
              name="password" 
              placeholder="密碼" 
              required 
              value={formData.password}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 'var(--radius)', border: '1px solid #e5e7eb', fontSize: '1rem' }}
            />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            <LogIn size={20} />
            {loading ? '處理中...' : '登入'}
          </button>
        </form>

        {type === 'user' && (
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {isLoginMode ? '還沒有帳號嗎？' : '已經有帳號了？'}
            <button 
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', paddingLeft: '8px' }}
            >
              {isLoginMode ? '立即註冊' : '返回登入'}
            </button>
          </p>
        )}
        
        {type !== 'user' && (
           <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem' }}>
             <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← 返回會員首頁</a>
           </p>
        )}
      </div>
    </div>
  );
}
