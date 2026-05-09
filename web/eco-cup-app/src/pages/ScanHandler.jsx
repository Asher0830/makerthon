import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { QrCode, CheckCircle2, XCircle } from 'lucide-react';

export default function ScanHandler({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState(t('scan_success') || '處理中...');

  const scannerId = searchParams.get('scanner_id');
  const storeId = searchParams.get('store_id') || '';

  useEffect(() => {
    if (!scannerId) {
      setStatus('error');
      setMessage('無效的 QR Code (缺少 scanner_id)');
      return;
    }

    if (!user) {
      // 未登入，將參數存起來，並導向登入頁
      sessionStorage.setItem('pendingScan', JSON.stringify({ scanner_id: scannerId, store_id: storeId }));
      navigate('/login', { replace: true });
      return;
    }

    // 已登入，直接打 API
    const processScan = async () => {
      try {
        const response = await fetch('/api/qrcode/scan', {
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

        setStatus('success');
        setMessage(t('scan_member_ok') || '會員登入成功，請進行掃杯');

        // 清除 pending (如果有的話)
        sessionStorage.removeItem('pendingScan');

        // 2秒後跳回首頁
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);

      } catch (err) {
        setStatus('error');
        setMessage(err.message);
      }
    };

    processScan();
  }, [user, scannerId, storeId, navigate, t]);

  return (
    <div className="content-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
      <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '300px' }}>
        {status === 'processing' && <QrCode size={48} className="animate-pulse" color="var(--primary)" />}
        {status === 'success' && <CheckCircle2 size={48} color="var(--success)" />}
        {status === 'error' && <XCircle size={48} color="var(--danger)" />}
        
        <h2 style={{ margin: 0 }}>{status === 'error' ? '掃描失敗' : '掃描處理中'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{message}</p>

        {status === 'error' && (
          <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })} style={{ marginTop: '16px' }}>
            返回首頁
          </button>
        )}
      </div>
    </div>
  );
}
