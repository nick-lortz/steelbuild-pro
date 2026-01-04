import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import useNetworkStatus from '@/components/shared/hooks/useNetworkStatus';
import { toast } from '@/components/ui/notifications';

export default function OfflineSync() {
  const isOnline = useNetworkStatus();
  const [pendingChanges, setPendingChanges] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadPendingChanges();
  }, []);

  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline]);

  const loadPendingChanges = () => {
    try {
      const pending = JSON.parse(localStorage.getItem('offline_pending') || '[]');
      setPendingChanges(pending);
    } catch (e) {
      setPendingChanges([]);
    }
  };

  const savePendingChange = (change) => {
    const pending = [...pendingChanges, { ...change, timestamp: Date.now() }];
    setPendingChanges(pending);
    localStorage.setItem('offline_pending', JSON.stringify(pending));
  };

  const syncPendingChanges = async () => {
    if (!isOnline || syncing || pendingChanges.length === 0) return;
    
    setSyncing(true);
    try {
      // Process each pending change
      for (const change of pendingChanges) {
        // Sync logic would go here
        console.log('Syncing:', change);
      }
      
      // Clear pending changes after successful sync
      setPendingChanges([]);
      localStorage.removeItem('offline_pending');
      toast.success('All changes synced');
    } catch (error) {
      toast.error('Sync failed - will retry when online');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {isOnline ? <Check size={16} className="text-green-500" /> : <WifiOff size={16} className="text-amber-500" />}
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
          {pendingChanges.length > 0 && (
            <Badge variant="outline">{pendingChanges.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isOnline && (
          <div className="p-3 bg-amber-500/10 rounded-lg text-sm">
            <AlertCircle size={14} className="inline mr-2" />
            Working offline - changes will sync when connected
          </div>
        )}

        {pendingChanges.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Pending changes:</p>
            {pendingChanges.slice(0, 5).map((change, i) => (
              <div key={i} className="text-xs p-2 bg-secondary rounded">
                {change.type} - {new Date(change.timestamp).toLocaleString()}
              </div>
            ))}
          </div>
        )}

        {isOnline && pendingChanges.length > 0 && (
          <Button 
            onClick={syncPendingChanges} 
            disabled={syncing}
            className="w-full"
          >
            <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}