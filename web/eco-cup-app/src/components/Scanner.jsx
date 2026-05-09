import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';

export default function Scanner({ onClose, onScanSuccess }) {
  const { t } = useI18n();
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;
    
    const startScanner = async () => {
      try {
        const readerElement = document.getElementById('reader');
        if (readerElement) readerElement.innerHTML = '';

        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            if (isMounted) {
              try {
                await html5QrCode.stop();
                onScanSuccess(decodedText);
              } catch (err) {
                onScanSuccess(decodedText);
              }
            }
          },
          () => {}
        );
        if (isMounted) setIsInitializing(false);
      } catch (err) {
        if (isMounted) {
          setError("相機不肯乖乖起床... 請檢查權限設定喔！");
          setIsInitializing(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      const cleanup = async () => {
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch(e) {}
        }
        const readerElement = document.getElementById('reader');
        if (readerElement) readerElement.innerHTML = '';
      };
      cleanup();
    };
  }, [onScanSuccess]);

  return (
    <div className="scanner-overlay fade-in" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(40, 54, 24, 0.95)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', zIndex: 2000 
    }}>
      <div className="scanner-header" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>{t('scan_title')}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.7 }}>找找看掃杯器上的 QR Code 🔍</p>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={24} />
        </button>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '320px', position: 'relative', padding: '0 20px' }}>
          
          {isInitializing && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1, color: 'white' }}>
              <Sparkles className="spin" size={32} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem' }}>正在喚醒掃描器...</p>
            </div>
          )}

          <div id="reader" style={{ borderRadius: '24px', overflow: 'hidden', background: '#000', boxShadow: '0 0 0 4px rgba(255,255,255,0.1)', minHeight: '280px' }}></div>
          
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '250px', height: '250px', border: '2px solid var(--primary-light)', borderRadius: '20px', pointerEvents: 'none' }}>
             <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid white', borderLeft: '4px solid white', borderRadius: '4px 0 0 0' }}></div>
             <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid white', borderRight: '4px solid white', borderRadius: '0 4px 0 0' }}></div>
             <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid white', borderLeft: '4px solid white', borderRadius: '0 0 0 4px' }}></div>
             <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid white', borderRight: '4px solid white', borderRadius: '0 0 4px 0' }}></div>
          </div>

          {error && <div style={{ color: '#FCA5A5', textAlign: 'center', marginTop: '24px', padding: '16px', background: 'rgba(153, 27, 27, 0.2)', borderRadius: '16px', fontSize: '0.9rem' }}>{error}</div>}
        </div>
      </div>
      
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
          <Camera size={18} /> 對準 QR Code 就能借杯囉
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>請保持光線充足，讓相機能看清楚它 ✨</p>
      </div>
    </div>
  );
}
