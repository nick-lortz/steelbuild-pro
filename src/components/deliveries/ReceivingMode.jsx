import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Camera, AlertTriangle, Package, Minus, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function ReceivingMode({ delivery, onComplete, onCancel }) {
  const [lineItems, setLineItems] = useState(
    delivery.line_items?.map(item => ({
      ...item,
      received_quantity: item.received_quantity || 0,
      notes: '',
      has_damage: false,
      damage_notes: ''
    })) || []
  );
  const [receiverName, setReceiverName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const updateQuantity = (index, delta) => {
    const updated = [...lineItems];
    const newQty = Math.max(0, Math.min(updated[index].quantity, (updated[index].received_quantity || 0) + delta));
    updated[index].received_quantity = newQty;
    setLineItems(updated);
  };

  const toggleDamage = (index) => {
    const updated = [...lineItems];
    updated[index].has_damage = !updated[index].has_damage;
    setLineItems(updated);
  };

  const handleComplete = () => {
    if (!receiverName) {
      toast.error('Receiver name is required');
      return;
    }

    const allReceived = lineItems.every(item => item.received_quantity === item.quantity);
    const hasDamage = lineItems.some(item => item.has_damage);

    const updatedDelivery = {
      ...delivery,
      line_items: lineItems,
      delivery_status: allReceived && !hasDamage ? 'received' : 'partially_received',
      actual_date: new Date().toISOString().split('T')[0],
      actual_arrival_date: new Date().toISOString(),
      receiving_report: {
        receiver_name: receiverName,
        driver_name: driverName,
        received_timestamp: new Date().toISOString(),
        notes: generalNotes
      }
    };

    // Add exceptions for damaged items
    const exceptions = lineItems
      .filter(item => item.has_damage)
      .map(item => ({
        exception_type: 'damage',
        description: `${item.item_type}: ${item.damage_notes}`,
        created_date: new Date().toISOString(),
        resolved: false
      }));

    if (exceptions.length > 0) {
      updatedDelivery.exceptions = [...(delivery.exceptions || []), ...exceptions];
      updatedDelivery.delivery_status = 'exception';
    }

    onComplete(updatedDelivery);
  };

  const totalExpected = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalReceived = lineItems.reduce((sum, item) => sum + (item.received_quantity || 0), 0);
  const progress = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Receiving Progress</span>
            <span className="text-sm text-zinc-400">{totalReceived} / {totalExpected} pieces</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items Checklist */}
      <div className="space-y-3">
        <Label className="text-sm font-bold uppercase tracking-wider">Line Items</Label>
        {lineItems.map((item, idx) => (
          <Card key={idx} className={`border-2 ${
            item.has_damage ? 'border-red-500 bg-red-950/20' : 
            item.received_quantity === item.quantity ? 'border-green-500 bg-green-950/20' : 
            'border-zinc-700 bg-zinc-900'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-medium">{item.item_type || `Item ${idx + 1}`}</p>
                  <p className="text-xs text-zinc-400">{item.description}</p>
                  {item.drawing_reference && (
                    <p className="text-xs text-zinc-500 mt-1">Dwg: {item.drawing_reference}</p>
                  )}
                </div>
                <Badge className={
                  item.received_quantity === item.quantity ? 'bg-green-600' :
                  item.received_quantity > 0 ? 'bg-orange-500' : 'bg-zinc-700'
                }>
                  {item.received_quantity === item.quantity ? 'Complete' : 
                   item.received_quantity > 0 ? 'Partial' : 'Pending'}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => updateQuantity(idx, -1)}
                    disabled={item.received_quantity === 0}
                    className="h-8 w-8 border-zinc-700"
                  >
                    <Minus size={14} />
                  </Button>
                  <div className="text-center min-w-[80px]">
                    <div className="text-lg font-bold">{item.received_quantity}</div>
                    <div className="text-xs text-zinc-500">of {item.quantity}</div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => updateQuantity(idx, 1)}
                    disabled={item.received_quantity === item.quantity}
                    className="h-8 w-8 border-zinc-700"
                  >
                    <Plus size={14} />
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={item.has_damage ? "destructive" : "outline"}
                  onClick={() => toggleDamage(idx)}
                  className="ml-auto"
                >
                  <AlertTriangle size={14} className="mr-2" />
                  {item.has_damage ? 'Damaged' : 'Report Damage'}
                </Button>
              </div>

              {item.has_damage && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Damage Notes</Label>
                  <Textarea
                    value={item.damage_notes || ''}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].damage_notes = e.target.value;
                      setLineItems(updated);
                    }}
                    rows={2}
                    className="bg-zinc-800 border-zinc-700 text-xs"
                    placeholder="Describe damage..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Receiving Report */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Receiving Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Receiver Name *</Label>
              <Input
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Your name"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={3}
              className="bg-zinc-800 border-zinc-700"
              placeholder="General receiving notes..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button 
          onClick={handleComplete}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 size={16} className="mr-2" />
          Complete Receiving
        </Button>
      </div>
    </div>
  );
}