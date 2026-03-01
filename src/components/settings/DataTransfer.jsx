import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Upload, Database, AlertTriangle, CheckCircle2, Loader2, FileJson } from 'lucide-react';
import { toast } from 'sonner';

export default function DataTransfer() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [importResults, setImportResults] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportAllData', {});
      if (response.data?.error) throw new Error(response.data.error);

      const snapshot = response.data.snapshot;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `steelbuild-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      const total = Object.values(snapshot.entities).reduce((sum, arr) => sum + arr.length, 0);
      toast.success(`Exported ${total.toLocaleString()} records`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a .json export file');
      return;
    }
    setSelectedFile(file);
    setImportResults(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportResults(null);

    try {
      const text = await selectedFile.text();
      const snapshot = JSON.parse(text);

      if (!snapshot.entities || !snapshot.exported_at) {
        throw new Error('Invalid export file — not a SteelBuild Pro backup');
      }

      const response = await base44.functions.invoke('importAllData', { snapshot, mode: importMode });
      if (response.data?.error) throw new Error(response.data.error);

      setImportResults(response.data);
      toast.success(`Import complete — ${response.data.totalImported} records loaded`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('Invalid JSON file');
      } else {
        toast.error('Import failed: ' + err.message);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
            <Download size={16} />
            Export All Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-zinc-400">
            Downloads a complete JSON backup of all projects, tasks, RFIs, change orders, deliveries, financials, drawings, resources, and more. Save this file — it can be re-imported into any SteelBuild Pro account.
          </p>
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded border border-zinc-700">
            <Database size={16} className="text-amber-400 shrink-0" />
            <div className="text-xs text-zinc-400">
              Includes: Projects, Tasks, RFIs, Change Orders, Deliveries, Financials, Drawings, Resources, Labor, Documents, Meetings, Submittals, SOV, Invoices, and more
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={exporting} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs">
              {exporting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
              {exporting ? 'EXPORTING...' : 'EXPORT DATA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
            <Upload size={16} />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
            <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300">
              Import will add or overwrite records depending on the mode selected. Only import files exported from SteelBuild Pro.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Import Mode</Label>
              <Select value={importMode} onValueChange={setImportMode}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="merge">Merge (skip existing, add new)</SelectItem>
                  <SelectItem value="replace">Replace (overwrite existing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Backup File</Label>
              <div
                className="h-9 bg-zinc-800 border border-zinc-700 rounded-md flex items-center px-3 gap-2 cursor-pointer hover:border-amber-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileJson size={14} className="text-zinc-500 shrink-0" />
                <span className="text-sm text-zinc-400 truncate">
                  {selectedFile ? selectedFile.name : 'Click to select .json file'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"
            >
              {importing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Upload size={14} className="mr-1" />}
              {importing ? 'IMPORTING...' : 'IMPORT DATA'}
            </Button>
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="border border-zinc-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-900/20 border-b border-zinc-700">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-sm font-bold text-green-300">Import Complete</span>
                <Badge className="ml-auto bg-green-500/20 text-green-400 text-[10px]">
                  {importResults.totalImported} imported
                </Badge>
                <Badge className="bg-zinc-700 text-zinc-400 text-[10px]">
                  {importResults.totalSkipped} skipped
                </Badge>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 space-y-1">
                {Object.entries(importResults.results || {})
                  .filter(([, r]) => r.imported > 0 || r.skipped > 0)
                  .map(([entity, r]) => (
                    <div key={entity} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-mono">{entity}</span>
                      <div className="flex gap-2">
                        {r.imported > 0 && <span className="text-green-400">{r.imported} in</span>}
                        {r.skipped > 0 && <span className="text-zinc-500">{r.skipped} skip</span>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}