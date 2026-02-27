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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CloudUpload, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function BlueprintUploadDialog({ open, onOpenChange, projectId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Select at least one blueprint file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      let uploadedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = async (event) => {
          const base64Data = event.target.result.split(',')[1];

          try {
            const response = await base44.functions.invoke('uploadBlueprintsToDrive', {
              fileName: file.name,
              fileData: base64Data,
              mimeType: file.type,
              projectId,
            });

            uploadedCount++;
            setUploadProgress(Math.round((uploadedCount / files.length) * 100));

            if (uploadedCount === files.length) {
              setSuccess(`${uploadedCount} blueprint(s) uploaded to Google Drive`);
              setFiles([]);
              setTimeout(() => onOpenChange(false), 2000);
            }
          } catch (err) {
            setError(`Failed to upload ${file.name}: ${err.response?.data?.error || 'Unknown error'}`);
          }
        };

        reader.readAsDataURL(file);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CloudUpload className="w-5 h-5" />
            Upload Blueprints to Drive
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload project blueprints and drawings to Google Drive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert className="bg-red-900/30 border-red-700">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/30 border-green-700">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <AlertDescription className="text-green-300 text-sm">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="blueprints" className="text-sm font-medium text-gray-300">
              Select Blueprint Files *
            </label>
            <Input
              id="blueprints"
              type="file"
              multiple
              accept=".pdf,.dwg,.dxf,.jpg,.png,.tif,.rvt"
              onChange={handleFileSelect}
              disabled={uploading}
              className="bg-gray-700 border-gray-600 text-gray-300"
            />
            <p className="text-xs text-gray-400">
              Supported: PDF, DWG, DXF, JPG, PNG, TIF, RVT
            </p>
          </div>

          {files.length > 0 && (
            <div className="bg-gray-700/50 border border-gray-600 rounded p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-gray-300 mb-2">{files.length} file(s) selected:</p>
              <ul className="space-y-1">
                {files.map((file, i) => (
                  <li key={i} className="text-xs text-gray-400">
                    • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded h-2">
                <div
                  className="bg-blue-600 h-2 rounded transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end border-t border-gray-600 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4 mr-2" />
                Upload to Drive
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}