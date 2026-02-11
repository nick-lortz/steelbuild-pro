import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function FinancialDefaults() {
  const [settings, setSettings] = useState({
    laborBurden: 35,
    taxRate: 8.5,
    overheadRate: 12,
    craneRate: 250,
    forkliftRate: 85,
    manLiftRate: 150
  });

  const handleSave = () => {
    toast.success('Financial defaults saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Financial Defaults</h3>
          <p className="text-sm text-muted-foreground">Set global financial parameters</p>
        </div>
        <Button onClick={handleSave}>
          <Save size={16} className="mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Labor & Burden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Labor Burden (%)</Label>
              <Input
                type="number"
                value={settings.laborBurden}
                onChange={(e) => setSettings({ ...settings, laborBurden: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Includes payroll taxes, insurance, benefits
              </p>
            </div>
            <div>
              <Label>Sales Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Overhead Rate (%)</Label>
              <Input
                type="number"
                value={settings.overheadRate}
                onChange={(e) => setSettings({ ...settings, overheadRate: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipment Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Crane ($/hour)</Label>
              <Input
                type="number"
                value={settings.craneRate}
                onChange={(e) => setSettings({ ...settings, craneRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Forklift ($/hour)</Label>
              <Input
                type="number"
                value={settings.forkliftRate}
                onChange={(e) => setSettings({ ...settings, forkliftRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Man Lift ($/hour)</Label>
              <Input
                type="number"
                value={settings.manLiftRate}
                onChange={(e) => setSettings({ ...settings, manLiftRate: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}