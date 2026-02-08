import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const INSPECTION_TEMPLATES = {
  mobile_crane: [
    'Brakes & parking lock',
    'Hydraulic hoses & lines',
    'Wire rope condition',
    'Hook & latch',
    'Boom & mast condition',
    'Controls responsive',
    'Emergency stops functional',
    'Safety labels visible'
  ],
  tower_crane: [
    'Tower base bolts',
    'Hoist mechanism',
    'Slew ring condition',
    'Electrical connections',
    'Wind indicator operational',
    'Load chart visible',
    'Red danger markings',
    'Concrete foundation'
  ],
  man_lift: [
    'Platform condition',
    'Safety rails intact',
    'Gate functioning',
    'Hydraulic fluid level',
    'Tires/wheels condition',
    'Emergency descent system',
    'Decals & warnings present'
  ],
  forklift: [
    'Tires/wheels',
    'Forks aligned',
    'Mast operation smooth',
    'Hydraulic leaks',
    'Brakes responsive',
    'Horn operational',
    'Lights functional'
  ]
};

export default function InspectionForm({ projectId, equipmentId, equipmentType, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    inspector_name: '',
    inspector_license: '',
    shift: 'day',
    items: INSPECTION_TEMPLATES[equipmentType] || [],
    checkedItems: {},
    defects: [],
    equipment_cleared: true
  });

  const [newDefect, setNewDefect] = useState({ desc: '', severity: 'minor', action: '' });

  const createInspection = useMutation({
    mutationFn: async () => {
      const defectsWithAction = formData.defects.map(d => ({
        ...d,
        required_maintenance: d.severity === 'critical' || d.severity === 'major'
      }));

      const allPassed = formData.items.every(item => formData.checkedItems[item]);

      const inspection = await apiClient.entities.InspectionChecklist.create({
        project_id: projectId,
        equipment_id: equipmentId,
        equipment_type: equipmentType,
        inspection_date: new Date().toISOString().split('T')[0],
        shift: formData.shift,
        inspector_name: formData.inspector_name,
        inspector_license: formData.inspector_license,
        inspection_items: formData.items.map(item => ({
          item_name: item,
          checked: formData.checkedItems[item] || false,
          condition: formData.checkedItems[item] ? 'pass' : 'fail'
        })),
        overall_status: allPassed && formData.defects.length === 0 ? 'pass' : formData.defects.some(d => d.severity === 'critical') ? 'fail' : 'conditional_pass',
        defects_found: defectsWithAction,
        equipment_cleared_for_use: formData.equipment_cleared && allPassed,
        completion_time: new Date().toISOString()
      });

      return inspection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', projectId] });
      toast.success('Inspection completed');
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save inspection');
    }
  });

  const handleItemCheck = (item) => {
    setFormData(prev => ({
      ...prev,
      checkedItems: {
        ...prev.checkedItems,
        [item]: !prev.checkedItems[item]
      }
    }));
  };

  const handleAddDefect = () => {
    if (newDefect.desc && newDefect.severity) {
      setFormData(prev => ({
        ...prev,
        defects: [...prev.defects, newDefect]
      }));
      setNewDefect({ desc: '', severity: 'minor', action: '' });
    }
  };

  const handleRemoveDefect = (idx) => {
    setFormData(prev => ({
      ...prev,
      defects: prev.defects.filter((_, i) => i !== idx)
    }));
  };

  const itemsChecked = Object.values(formData.checkedItems).filter(v => v).length;
  const totalItems = formData.items.length;
  const passRate = ((itemsChecked / totalItems) * 100).toFixed(0);
  const hasFailures = formData.defects.some(d => d.severity === 'critical');

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Equipment Inspection</span>
          <Badge>{equipmentType.toUpperCase().replace(/_/g, ' ')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inspector Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Inspector Name</label>
            <Input
              placeholder="Name"
              value={formData.inspector_name}
              onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">License/Cert #</label>
            <Input
              placeholder="License number"
              value={formData.inspector_license}
              onChange={(e) => setFormData(prev => ({ ...prev, inspector_license: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Shift</label>
            <Select value={formData.shift} onValueChange={(val) => setFormData(prev => ({ ...prev, shift: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="swing">Swing</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-zinc-300">Inspection Progress</p>
            <Badge>{passRate}%</Badge>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${passRate}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">{itemsChecked} of {totalItems} items checked</p>
        </div>

        {/* Checklist */}
        <div className="space-y-2 p-4 bg-zinc-800 rounded-lg">
          <p className="text-xs font-bold uppercase text-zinc-400 mb-3">Inspection Checklist</p>
          {formData.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-700">
              <Checkbox
                checked={formData.checkedItems[item] || false}
                onCheckedChange={() => handleItemCheck(item)}
                className="rounded"
              />
              <span className={`text-sm ${formData.checkedItems[item] ? 'text-green-400 line-through' : 'text-zinc-300'}`}>
                {item}
              </span>
              {formData.checkedItems[item] && (
                <CheckCircle2 size={14} className="text-green-500 ml-auto" />
              )}
            </div>
          ))}
        </div>

        {/* Defects */}
        <div className="space-y-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-xs font-bold uppercase text-red-500">Defects Found</p>

          {/* Add Defect */}
          <div className="space-y-2 bg-zinc-800 p-3 rounded">
            <Textarea
              placeholder="Describe defect..."
              value={newDefect.desc}
              onChange={(e) => setNewDefect(prev => ({ ...prev, desc: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
              rows="2"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newDefect.severity} onValueChange={(val) => setNewDefect(prev => ({ ...prev, severity: val }))}>
                <SelectTrigger className="bg-zinc-700 border-zinc-600 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAddDefect}
                disabled={!newDefect.desc}
                className="bg-red-700 hover:bg-red-800"
              >
                Add Defect
              </Button>
            </div>
            <Textarea
              placeholder="Corrective action..."
              value={newDefect.action}
              onChange={(e) => setNewDefect(prev => ({ ...prev, action: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-xs"
              rows="1"
            />
          </div>

          {/* Listed Defects */}
          {formData.defects.length > 0 && (
            <div className="space-y-1">
              {formData.defects.map((defect, idx) => (
                <div key={idx} className="p-2 bg-zinc-800 rounded text-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-zinc-300">{defect.desc}</p>
                      <p className={`text-[10px] mt-1 ${
                        defect.severity === 'critical' ? 'text-red-400' :
                        defect.severity === 'major' ? 'text-orange-400' :
                        'text-yellow-400'
                      }`}>
                        {defect.severity.toUpperCase()} • {defect.action || 'No action specified'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveDefect(idx)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Failure Warning */}
        {hasFailures && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-400">CRITICAL DEFECTS FOUND</p>
              <p className="text-xs text-red-300">Equipment must not be cleared for use until resolved</p>
            </div>
          </div>
        )}

        {/* Clear for Use */}
        <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded">
          <Checkbox
            checked={formData.equipment_cleared && !hasFailures}
            disabled={hasFailures}
            onCheckedChange={(val) => setFormData(prev => ({ ...prev, equipment_cleared: val }))}
            className="rounded"
          />
          <label className="text-sm font-bold text-zinc-300">
            Equipment cleared for use
          </label>
        </div>

        <Button
          onClick={() => createInspection.mutate()}
          disabled={createInspection.isPending || !formData.inspector_name || itemsChecked === 0}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {createInspection.isPending ? 'Saving...' : 'Complete Inspection'}
        </Button>
      </CardContent>
    </Card>
  );
}