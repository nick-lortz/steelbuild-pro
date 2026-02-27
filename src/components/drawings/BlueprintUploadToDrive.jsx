import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function BlueprintUploadToDrive({ open, onOpenChange, projectId }) {
  const [files, setFiles] = useState([]);
  const [folderId, setFolderId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Select at least one blueprint file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      let uploadedCount = 0;

      for (const file of files) {
        // Read file as base64
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload to Google Drive
        const response = await base44.functions.invoke('uploadBlueprintsToGDrive', {
          fileName: file.name,
          fileBase64: base64,
          mimeType: file.type,
          projectId,
          folderId: folderId || undefined,
        });

        uploadedCount++;
      }

      setSuccess(`✓ Uploaded ${uploadedCount} blueprint(s) to Google Drive`);
      setFiles([]);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            Upload Blueprints to Drive
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload project blueprints directly to Google Drive
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
            <label className="text-sm font-medium text-gray-300">Blueprint Files *</label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                className="hidden"
                id="blueprint-input"
                disabled={uploading}
              />
              <label htmlFor="blueprint-input" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">Click to select or drag blueprints</p>
                <p className="text-xs text-gray-400 mt-1">.pdf, .dwg, .dxf, .png, .jpg</p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="bg-gray-700/50 border border-gray-600 rounded p-3 space-y-2">
                <p className="text-xs font-medium text-gray-300">{files.length} file(s) selected:</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  {files.map((f, i) => (
                    <li key={i}>• {f.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Google Drive Folder ID (Optional)</label>
            <Input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Leave empty for root Drive folder"
              className="bg-gray-700 border-gray-600 text-white text-sm"
            />
            <p className="text-xs text-gray-400">
              Folder ID from Drive URL: drive.google.com/drive/folders/[ID]
            </p>
          </div>

          <div className="bg-gray-700/50 border border-gray-600 rounded p-3">
            <p className="text-xs text-gray-300">
              Blueprints will be uploaded to Google Drive and linked to this project as documents.
            </p>
          </div>
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
                <Cloud className="w-4 h-4 mr-2" />
                Upload to Drive
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}