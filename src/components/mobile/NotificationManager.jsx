import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function NotificationManager() {
  const [permission, setPermission] = useState('default');
  const [settings, setSettings] = useState({
    tasks: true,
    rfis: true,
    changeOrders: true,
    messages: true,
    dailyLogs: false
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('notification_settings') || '{}');
      setSettings({ ...settings, ...saved });
    } catch (e) {}
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notifications enabled');
      // Register for push notifications
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          // Push subscription logic would go here
        } catch (e) {
          console.error('Service worker registration failed:', e);
        }
      }
    } else {
      toast.error('Notification permission denied');
    }
  };

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('SteelBuild Pro', {
        body: 'Test notification from field',
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'test',
        requireInteraction: false
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {permission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
            Push Notifications
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission !== 'granted' && (
          <Button onClick={requestPermission} className="w-full">
            Enable Notifications
          </Button>
        )}

        {permission === 'granted' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tasks">Task Assignments</Label>
                <Switch
                  id="tasks"
                  checked={settings.tasks}
                  onCheckedChange={(checked) => saveSettings({ ...settings, tasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="rfis">RFI Updates</Label>
                <Switch
                  id="rfis"
                  checked={settings.rfis}
                  onCheckedChange={(checked) => saveSettings({ ...settings, rfis: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cos">Change Orders</Label>
                <Switch
                  id="cos"
                  checked={settings.changeOrders}
                  onCheckedChange={(checked) => saveSettings({ ...settings, changeOrders: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="messages">Messages & Mentions</Label>
                <Switch
                  id="messages"
                  checked={settings.messages}
                  onCheckedChange={(checked) => saveSettings({ ...settings, messages: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="logs">Daily Log Reminders</Label>
                <Switch
                  id="logs"
                  checked={settings.dailyLogs}
                  onCheckedChange={(checked) => saveSettings({ ...settings, dailyLogs: checked })}
                />
              </div>
            </div>

            <Button variant="outline" onClick={sendTestNotification} className="w-full">
              Send Test Notification
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}