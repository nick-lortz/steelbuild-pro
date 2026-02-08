import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Truck, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function NotificationPreferences() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me(),
  });

  const [preferences, setPreferences] = useState(null);

  React.useEffect(() => {
    if (currentUser && !preferences) {
      setPreferences(currentUser.notification_preferences || {
        delivery_notifications: true,
        delivery_email: true,
        delivery_in_app: true,
        delivery_delayed: true,
        delivery_delivered: true,
        delivery_in_transit: true,
        rfi_notifications: true,
        change_order_notifications: true,
        task_notifications: true,
      });
    }
  }, [currentUser, preferences]);

  const updateMutation = useMutation({
    mutationFn: (newPreferences) => 
      apiClient.auth.updateMe({ notification_preferences: newPreferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Notification preferences updated');
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error('Failed to update preferences');
      console.error(error);
    },
  });

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(preferences);
  };

  if (isLoading || !preferences) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck size={18} className="text-amber-500" />
            Delivery Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-amber-500" />
              <div>
                <Label className="text-white font-medium">Enable Delivery Notifications</Label>
                <p className="text-xs text-zinc-400 mt-1">Receive alerts for delivery status changes</p>
              </div>
            </div>
            <Switch
              checked={preferences.delivery_notifications}
              onCheckedChange={() => handleToggle('delivery_notifications')}
            />
          </div>

          {preferences.delivery_notifications && (
            <>
              {/* Delivery Channels */}
              <div className="ml-8 space-y-3">
                <Label className="text-zinc-400 text-xs font-medium uppercase">Notification Channels</Label>
                
                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-blue-400" />
                    <div>
                      <Label className="text-white">Email Notifications</Label>
                      <p className="text-xs text-zinc-500 mt-0.5">Send email alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.delivery_email}
                    onCheckedChange={() => handleToggle('delivery_email')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-amber-400" />
                    <div>
                      <Label className="text-white">In-App Notifications</Label>
                      <p className="text-xs text-zinc-500 mt-0.5">Show notifications in app</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.delivery_in_app}
                    onCheckedChange={() => handleToggle('delivery_in_app')}
                  />
                </div>
              </div>

              {/* Status-Specific */}
              <div className="ml-8 space-y-3 pt-3 border-t border-zinc-800">
                <Label className="text-zinc-400 text-xs font-medium uppercase">Status Alerts</Label>
                
                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-400" />
                    <Label className="text-white">Delayed Deliveries</Label>
                  </div>
                  <Switch
                    checked={preferences.delivery_delayed}
                    onCheckedChange={() => handleToggle('delivery_delayed')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-400" />
                    <Label className="text-white">Delivered Packages</Label>
                  </div>
                  <Switch
                    checked={preferences.delivery_delivered}
                    onCheckedChange={() => handleToggle('delivery_delivered')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck size={16} className="text-blue-400" />
                    <Label className="text-white">In Transit Updates</Label>
                  </div>
                  <Switch
                    checked={preferences.delivery_in_transit}
                    onCheckedChange={() => handleToggle('delivery_in_transit')}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black">
            {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}
    </div>
  );
}
