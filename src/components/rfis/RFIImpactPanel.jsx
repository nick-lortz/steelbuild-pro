import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DollarSign, Clock, AlertTriangle } from 'lucide-react';

export default function RFIImpactPanel({ rfi, onChange }) {
  const estimatedCost = (rfi.est_detail_hours || 0) * 125; // $125/hr blended rate

  const handleChange = (field, value) => {
    onChange({ ...rfi, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={18} />
          Cost & Schedule Exposure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="est_detail_hours" className="flex items-center gap-1">
              <Clock size={14} />
              Detailing Hours
            </Label>
            <Input
              id="est_detail_hours"
              type="number"
              value={rfi.est_detail_hours || 0}
              onChange={(e) => handleChange('est_detail_hours', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          
          <div>
            <Label className="flex items-center gap-1">
              <DollarSign size={14} />
              Est. Cost
            </Label>
            <Input
              value={`$${estimatedCost.toLocaleString()}`}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="field_rework_risk">Field Rework Risk</Label>
          <Select
            value={rfi.field_rework_risk || 'low'}
            onValueChange={(val) => handleChange('field_rework_risk', val)}
          >
            <SelectTrigger id="field_rework_risk">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="med">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Label htmlFor="fabrication_hold">Fabrication Hold</Label>
          <Switch
            id="fabrication_hold"
            checked={rfi.fabrication_hold || false}
            onCheckedChange={(checked) => handleChange('fabrication_hold', checked)}
          />
        </div>

        {rfi.fabrication_hold && (
          <div className="bg-red-950/20 border border-red-800 rounded-md p-3">
            <p className="text-sm text-red-400 font-medium">
              ⚠️ Fab on hold — shop must wait for resolution
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}