import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scan, X } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function BarcodeScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [scanning]);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector();
        const detectLoop = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              handleScan(code);
            }
          } catch (e) {}
          if (scanning) {
            setTimeout(detectLoop, 100);
          }
        };
        detectLoop();
      } else {
        toast.info('Manual entry required - barcode scanning not supported on this device');
      }
    } catch (error) {
      toast.error('Camera access denied');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScan = (code) => {
    toast.success(`Scanned: ${code}`);
    onScan?.(code);
    setScanning(false);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {!scanning ? (
          <Button onClick={() => setScanning(true)} className="w-full h-24">
            <Scan size={24} className="mr-2" />
            Scan Barcode/QR
          </Button>
        ) : (
          <div className="space-y-3">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
            <div className="text-center text-sm text-muted-foreground">
              Position barcode within frame
            </div>
            <Button variant="outline" onClick={() => setScanning(false)} className="w-full">
              <X size={16} className="mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}