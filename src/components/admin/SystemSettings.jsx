import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Upload } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    companyName: 'SteelBuild Pro',
    timezone: 'America/Phoenix',
    logo: null
  });

  const handleSave = () => {
    toast.success('System settings saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">System Settings</h3>
          <p className="text-sm text-muted-foreground">Configure application-wide settings</p>
        </div>
        <Button onClick={handleSave}>
          <Save size={16} className="mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>
            <div>
              <Label>Default Timezone</Label>
              <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Phoenix">America/Phoenix (MST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Logo</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Click to upload logo</p>
                <Button variant="outline" size="sm">Choose File</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Email notification templates and delivery settings configured per user in Notification Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}