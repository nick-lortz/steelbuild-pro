import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTree, Package, Weight, Truck, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SequenceLoadView({ loads, pieces, onSelectLoad }) {
  // Group pieces by sequence
  const sequenceData = useMemo(() => {
    const sequences = {};
    
    pieces.forEach(piece => {
      const seq = piece.sequence_zone || 'Unassigned';
      if (!sequences[seq]) {
        sequences[seq] = {
          name: seq,
          pieces: [],
          totalWeight: 0,
          loads: new Set(),
          statuses: {
            in_shop: 0,
            ready_for_shipping: 0,
            on_truck: 0,
            on_site: 0,
            erected: 0
          }
        };
      }
      
      sequences[seq].pieces.push(piece);
      sequences[seq].totalWeight += piece.weight || 0;
      sequences[seq].statuses[piece.current_status] = (sequences[seq].statuses[piece.current_status] || 0) + 1;
      
      if (piece.load_truck_id) {
        sequences[seq].loads.add(piece.load_truck_id);
      }
    });
    
    // Convert sets to arrays and sort
    return Object.values(sequences)
      .map(seq => ({
        ...seq,
        loadIds: Array.from(seq.loads),
        percentComplete: ((seq.statuses.on_site + seq.statuses.erected) / seq.pieces.length * 100) || 0
      }))
      .sort((a, b) => {
        if (a.name === 'Unassigned') return 1;
        if (b.name === 'Unassigned') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [pieces]);

  const getLoadForSequence = (loadIds) => {
    return loads.filter(l => loadIds.includes(l.id));
  };

  return (
    <div className="space-y-4">
      {sequenceData.map(seq => {
        const sequenceLoads = getLoadForSequence(seq.loadIds);
        
        return (
          <Card key={seq.name} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <ListTree size={18} className="text-amber-500" />
                  {seq.name}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Progress</div>
                    <div className="text-sm font-bold text-white">{seq.percentComplete.toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Pieces</div>
                    <div className="text-sm font-bold text-white">{seq.pieces.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Weight</div>
                    <div className="text-sm font-bold text-white">{seq.totalWeight.toFixed(1)}t</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Breakdown */}
              <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="text-xs text-zinc-500 mb-1">In Shop</div>
                  <div className="text-lg font-bold text-zinc-400">{seq.statuses.in_shop + seq.statuses.ready_for_shipping}</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="text-xs text-zinc-500 mb-1">On Truck</div>
                  <div className="text-lg font-bold text-amber-500">{seq.statuses.on_truck}</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="text-xs text-zinc-500 mb-1">On Site</div>
                  <div className="text-lg font-bold text-blue-500">{seq.statuses.on_site}</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="text-xs text-zinc-500 mb-1">Erected</div>
                  <div className="text-lg font-bold text-green-500">{seq.statuses.erected}</div>
                </div>
                <div className="p-2 bg-zinc-800 rounded text-center">
                  <div className="text-xs text-zinc-500 mb-1">Loads</div>
                  <div className="text-lg font-bold text-white">{sequenceLoads.length}</div>
                </div>
              </div>

              {/* Associated Loads */}
              {sequenceLoads.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Truck size={12} />
                    Associated Loads
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sequenceLoads.map(load => {
                      const loadPiecesInSeq = seq.pieces.filter(p => p.load_truck_id === load.id).length;
                      
                      return (
                        <div
                          key={load.id}
                          onClick={() => onSelectLoad(load)}
                          className="p-3 bg-zinc-800/50 border border-zinc-700 rounded hover:border-amber-500 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-white text-sm">{load.load_number}</p>
                              <p className="text-xs text-zinc-500">{load.truck_id || 'TBD'}</p>
                            </div>
                            <Badge className={cn(
                              "text-[10px]",
                              load.status === 'complete' ? 'bg-zinc-700' :
                              load.status === 'in_transit' ? 'bg-amber-500 text-black' :
                              load.status === 'arrived' ? 'bg-green-600' :
                              'bg-blue-600'
                            )}>
                              {load.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <div className="flex items-center gap-1">
                              <Package size={12} />
                              <span className="text-white font-semibold">{loadPiecesInSeq}</span>
                              <span>from seq</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Weight size={12} />
                              <span className="text-white font-semibold">{load.totalWeight?.toFixed(1) || '0'}t</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}