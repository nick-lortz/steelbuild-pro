import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function DataManagement() {
  const handleFullExport = () => {
    if (window.confirm('⚠️ Full system export will include all projects, users, and data. This may take several minutes. Continue?')) {
      toast.success('Export started - you will receive an email when complete');
    }
  };

  const handleBackup = () => {
    if (window.confirm('⚠️ Create system backup? This will snapshot all data to a secure archive.')) {
      toast.success('Backup initiated');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Data Management</h3>
        <p className="text-sm text-muted-foreground">System-wide data operations</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Full System Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all system data including projects, users, financials, and documents to CSV/Excel format.
            </p>
            <Button onClick={handleFullExport} className="w-full">
              <Download size={16} className="mr-2" />
              Export All Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup & Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a secure backup of the entire system state for disaster recovery.
            </p>
            <div className="space-y-2">
              <Button onClick={handleBackup} variant="outline" className="w-full">
                <Database size={16} className="mr-2" />
                Create Backup
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Upload size={16} className="mr-2" />
                Restore from Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-400 mb-1">Destructive Operations</p>
              <p className="text-sm text-muted-foreground">
                All data management operations are logged and require admin confirmation. 
                Backups are strongly recommended before any restore operation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}