import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Package, Truck, FileText, CheckCircle, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DELIVERY_TEMPLATES = [
  { id: 'joists', name: 'Joists', icon: Package, defaultUnit: 'LF', fields: ['joist_series', 'depth'] },
  { id: 'deck', name: 'Deck', icon: Package, defaultUnit: 'SQ', fields: ['gauge', 'profile'] },
  { id: 'misc_steel', name: 'Misc Steel', icon: Package, defaultUnit: 'EA', fields: ['item_type'] },
  { id: 'bolts_anchors', name: 'Bolts/Anchors', icon: Package, defaultUnit: 'EA', fields: ['size', 'grade'] },
  { id: 'plates', name: 'Plates', icon: Package, defaultUnit: 'EA', fields: ['thickness', 'dimensions'] },
  { id: 'beams_columns', name: 'Beams/Columns', icon: Truck, defaultUnit: 'EA', fields: ['section', 'length'] },
  { id: 'stairs_rails', name: 'Stairs/Rails', icon: Truck, defaultUnit: 'EA', fields: ['type'] },
  { id: 'custom', name: 'Custom', icon: FileText, defaultUnit: 'EA', fields: [] }
];

export default function DeliveryWizard({ delivery, projects, onSubmit, onCancel, isLoading }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    template_type: delivery?.template_type || 'custom',
    project_id: delivery?.project_id || '',
    package_name: delivery?.package_name || '',
    package_number: delivery?.package_number || '',
    description: delivery?.description || '',
    vendor_supplier: delivery?.vendor_supplier || '',
    ship_from_location: delivery?.ship_from_location || '',
    ship_to_location: delivery?.ship_to_location || '',
    requested_date: delivery?.requested_date?.split('T')[0] || '',
    requested_time_window: delivery?.requested_time_window || '',
    confirmed_date: delivery?.confirmed_date?.split('T')[0] || '',
    confirmed_time_window: delivery?.confirmed_time_window || '',
    delivery_type: delivery?.delivery_type || 'ship',
    carrier: delivery?.carrier || '',
    tracking_number: delivery?.tracking_number || '',
    pro_number: delivery?.pro_number || '',
    trailer_number: delivery?.trailer_number || '',
    po_number: delivery?.po_number || '',
    priority: delivery?.priority || 'medium',
    contact_name: delivery?.contact_name || '',
    contact_phone: delivery?.contact_phone || '',
    contact_email: delivery?.contact_email || '',
    receiving_requirements: delivery?.receiving_requirements || [],
    site_constraints: delivery?.site_constraints || {},
    line_items: delivery?.line_items || [],
    notes: delivery?.notes || ''
  });

  const selectedTemplate = DELIVERY_TEMPLATES.find(t => t.id === formData.template_type);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => {
    const newItem = {
      item_type: '',
      description: '',
      quantity: 0,
      unit: selectedTemplate?.defaultUnit || 'EA',
      weight_tons: 0,
      piece_marks: [],
      bundle_ids: [],
      drawing_reference: '',
      load_plan_notes: '',
      status: 'pending'
    };
    handleChange('line_items', [...formData.line_items, newItem]);
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...formData.line_items];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('line_items', updated);
  };

  const removeLineItem = (index) => {
    handleChange('line_items', formData.line_items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.project_id || !formData.package_name) {
      toast.error('Project and package name are required');
      return;
    }

    // Create clean submission data
    const submitData = {
      project_id: formData.project_id,
      template_type: formData.template_type || 'custom',
      package_name: formData.package_name,
      package_number: formData.package_number || '',
      description: formData.description || '',
      vendor_supplier: formData.vendor_supplier || '',
      ship_from_location: formData.ship_from_location || '',
      ship_to_location: formData.ship_to_location || '',
      requested_date: formData.requested_date || null,
      requested_time_window: formData.requested_time_window || '',
      confirmed_date: formData.confirmed_date || null,
      confirmed_time_window: formData.confirmed_time_window || '',
      delivery_type: formData.delivery_type || 'ship',
      carrier: formData.carrier || '',
      tracking_number: formData.tracking_number || '',
      pro_number: formData.pro_number || '',
      trailer_number: formData.trailer_number || '',
      po_number: formData.po_number || '',
      priority: formData.priority || 'medium',
      delivery_status: formData.delivery_status || 'draft',
      contact_name: formData.contact_name || '',
      contact_phone: formData.contact_phone || '',
      contact_email: formData.contact_email || '',
      receiving_requirements: formData.receiving_requirements || [],
      site_constraints: formData.site_constraints || {},
      line_items: formData.line_items || [],
      notes: formData.notes || ''
    };

    // Generate delivery number if creating new
    if (!delivery?.id) {
      submitData.delivery_number = `DEL-${Date.now().toString().slice(-6)}`;
    }

    // Calculate totals from line items
    if (submitData.line_items.length > 0) {
      submitData.weight_tons = submitData.line_items.reduce((sum, item) => sum + (parseFloat(item.weight_tons) || 0), 0);
      submitData.piece_count = submitData.line_items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    } else {
      submitData.weight_tons = 0;
      submitData.piece_count = 0;
    }

    // Set scheduled_date from confirmed or requested
    submitData.scheduled_date = submitData.confirmed_date || submitData.requested_date || null;

    // Auto-calculate on_time if actual_arrival_date exists
    if (formData.actual_arrival_date && submitData.scheduled_date) {
      const actual = new Date(formData.actual_arrival_date);
      const scheduled = new Date(submitData.scheduled_date);
      const diffDays = Math.round((actual - scheduled) / (1000 * 60 * 60 * 24));
      submitData.on_time = diffDays <= 0;
      submitData.days_variance = diffDays;
    }

    onSubmit(submitData);
  };

  const canProceed = () => {
    if (step === 1) return formData.project_id && formData.package_name;
    if (step === 2) return formData.requested_date;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {['Template', 'Details', 'Line Items', 'Review'].map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isActive ? 'border-amber-500 bg-amber-500 text-black' :
                  isComplete ? 'border-green-500 bg-green-500 text-black' :
                  'border-zinc-700 text-zinc-500'
                }`}>
                  {isComplete ? <CheckCircle size={16} /> : stepNum}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
              </div>
              {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > stepNum ? 'bg-green-500' : 'bg-zinc-800'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <div className="grid grid-cols-2 gap-3">
              {DELIVERY_TEMPLATES.map(template => {
                const Icon = template.icon;
                const isSelected = formData.template_type === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleChange('template_type', template.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Icon size={24} className={isSelected ? 'text-amber-500' : 'text-zinc-400'} />
                    <p className="text-sm font-medium mt-2">{template.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input
                value={formData.package_name}
                onChange={(e) => handleChange('package_name', e.target.value)}
                placeholder="e.g., Level 1 Columns"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Package Number</Label>
              <Input
                value={formData.package_number}
                onChange={(e) => handleChange('package_number', e.target.value)}
                placeholder="e.g., PKG-001"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>
      )}

      {/* Step 2: Logistics & Dates */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor/Supplier</Label>
              <Input
                value={formData.vendor_supplier}
                onChange={(e) => handleChange('vendor_supplier', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Type</Label>
              <Select value={formData.delivery_type} onValueChange={(v) => handleChange('delivery_type', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Ship</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ship From</Label>
              <Input
                value={formData.ship_from_location}
                onChange={(e) => handleChange('ship_from_location', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Ship To (Site Address)</Label>
              <Input
                value={formData.ship_to_location}
                onChange={(e) => handleChange('ship_to_location', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Requested Date *</Label>
              <Input
                type="date"
                value={formData.requested_date}
                onChange={(e) => handleChange('requested_date', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Requested Time</Label>
              <Input
                value={formData.requested_time_window}
                onChange={(e) => handleChange('requested_time_window', e.target.value)}
                placeholder="7AM-9AM"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Confirmed Date</Label>
              <Input
                type="date"
                value={formData.confirmed_date}
                onChange={(e) => handleChange('confirmed_date', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmed Time</Label>
              <Input
                value={formData.confirmed_time_window}
                onChange={(e) => handleChange('confirmed_time_window', e.target.value)}
                placeholder="8AM-10AM"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Carrier</Label>
              <Input
                value={formData.carrier}
                onChange={(e) => handleChange('carrier', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Tracking #</Label>
              <Input
                value={formData.tracking_number}
                onChange={(e) => handleChange('tracking_number', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Pro #</Label>
              <Input
                value={formData.pro_number}
                onChange={(e) => handleChange('pro_number', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trailer #</Label>
              <Input
                value={formData.trailer_number}
                onChange={(e) => handleChange('trailer_number', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>PO #</Label>
              <Input
                value={formData.po_number}
                onChange={(e) => handleChange('po_number', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Site Contact</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Site Constraints - Gate Hours</Label>
            <Input
              value={formData.site_constraints.gate_hours || ''}
              onChange={(e) => handleChange('site_constraints', { ...formData.site_constraints, gate_hours: e.target.value })}
              placeholder="e.g., 7AM-5PM weekdays only"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>
      )}

      {/* Step 3: Line Items */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button type="button" size="sm" onClick={addLineItem} className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {formData.line_items.map((item, idx) => (
              <Card key={idx} className="p-4 bg-zinc-800 border-zinc-700">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-zinc-400">Item #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(idx)}
                    className="h-6 w-6 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Item Type"
                    value={item.item_type}
                    onChange={(e) => updateLineItem(idx, 'item_type', e.target.value)}
                    className="bg-zinc-900 border-zinc-600"
                  />
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                    className="bg-zinc-900 border-zinc-600"
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={item.quantity || ''}
                    onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="bg-zinc-900 border-zinc-600"
                  />
                  <Input
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => updateLineItem(idx, 'unit', e.target.value)}
                    className="bg-zinc-900 border-zinc-600"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Weight (tons)"
                    value={item.weight_tons || ''}
                    onChange={(e) => updateLineItem(idx, 'weight_tons', parseFloat(e.target.value) || 0)}
                    className="bg-zinc-900 border-zinc-600"
                  />
                  <Input
                    placeholder="Drawing Ref"
                    value={item.drawing_reference}
                    onChange={(e) => updateLineItem(idx, 'drawing_reference', e.target.value)}
                    className="bg-zinc-900 border-zinc-600"
                  />
                </div>
              </Card>
            ))}
          </div>

          {formData.line_items.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No line items added yet</p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <Card className="p-4 bg-zinc-800 border-zinc-700">
            <h3 className="font-bold mb-3">Delivery Summary</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-zinc-400">Template:</span> <span className="text-white">{selectedTemplate?.name}</span></div>
              <div><span className="text-zinc-400">Package:</span> <span className="text-white">{formData.package_name}</span></div>
              <div><span className="text-zinc-400">Vendor:</span> <span className="text-white">{formData.vendor_supplier || '-'}</span></div>
              <div><span className="text-zinc-400">Carrier:</span> <span className="text-white">{formData.carrier || '-'}</span></div>
              <div><span className="text-zinc-400">Requested:</span> <span className="text-white">{formData.requested_date || '-'} {formData.requested_time_window}</span></div>
              <div><span className="text-zinc-400">Confirmed:</span> <span className="text-white">{formData.confirmed_date || '-'} {formData.confirmed_time_window}</span></div>
              <div><span className="text-zinc-400">Line Items:</span> <span className="text-white">{formData.line_items.length}</span></div>
              <div><span className="text-zinc-400">Total Weight:</span> <span className="text-white">{formData.line_items.reduce((sum, item) => sum + (item.weight_tons || 0), 0).toFixed(2)} tons</span></div>
            </div>
          </Card>

          {formData.line_items.length > 0 && (
            <Card className="p-4 bg-zinc-800 border-zinc-700">
              <h3 className="font-bold mb-3">Line Items ({formData.line_items.length})</h3>
              <div className="space-y-2">
                {formData.line_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-zinc-900 rounded">
                    <span className="text-white">{item.item_type || 'Item'} - {item.description}</span>
                    <span className="text-zinc-400">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-zinc-700"
        >
          <X size={16} className="mr-2" />
          Cancel
        </Button>

        <div className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-zinc-700"
            >
              <ChevronLeft size={16} className="mr-2" />
              Back
            </Button>
          )}

          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Next
              <ChevronRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              {isLoading ? 'Creating...' : delivery ? 'Update Delivery' : 'Create Delivery'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}