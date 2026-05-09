import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function Scanner({ onClose, onScanSuccess }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;
    
    const startScanner = async () => {
      try {
        // Ensure container is empty before starting
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
              console.log("Scan success, stopping...");
              try {
                await html5QrCode.stop();
                onScanSuccess(decodedText);
              } catch (err) {
                console.error("Failed to stop scanner on success:", err);
                // Even if stop fails, we notify success
                onScanSuccess(decodedText);
              }
            }
          },
          (errorMessage) => {
            // Ignore parse errors
          }
        );
      } catch (err) {
        if (isMounted) {
          setError("無法啟動相機，請確認已授權相機權限或使用 HTTPS。");
          console.error("Scanner Error:", err);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      startScanner();
    }, 200); // Increased delay for stability

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      const cleanup = async () => {
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
              console.log("Scanner stopped on unmount.");
            }
            scannerRef.current.clear();
          } catch(e) {
            console.warn("Cleanup error:", e);
          }
        }
        // Force clear the container
        const readerElement = document.getElementById('reader');
        if (readerElement) {
          readerElement.innerHTML = '';
        }
      };
      
      cleanup();
    };
  }, [onScanSuccess]);

  return (
    <div className="scanner-overlay">
      <div className="scanner-header">
        <h2 style={{ margin: 0 }}>掃描店家 QR Code</h2>
        <button className="close-btn" onClick={onClose}>
          <X size={28} />
        </button>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', position: 'relative', padding: '0 16px' }}>
          <div id="reader" style={{ borderRadius: '16px', overflow: 'hidden', background: '#000' }}></div>
          {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '16px', padding: '0 16px', fontWeight: 'bold' }}>{error}</p>}
        </div>
      </div>
      
      <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
        請將店家的借杯 QR Code 放入框內
      </div>
    </div>
  );
}
