import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  FileText, Clock, CheckCircle2, AlertTriangle, Download, X, Upload, Mail
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import DocumentUploader from '@/components/documents/DocumentUploader';
import { toast } from '@/components/ui/notifications';

export default function SubmittalDetailPanel({ submittal, rfis, sovItems, onUpdate, onStatusChange }) {
  const [activeTab, setActiveTab] = useState('details');
  const [showDocUploader, setShowDocUploader] = useState(false);
  const [reviewComments, setReviewComments] = useState(submittal.review_comments || '');
  const [documents, setDocuments] = useState(submittal.file_urls || []);

  const rfiLink = rfis.find(r => r.id === submittal.linked_rfi_id);

  const handleDocumentsAdded = (newDocs) => {
    const updatedUrls = [...(submittal.file_urls || []), ...newDocs.map(d => d.file_url)];
    setDocuments(updatedUrls);
    onUpdate({ file_urls: updatedUrls });
    setShowDocUploader(false);
    toast.success('Documents added');
  };

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'reviewed') {
      updates.reviewed_date = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'approved') {
      updates.approved_date = new Date().toISOString().split('T')[0];
    }
    if (reviewComments) {
      updates.review_comments = reviewComments;
    }
    onUpdate(updates);
    onStatusChange(newStatus);
  };

  const statusColors = {
    draft: 'bg-zinc-600',
    submitted: 'bg-blue-600',
    reviewed: 'bg-amber-600',
    approved_with_changes: 'bg-orange-600',
    approved: 'bg-green-600',
    rejected: 'bg-red-600',
    voided: 'bg-gray-600'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            SUB-{String(submittal.submittal_number).padStart(3, '0')}
          </h2>
          <p className="text-sm text-white mt-1">{submittal.title}</p>
          {rfiLink && (
            <p className="text-xs text-amber-400 mt-1">
              Linked to RFI-{rfiLink.rfi_number}: {rfiLink.subject}
            </p>
          )}
        </div>
        <StatusBadge status={submittal.status} />
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Type</div>
            <Badge className="bg-zinc-700 capitalize">{submittal.type?.replace('_', ' ')}</Badge>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Due Date</div>
            <div className="text-sm text-white font-mono">
              {submittal.due_date ? format(parseISO(submittal.due_date), 'MMM d, yyyy') : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Docs</div>
            <div className="text-sm text-white font-mono">{documents.length} file(s)</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {submittal.description && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{submittal.description}</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Submission Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {submittal.submitted_by && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Submitted By:</span>
                  <span className="text-white">{submittal.submitted_by}</span>
                </div>
              )}
              {submittal.submitted_date && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date:</span>
                  <span className="text-white">{format(parseISO(submittal.submitted_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {submittal.reviewer && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reviewer:</span>
                  <span className="text-white">{submittal.reviewer}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {showDocUploader ? (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocUploader(false)}
                className="mb-3 border-zinc-700"
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
              <DocumentUploader onDocumentsAdded={handleDocumentsAdded} />
            </div>
          ) : (
            <Button
              onClick={() => setShowDocUploader(true)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              size="sm"
            >
              <Upload size={14} className="mr-2" />
              Add Documents
            </Button>
          )}

          {documents.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Attachments ({documents.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <div className="flex items-center justify-between bg-zinc-800 p-3 rounded hover:bg-zinc-700 transition">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-amber-400" />
                        <span className="text-xs text-white truncate">
                          {url.split('/').pop()}
                        </span>
                      </div>
                      <Download size={14} className="text-zinc-500" />
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Review & Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase">Comments</label>
                <Textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Add review comments..."
                  rows={3}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              {submittal.hold_points && submittal.hold_points.length > 0 && (
                <div className="bg-zinc-800/50 p-3 rounded">
                  <h4 className="text-xs font-medium text-amber-400 mb-2">Hold Points</h4>
                  {submittal.hold_points.map((point, idx) => (
                    <div key={idx} className="text-xs text-zinc-300 mb-1">
                      • {point.description}
                      {point.status === 'resolved' && (
                        <Badge className="ml-2 bg-green-600 text-xs">Resolved</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase">Change Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['submitted', 'reviewed', 'approved_with_changes', 'approved', 'rejected'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={submittal.status === status ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(status)}
                      className={`text-xs capitalize ${
                        submittal.status === status 
                          ? statusColors[status] + ' text-white'
                          : 'border-zinc-700'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {submittal.reviewed_date && (
                <div className="text-xs text-zinc-500">
                  Reviewed: {format(parseISO(submittal.reviewed_date), 'MMM d, yyyy')}
                </div>
              )}
              {submittal.approved_date && (
                <div className="text-xs text-green-400">
                  Approved: {format(parseISO(submittal.approved_date), 'MMm d, yyyy')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {submittal.status !== 'approved' && submittal.status !== 'rejected' && (
        <div className="flex gap-2 pt-4 border-t border-zinc-800">
          <Button 
            onClick={() => handleStatusChange('approved')}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <CheckCircle2 size={14} className="mr-2" />
            Approve
          </Button>
          <Button 
            onClick={() => handleStatusChange('rejected')}
            variant="outline"
            size="sm"
            className="flex-1 border-red-700 text-red-400"
          >
            <AlertTriangle size={14} className="mr-2" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}