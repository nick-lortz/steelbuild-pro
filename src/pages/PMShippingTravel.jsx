import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PMProjectSelector from '@/components/pm-toolkit/PMProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Plane, Calculator } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function PMShippingTravel() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();

  const [shippingData, setShippingData] = useState({
    loads_shipped: 1,
    load_unload_hours: 2,
    distance_miles: 0,
    time_from_shop_hours: 0,
    ot_labor_rate: 45,
    labor_rate: 30,
    mileage_rate: 0.67
  });

  const [travelData, setTravelData] = useState({
    duration_weeks: 1,
    men: 4,
    distance_miles: 0,
    time_from_shop_hours: 0,
    travel_hours: 8,
    ot_labor_rate: 45,
    labor_rate: 30,
    mileage_rate: 0.67
  });

  const saveShippingMutation = useMutation({
    mutationFn: (data) => base44.entities.ShippingCostRecord.create({ ...data, project_id: activeProjectId }),
    onSuccess: () => {
      toast.success('Shipping cost saved');
      queryClient.invalidateQueries(['shippingRecords']);
    }
  });

  const saveTravelMutation = useMutation({
    mutationFn: (data) => base44.entities.TravelCostRecord.create({ ...data, project_id: activeProjectId }),
    onSuccess: () => {
      toast.success('Travel cost saved');
      queryClient.invalidateQueries(['travelRecords']);
    }
  });

  const calculateShipping = () => {
    const laborCost = (shippingData.load_unload_hours * shippingData.labor_rate) + 
                      (shippingData.time_from_shop_hours * shippingData.ot_labor_rate);
    const mileageCost = shippingData.distance_miles * shippingData.mileage_rate;
    const totalCost = (laborCost + mileageCost) * shippingData.loads_shipped;
    const perLoadCost = totalCost / shippingData.loads_shipped;
    return { totalCost, perLoadCost };
  };

  const calculateTravel = () => {
    const tripCost = (travelData.distance_miles * travelData.mileage_rate) + 
                     (travelData.travel_hours * travelData.ot_labor_rate);
    const totalTrips = travelData.duration_weeks * 2; // Round trip per week
    const totalCost = tripCost * totalTrips * travelData.men;
    const perHourTotal = (travelData.travel_hours * travelData.ot_labor_rate * totalTrips * travelData.men);
    return { totalCost, perHourTotal, totalTrips };
  };

  const shippingResults = calculateShipping();
  const travelResults = calculateTravel();

  const handleSaveShipping = () => {
    saveShippingMutation.mutate({
      ...shippingData,
      total_cost: shippingResults.totalCost,
      per_load_cost: shippingResults.perLoadCost,
      calculated_at: new Date().toISOString()
    });
  };

  const handleSaveTravel = () => {
    saveTravelMutation.mutate({
      ...travelData,
      total_cost: travelResults.totalCost,
      per_hour_total: travelResults.perHourTotal,
      calculated_at: new Date().toISOString()
    });
  };

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Select a project to use calculators
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E7EB]">Shipping & Travel Calculator</h1>
          <p className="text-sm text-[#9CA3AF]">PM Cost Impact Tools (Not Bid Estimating)</p>
        </div>
        <PMProjectSelector />
      </div>

      <Tabs defaultValue="shipping">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="shipping">
            <Truck className="w-4 h-4 mr-2" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="travel">
            <Plane className="w-4 h-4 mr-2" />
            Travel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Shipping Cost Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#9CA3AF]">Loads Shipped</label>
                  <Input
                    type="number"
                    value={shippingData.loads_shipped}
                    onChange={(e) => setShippingData(prev => ({ ...prev, loads_shipped: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Load/Unload Hours</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={shippingData.load_unload_hours}
                    onChange={(e) => setShippingData(prev => ({ ...prev, load_unload_hours: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Distance (miles)</label>
                  <Input
                    type="number"
                    value={shippingData.distance_miles}
                    onChange={(e) => setShippingData(prev => ({ ...prev, distance_miles: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Time from Shop (hours)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={shippingData.time_from_shop_hours}
                    onChange={(e) => setShippingData(prev => ({ ...prev, time_from_shop_hours: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">OT Labor Rate ($/hr)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={shippingData.ot_labor_rate}
                    onChange={(e) => setShippingData(prev => ({ ...prev, ot_labor_rate: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Labor Rate ($/hr)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={shippingData.labor_rate}
                    onChange={(e) => setShippingData(prev => ({ ...prev, labor_rate: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Mileage Rate ($/mi)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={shippingData.mileage_rate}
                    onChange={(e) => setShippingData(prev => ({ ...prev, mileage_rate: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,157,66,0.2)]">
                    <p className="text-sm text-[#9CA3AF]">Total Shipping Cost</p>
                    <p className="text-2xl font-bold text-[#FF9D42]">${shippingResults.totalCost.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.1)]">
                    <p className="text-sm text-[#9CA3AF]">Cost per Load</p>
                    <p className="text-2xl font-bold">${shippingResults.perLoadCost.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveShipping} disabled={saveShippingMutation.isPending}>
                Save Shipping Calculation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="travel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Travel Cost Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#9CA3AF]">Duration (weeks)</label>
                  <Input
                    type="number"
                    value={travelData.duration_weeks}
                    onChange={(e) => setTravelData(prev => ({ ...prev, duration_weeks: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Men</label>
                  <Input
                    type="number"
                    value={travelData.men}
                    onChange={(e) => setTravelData(prev => ({ ...prev, men: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Distance (miles)</label>
                  <Input
                    type="number"
                    value={travelData.distance_miles}
                    onChange={(e) => setTravelData(prev => ({ ...prev, distance_miles: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Time from Shop (hours)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={travelData.time_from_shop_hours}
                    onChange={(e) => setTravelData(prev => ({ ...prev, time_from_shop_hours: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Travel Hours (per trip)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={travelData.travel_hours}
                    onChange={(e) => setTravelData(prev => ({ ...prev, travel_hours: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">OT Labor Rate ($/hr)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={travelData.ot_labor_rate}
                    onChange={(e) => setTravelData(prev => ({ ...prev, ot_labor_rate: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Labor Rate ($/hr)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={travelData.labor_rate}
                    onChange={(e) => setTravelData(prev => ({ ...prev, labor_rate: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9CA3AF]">Mileage Rate ($/mi)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={travelData.mileage_rate}
                    onChange={(e) => setTravelData(prev => ({ ...prev, mileage_rate: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,157,66,0.2)]">
                    <p className="text-sm text-[#9CA3AF]">Total Travel Cost</p>
                    <p className="text-2xl font-bold text-[#FF9D42]">${travelResults.totalCost.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.1)]">
                    <p className="text-sm text-[#9CA3AF]">Per Hour Total</p>
                    <p className="text-2xl font-bold">${travelResults.perHourTotal.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.1)]">
                    <p className="text-sm text-[#9CA3AF]">Total Trips</p>
                    <p className="text-2xl font-bold">{travelResults.totalTrips}</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveTravel} disabled={saveTravelMutation.isPending}>
                Save Travel Calculation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}