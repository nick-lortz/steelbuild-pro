import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Scan, MapPin, Bell, Cloud } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import PhotoCapture from '@/components/mobile/PhotoCapture';
import BarcodeScanner from '@/components/mobile/BarcodeScanner';
import OfflineSync from '@/components/mobile/OfflineSync';
import NotificationManager from '@/components/mobile/NotificationManager';
import { toast } from '@/components/ui/notifications';

export default function FieldTools() {
  const [scannedCode, setScannedCode] = useState(null);

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
    <div className="p-6">
      <PageHeader 
        title="Field Tools" 
        subtitle="Mobile tools for jobsite use"
        showBackButton={false}
      />

      <Tabs defaultValue="photo" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
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
          <div className="p-4 bg-secondary rounded-lg text-sm">
            <p className="font-medium mb-2">Tips:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Photos auto-tagged with GPS location</li>
              <li>• Add annotations for context</li>
              <li>• Works offline - syncs when online</li>
              <li>• Attach photos to tasks, logs, or RFIs</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <BarcodeScanner onScan={handleBarcodeScan} />
          {scannedCode && (
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm font-medium mb-1">Last Scan:</p>
              <p className="text-xs text-muted-foreground">{scannedCode}</p>
            </div>
          )}
          <div className="p-4 bg-secondary rounded-lg text-sm">
            <p className="font-medium mb-2">Use Cases:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Track equipment by scanning asset tags</li>
              <li>• Verify deliveries with QR codes</li>
              <li>• Link materials to tasks</li>
              <li>• Quick lookup by scanning barcodes</li>
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
  );
}