import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/api/client';

export default function CSVUpload({ 
  entityName, 
  templateFields, 
  onImportComplete, 
  open, 
  onOpenChange,
  transformRow 
}) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const generateTemplate = () => {
    const headers = templateFields.map(f => f.label).join(',');
    const example = templateFields.map(f => f.example || '').join(',');
    const csv = `${headers}\n${example}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, idx) => {
        const field = templateFields.find(f => f.label === header);
        if (field && values[idx]) {
          row[field.key] = values[idx];
        }
      });
      rows.push(row);
    }
    
    return rows;
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setResults({ success: 0, failed: 0, errors: [] });
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      let successCount = 0;
      let failedCount = 0;
      const errors = [];
      
      for (let i = 0; i < rows.length; i++) {
        try {
          let data = rows[i];
          
          // Apply custom transformation if provided
          if (transformRow) {
            data = transformRow(data);
          }
          
          await apiClient.entities[entityName].create(data);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }
      
      setResults({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error) {
      setResults({ 
        success: 0, 
        failed: 0, 
        errors: [`Failed to parse CSV: ${error.message}`] 
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Download Template */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="text-amber-500 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Step 1: Download Template</p>
                <p className="text-xs text-zinc-400 mb-3">
                  Download the CSV template, fill it out with your data, then upload it below.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateTemplate}
                  className="border-zinc-700"
                >
                  <Download size={14} className="mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* Upload File */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Upload className="text-blue-500 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Step 2: Upload Filled CSV</p>
                <p className="text-xs text-zinc-400 mb-3">
                  Select your completed CSV file to import.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button size="sm" variant="outline" className="border-zinc-700" asChild>
                    <span>
                      <Upload size={14} className="mr-2" />
                      {file ? file.name : 'Choose File'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className={`p-4 rounded-lg border ${
              results.failed === 0 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <div className="flex items-start gap-3">
                {results.failed === 0 ? (
                  <CheckCircle className="text-green-400 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-amber-400 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Import Results</p>
                  <div className="flex gap-4 text-xs mb-2">
                    <div>
                      <span className="text-zinc-500">Success:</span>{' '}
                      <span className="text-green-400 font-medium">{results.success}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Failed:</span>{' '}
                      <span className="text-red-400 font-medium">{results.failed}</span>
                    </div>
                  </div>
                  {results.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-zinc-500">Errors:</p>
                      {results.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} className="text-xs text-red-400">{err}</p>
                      ))}
                      {results.errors.length > 5 && (
                        <p className="text-xs text-zinc-500">+{results.errors.length - 5} more errors</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
              Close
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {importing ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}