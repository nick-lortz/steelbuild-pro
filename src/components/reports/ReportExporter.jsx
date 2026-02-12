import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function ReportExporter({ projects }) {
  const [showDialog, setShowDialog] = useState(false);
  const [format, setFormat] = useState('pdf');
  const [sections, setSections] = useState({
    kpis: true,
    budget: true,
    schedule: true,
    risks: true
  });

  const handleExport = () => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`);
    setTimeout(() => {
      toast.success('Report downloaded');
      setShowDialog(false);
    }, 1500);
  };

  return (
    <>
      <Button
        variant="outline"
        className="border-zinc-700"
        onClick={() => setShowDialog(true)}
      >
        <Download size={14} className="mr-2" />
        Export Report
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Include Sections</Label>
              <div className="space-y-2">
                {Object.entries(sections).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onCheckedChange={(checked) => 
                        setSections({ ...sections, [key]: checked })
                      }
                      id={key}
                    />
                    <Label htmlFor={key} className="capitalize cursor-pointer">
                      {key.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Download size={14} className="mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}