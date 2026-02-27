import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

export default function BudgetImportDialog({ open, onOpenChange, projectId }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [codeCol, setCodeCol] = useState('0');
  const [descCol, setDescCol] = useState('1');
  const [amountCol, setAmountCol] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async () => {
    if (!spreadsheetId.trim()) {
      setError('Enter Google Sheets ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await base44.functions.invoke('importBudgetFromSheets', {
        spreadsheetId: spreadsheetId.trim(),
        sheetName,
        projectId,
        columnMap: {
          code: parseInt(codeCol),
          description: parseInt(descCol),
          amount: parseInt(amountCol),
        },
      });

      setSuccess(`Imported ${response.data.itemsCreated} budget items`);
      setSpreadsheetId('');
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Budget from Sheets
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Connect to Google Sheets and import SOV budget items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert className="bg-red-900/30 border-red-700">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/30 border-green-700">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Spreadsheet ID *</label>
            <Input
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="e.g., 1A2B3C4D5E6F7G8H9I0J"
              className="bg-gray-700 border-gray-600 text-white text-sm"
            />
            <p className="text-xs text-gray-400">
              Found in Google Sheets URL: sheets.google.com/d/[ID]/
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Sheet Name</label>
            <Input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="bg-gray-700 border-gray-600 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">SOV Code Col</label>
              <Select value={codeCol} onValueChange={setCodeCol}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Col {String.fromCharCode(65 + i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Description Col</label>
              <Select value={descCol} onValueChange={setDescCol}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Col {String.fromCharCode(65 + i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Amount Col</label>
              <Select value={amountCol} onValueChange={setAmountCol}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Col {String.fromCharCode(65 + i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-gray-700/50 border border-gray-600 rounded p-3">
            <p className="text-xs text-gray-300">
              Sheet format: First row = headers. Each row = one SOV item (code, description, amount).
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end border-t border-gray-600 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600 text-gray-300">
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading || !spreadsheetId.trim()} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Importing...' : 'Import Budget'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}