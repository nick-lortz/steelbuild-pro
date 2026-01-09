import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Scan, MapPin, Bell, Cloud, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScreenContainer from '@/components/layout/ScreenContainer';
import PageHeader from '@/components/ui/PageHeader';
import PhotoCapture from '@/components/mobile/PhotoCapture';
import BarcodeScanner from '@/components/mobile/BarcodeScanner';
import OfflineSync from '@/components/mobile/OfflineSync';
import NotificationManager from '@/components/mobile/NotificationManager';
import { useOfflineSync } from '@/components/shared/hooks/useOfflineSync';
import { toast } from '@/components/ui/notifications';

export default function FieldTools() {
  const [scannedCode, setScannedCode] = useState(null);
  const { isOnline, syncStatus, pendingCount, syncPendingChanges } = useOfflineSync('DailyLog');

  const handlePhotoCapture = async (data) => {
    console.log('Photo captured:', data);
    // Save photo to relevant entity (task, daily log, etc.)
    toast.success('Photo saved');
  };

  const handleBarcodeScan = async (code) => {
    setScannedCode(code);
    // Look up equipment or delivery by barcode
    const equipment = await base44.entities.Resource.filter({ 
      name: code 
    }).catch(() => []);
    
    if (equipment.length > 0) {
      toast.success(`Found: ${equipment[0].name}`);
    } else {
      toast.info(`Scanned: ${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Field Tools</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">JOBSITE UTILITIES</p>
            </div>
            <div className="flex items-center gap-3">
              {!isOnline && (
                <Badge variant="outline" className="border-amber-500 text-amber-400 gap-1.5">
                  <WifiOff size={12} />
                  OFFLINE
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="border-blue-500 text-blue-400 gap-1.5">
                  <RefreshCw size={12} />
                  {pendingCount} PENDING
                </Badge>
              )}
              {isOnline && pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={syncPendingChanges}
                  disabled={syncStatus === 'syncing'}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-7"
                >
                  {syncStatus === 'syncing' ? 'SYNCING...' : 'SYNC NOW'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs defaultValue="photo" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="photo">
              <Camera size={14} className="mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="scan">
              <Scan size={14} className="mr-2" />
              Scan
            </TabsTrigger>
            <TabsTrigger value="sync">
              <Cloud size={14} className="mr-2" />
              Sync
            </TabsTrigger>
            <TabsTrigger value="notify">
              <Bell size={14} className="mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="space-y-4">
            <PhotoCapture onPhotoCapture={handlePhotoCapture} />
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded text-xs">
              <p className="font-bold text-zinc-400 uppercase tracking-widest mb-3">TIPS</p>
              <ul className="space-y-1.5 text-zinc-500">
                <li>• GPS auto-tagging</li>
                <li>• Offline support</li>
                <li>• Link to tasks/logs/RFIs</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <BarcodeScanner onScan={handleBarcodeScan} />
            {scannedCode && (
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">LAST SCAN</p>
                <p className="text-sm text-white font-mono">{scannedCode}</p>
              </div>
            )}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded text-xs">
              <p className="font-bold text-zinc-400 uppercase tracking-widest mb-3">USE CASES</p>
              <ul className="space-y-1.5 text-zinc-500">
                <li>• Equipment asset tracking</li>
                <li>• Delivery verification</li>
                <li>• Material linkage</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="sync">
            <OfflineSync />
          </TabsContent>

          <TabsContent value="notify">
            <NotificationManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}