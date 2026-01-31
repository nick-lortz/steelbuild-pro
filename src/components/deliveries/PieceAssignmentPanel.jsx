import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, ArrowRight, Weight, Truck } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';

export default function PieceAssignmentPanel({ projectId, loads, pieces, onUpdate }) {
  const queryClient = useQueryClient();
  const [selectedPieces, setSelectedPieces] = useState(new Set());
  const [selectedLoad, setSelectedLoad] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sequenceFilter, setSequenceFilter] = useState('all');

  // Get unique sequences
  const sequences = useMemo(() => {
    const seqs = new Set(pieces.map(p => p.sequence_zone).filter(Boolean));
    return ['all', ...Array.from(seqs).sort()];
  }, [pieces]);

  // Filter pieces
  const filteredPieces = useMemo(() => {
    let filtered = pieces;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.piece_mark?.toLowerCase().includes(query) ||
        p.sequence_zone?.toLowerCase().includes(query)
      );
    }
    
    if (sequenceFilter !== 'all') {
      filtered = filtered.filter(p => p.sequence_zone === sequenceFilter);
    }
    
    return filtered.sort((a, b) => {
      if (a.sequence_zone !== b.sequence_zone) {
        return (a.sequence_zone || '').localeCompare(b.sequence_zone || '');
      }
      return (a.piece_mark || '').localeCompare(b.piece_mark || '');
    });
  }, [pieces, searchQuery, sequenceFilter]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const updates = Array.from(selectedPieces).map(pieceId =>
        base44.entities.SteelPiece.update(pieceId, {
          load_truck_id: selectedLoad,
          current_status: 'on_truck'
        })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      toast.success(`Assigned ${selectedPieces.size} pieces to load`);
      setSelectedPieces(new Set());
      onUpdate();
    },
    onError: () => toast.error('Assignment failed')
  });

  const togglePiece = (pieceId) => {
    const newSelected = new Set(selectedPieces);
    if (newSelected.has(pieceId)) {
      newSelected.delete(pieceId);
    } else {
      newSelected.add(pieceId);
    }
    setSelectedPieces(newSelected);
  };

  const toggleAll = () => {
    if (selectedPieces.size === filteredPieces.length) {
      setSelectedPieces(new Set());
    } else {
      setSelectedPieces(new Set(filteredPieces.map(p => p.id)));
    }
  };

  const selectedWeight = useMemo(() => {
    return Array.from(selectedPieces)
      .reduce((sum, id) => {
        const piece = pieces.find(p => p.id === id);
        return sum + (piece?.weight || 0);
      }, 0);
  }, [selectedPieces, pieces]);

  const handleAssign = () => {
    if (selectedPieces.size === 0) {
      toast.error('Select pieces to assign');
      return;
    }
    if (!selectedLoad) {
      toast.error('Select a load');
      return;
    }
    assignMutation.mutate();
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Available Pieces */}
      <Card className="col-span-2 bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Package size={16} />
              Available Pieces
              <Badge variant="outline" className="border-zinc-700 ml-2">
                {filteredPieces.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={sequenceFilter} onValueChange={setSequenceFilter}>
                <SelectTrigger className="w-40 h-8 bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {sequences.map(seq => (
                    <SelectItem key={seq} value={seq}>
                      {seq === 'all' ? 'All Sequences' : seq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Search pieces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 w-48 bg-zinc-800 border-zinc-700 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between p-2 bg-zinc-800 rounded">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedPieces.size === filteredPieces.length && filteredPieces.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs text-zinc-400">
                {selectedPieces.size > 0 ? `${selectedPieces.size} selected` : 'Select all'}
              </span>
            </div>
            {selectedPieces.size > 0 && (
              <div className="text-xs text-zinc-400">
                Total weight: <span className="text-white font-bold">{selectedWeight.toFixed(2)}t</span>
              </div>
            )}
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredPieces.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <Package size={48} className="mx-auto mb-4 text-zinc-700" />
                <p className="text-sm">No pieces available</p>
              </div>
            ) : (
              filteredPieces.map(piece => (
                <div
                  key={piece.id}
                  onClick={() => togglePiece(piece.id)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                    selectedPieces.has(piece.id)
                      ? "bg-amber-500/20 border border-amber-500/40"
                      : "bg-zinc-800/30 border border-transparent hover:border-zinc-700"
                  )}
                >
                  <Checkbox
                    checked={selectedPieces.has(piece.id)}
                    onCheckedChange={() => togglePiece(piece.id)}
                  />
                  <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-mono font-bold text-white">{piece.piece_mark}</span>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] border-zinc-600">
                        {piece.sequence_zone || 'N/A'}
                      </Badge>
                    </div>
                    <div className="text-zinc-400 capitalize">
                      {piece.type.replace('_', ' ')}
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">{piece.weight?.toFixed(2) || '0'}t</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Panel */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
            <Truck size={16} />
            Assign To Load
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Select Load:</label>
            <Select value={selectedLoad} onValueChange={setSelectedLoad}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Choose load..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {loads.length === 0 ? (
                  <div className="p-2 text-xs text-zinc-500">No loads available</div>
                ) : (
                  loads.map(load => (
                    <SelectItem key={load.id} value={load.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{load.load_number}</span>
                        <Badge variant="outline" className="text-[10px] ml-2">
                          {load.pieceCount || 0} pcs
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedLoad && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                {(() => {
                  const load = loads.find(l => l.id === selectedLoad);
                  return (
                    <>
                      <div className="text-xs text-zinc-500 mb-2">Current Load:</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Pieces:</span>
                          <span className="text-white font-semibold">{load?.pieceCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Weight:</span>
                          <span className="text-white font-semibold">{load?.totalWeight?.toFixed(2) || '0'}t</span>
                        </div>
                        {load?.sequences && load.sequences.length > 0 && (
                          <div>
                            <span className="text-zinc-400">Sequences:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {load.sequences.map((seq, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] border-zinc-600">
                                  {seq}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {selectedPieces.size > 0 && (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-3">
                <div className="text-xs text-amber-400 mb-2">Adding:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Pieces:</span>
                    <span className="text-white font-bold">{selectedPieces.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Weight:</span>
                    <span className="text-white font-bold">{selectedWeight.toFixed(2)}t</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleAssign}
            disabled={selectedPieces.size === 0 || !selectedLoad || assignMutation.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            {assignMutation.isPending ? (
              'Assigning...'
            ) : (
              <>
                <ArrowRight size={16} className="mr-2" />
                Assign {selectedPieces.size} Piece{selectedPieces.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}