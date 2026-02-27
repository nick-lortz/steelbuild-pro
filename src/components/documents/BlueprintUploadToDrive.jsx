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
import { Cloud, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function BlueprintUploadToDrive({ open, onOpenChange, projectName, projectId }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [driveLink, setDriveLink] = useState('');

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 50 * 1024 * 1024) {
        setError('File exceeds 50MB limit');
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file || !projectName) {
      setError('Select file and project');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result;
          const response = await base44.functions.invoke('uploadBlueprintToGoogleDrive', {
            projectName,
            fileName: file.name,
            fileData,
            mimeType: file.type || 'application/pdf',
          });

          setSuccess(`Blueprint uploaded to Google Drive`);
          setDriveLink(response.data.webViewLink);
          setFile(null);

          setTimeout(() => {
            onOpenChange(false);
            setSuccess('');
            setDriveLink('');
          }, 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Upload to Drive failed');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process file');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Upload Blueprint to Google Drive
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {projectName || 'Project blueprints'}
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
              {driveLink && (
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs block mt-2"
                >
                  View on Google Drive →
                </a>
              )}
            </Alert>
          )}

          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center bg-gray-700/30 hover:bg-gray-700/50 transition cursor-pointer">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.dwg,.dxf,.jpg,.png"
                disabled={loading}
                className="hidden"
                id="blueprint-input"
              />
              <label htmlFor="blueprint-input" className="cursor-pointer block">
                <Cloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300 font-medium">
                  {file ? file.name : 'Click to select blueprint'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DWG, DXF, JPG, PNG (max 50MB)</p>
              </label>
            </div>

            {file && (
              <div className="bg-gray-700 rounded p-3">
                <p className="text-xs text-gray-300">
                  <strong>File:</strong> {file.name}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end border-t border-gray-600 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={loading || !file}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
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