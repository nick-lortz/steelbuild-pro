import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquareWarning, Calendar, AlertTriangle, CheckCircle2, 
  FileText, MessageSquare, Activity, Edit, Trash2, Mail,
  Clock, DollarSign, Link as LinkIcon, Upload, Download, X
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import DocumentUploader from '@/components/documents/DocumentUploader';

export default function RFIDetailPanel({ 
  rfi, 
  project, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onUpdateCloseout,
  onGenerateEmail
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [showDocUploader, setShowDocUploader] = useState(false);
  const [documents, setDocuments] = useState(rfi.attachments || []);

  const updateRFIMutation = useMutation({
    mutationFn: (data) => base44.entities.RFI.update(rfi.id, data),
    onSuccess: () => {
      toast.success('Documents added to RFI');
      setShowDocUploader(false);
    },
    onError: (error) => {
      toast.error('Failed to update RFI: ' + error.message);
    }
  });

  const handleDocumentsAdded = async (newDocs) => {
    const updated = [...documents, ...newDocs];
    setDocuments(updated);
    updateRFIMutation.mutate({ attachments: updated });
  };

  const removeDocument = (index) => {
    const updated = documents.filter((_, i) => i !== index);
    setDocuments(updated);
    updateRFIMutation.mutate({ attachments: updated });
  };

  const daysOpen = rfi.submitted_date ? differenceInDays(new Date(), parseISO(rfi.submitted_date)) : 0;
  const isOverdue = rfi.due_date && !['answered', 'closed'].includes(rfi.status) && 
                     differenceInDays(new Date(), parseISO(rfi.due_date)) > 0;

  const ballInCourtColors = {
    internal: 'bg-blue-500',
    external: 'bg-amber-500',
    gc: 'bg-purple-500',
    architect: 'bg-green-500',
    engineer: 'bg-cyan-500',
    vendor: 'bg-pink-500'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              RFI-{String(rfi.rfi_number).padStart(3, '0')}
            </span>
            <StatusBadge status={rfi.status} />
            {isOverdue && (
              <Badge className="bg-red-500">
                <AlertTriangle size={12} className="mr-1" />
                Overdue
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold mb-1">{rfi.subject}</h2>
          <p className="text-sm text-zinc-400">{project?.name}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            {rfi.category && <Badge className="bg-zinc-700">{rfi.category}</Badge>}
            {rfi.location_area && <span>📍 {rfi.location_area}</span>}
            {rfi.spec_section && <span>§ {rfi.spec_section}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(rfi)} className="border-zinc-700">
            <Edit size={14} className="mr-2" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(rfi)} className="border-zinc-700 text-red-400 hover:text-red-300">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Ball in Court</div>
            <Badge className={ballInCourtColors[rfi.ball_in_court] || 'bg-zinc-700'}>
              {rfi.ball_in_court?.replace('_', ' ').toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Priority</div>
            <StatusBadge status={rfi.priority} />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Days Open</div>
            <div className="text-xl font-bold">{daysOpen}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-500 uppercase mb-1">Due Date</div>
            <div className={`text-sm font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
              {rfi.due_date ? format(parseISO(rfi.due_date), 'MMM d') : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="closeout">Closeout</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquareWarning size={16} />
                Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-white whitespace-pre-wrap bg-zinc-800 p-4 rounded-lg">
                {rfi.question || 'No question provided'}
              </div>
              {rfi.question_version > 1 && (
                <div className="mt-2 text-xs text-zinc-500">Version {rfi.question_version}</div>
              )}
            </CardContent>
          </Card>

          {rfi.response && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-white whitespace-pre-wrap bg-zinc-800 p-4 rounded-lg">
                  {rfi.response}
                </div>
                {rfi.response_version > 1 && (
                  <div className="mt-2 text-xs text-zinc-500">Version {rfi.response_version}</div>
                )}
                {rfi.response_date && (
                  <div className="mt-2 text-xs text-zinc-400">
                    Responded: {format(parseISO(rfi.response_date), 'MMM d, yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Assigned To (Internal)</div>
                  <div className="text-white">{rfi.assigned_to || '-'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Response Owner (External)</div>
                  <div className="text-white">{rfi.response_owner || '-'}</div>
                </div>
              </div>

              {rfi.distribution_list && rfi.distribution_list.length > 0 && (
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Distribution</div>
                  <div className="flex flex-wrap gap-1">
                    {rfi.distribution_list.map((email, idx) => (
                      <Badge key={idx} className="bg-zinc-800 text-xs">{email}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {rfi.resolution_notes && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Resolution Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{rfi.resolution_notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/api/exportRFItoPDF';
                link.download = `RFI-${String(rfi.rfi_number).padStart(3, '0')}.pdf`;
                link.click();
              }}
              variant="outline"
              className="flex-1 border-zinc-700"
              size="sm"
            >
              <Download size={14} className="mr-2" />
              Export PDF
            </Button>
          </div>

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
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-800 p-3 rounded">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText size={14} className="text-amber-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-white truncate">{doc.file_name}</p>
                        {doc.uploaded_by && (
                          <p className="text-xs text-zinc-500">{doc.uploaded_by}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.is_markup && (
                        <Badge className="bg-purple-500/20 text-purple-300 text-xs">Markup</Badge>
                      )}
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white">
                          <Download size={12} />
                        </Button>
                      </a>
                      <button
                        onClick={() => removeDocument(idx)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign size={16} className="text-green-500" />
                  Cost Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <StatusBadge status={rfi.cost_impact} />
                </div>
                {rfi.estimated_cost_impact > 0 && (
                  <div className="text-sm">
                    <span className="text-zinc-500">Estimated:</span>
                    <span className="text-white ml-2 font-mono">${rfi.estimated_cost_impact.toLocaleString()}</span>
                  </div>
                )}
                {rfi.actual_cost_impact > 0 && (
                  <div className="text-sm">
                    <span className="text-zinc-500">Actual:</span>
                    <span className="text-white ml-2 font-mono">${rfi.actual_cost_impact.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock size={16} className="text-orange-500" />
                  Schedule Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <StatusBadge status={rfi.schedule_impact} />
                </div>
                {rfi.schedule_impact_days > 0 && (
                  <div className="text-sm">
                    <span className="text-zinc-500">Impact:</span>
                    <span className="text-white ml-2 font-mono">{rfi.schedule_impact_days} days</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {rfi.answer_type && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Answer Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-zinc-700">
                  {rfi.answer_type.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Linked Items */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <LinkIcon size={16} />
                Related Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {rfi.linked_drawing_set_ids?.length > 0 && (
                <div>
                  <span className="text-zinc-500">Drawings:</span>
                  <span className="text-white ml-2">{rfi.linked_drawing_set_ids.length} linked</span>
                </div>
              )}
              {rfi.linked_change_order_ids?.length > 0 && (
                <div>
                  <span className="text-zinc-500">Change Orders:</span>
                  <span className="text-white ml-2">{rfi.linked_change_order_ids.length} linked</span>
                </div>
              )}
              {rfi.linked_submittal_ids?.length > 0 && (
                <div>
                  <span className="text-zinc-500">Submittals:</span>
                  <span className="text-white ml-2">{rfi.linked_submittal_ids.length} linked</span>
                </div>
              )}
              {rfi.linked_delivery_ids?.length > 0 && (
                <div>
                  <span className="text-zinc-500">Deliveries:</span>
                  <span className="text-white ml-2">{rfi.linked_delivery_ids.length} linked</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closeout" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Closeout Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'drawings_updated', label: 'Updated drawings received', dateKey: 'drawings_updated_date' },
                { key: 'detailing_updated', label: 'Detailing updated', dateKey: 'detailing_updated_date' },
                { key: 'shop_notified', label: 'Shop notified', dateKey: 'shop_notified_date' },
                { key: 'field_notified', label: 'Field notified', dateKey: 'field_notified_date' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={item.key}
                      checked={rfi.closeout_checklist?.[item.key] || false}
                      onCheckedChange={(checked) => onUpdateCloseout(item.key, checked)}
                    />
                    <Label htmlFor={item.key} className="cursor-pointer text-sm">
                      {item.label}
                    </Label>
                  </div>
                  {rfi.closeout_checklist?.[item.dateKey] && (
                    <span className="text-xs text-zinc-500">
                      {format(parseISO(rfi.closeout_checklist[item.dateKey]), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {rfi.status === 'answered' && !['closed'].includes(rfi.status) && (
            <Button
              onClick={() => onStatusChange(rfi.id, 'closed')}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!rfi.closeout_checklist?.drawings_updated || !rfi.closeout_checklist?.detailing_updated}
            >
              <CheckCircle2 size={14} className="mr-2" />
              Close RFI
            </Button>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          {rfi.activity_log && Array.isArray(rfi.activity_log) && rfi.activity_log.length > 0 ? (
            rfi.activity_log.map((log, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <Activity size={16} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white">{log.action}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                    <span>{log.user || 'system'}</span>
                    <span>•</span>
                    <span>{log.timestamp ? format(parseISO(log.timestamp), 'MMM d, h:mm a') : 'unknown'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {rfi.status !== 'closed' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={onGenerateEmail}
              variant="outline"
              className="w-full border-zinc-700"
            >
              <Mail size={14} className="mr-2" />
              Generate Email Draft
            </Button>

            {rfi.status === 'draft' && (
              <Button 
                onClick={() => onStatusChange(rfi.id, 'submitted')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                Submit RFI
              </Button>
            )}

            {rfi.status === 'submitted' && (
              <Button 
                onClick={() => onStatusChange(rfi.id, 'under_review')}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Mark Under Review
              </Button>
            )}

            {rfi.status === 'under_review' && (
              <Button 
                onClick={() => onStatusChange(rfi.id, 'answered')}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                Mark Answered
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dates Timeline */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {rfi.submitted_date && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Submitted:</span>
              <span className="text-white">{format(parseISO(rfi.submitted_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {rfi.due_date && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Due:</span>
              <span className={isOverdue ? 'text-red-400 font-bold' : 'text-white'}>
                {format(parseISO(rfi.due_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          {rfi.response_date && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Responded:</span>
              <span className="text-white">{format(parseISO(rfi.response_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {rfi.closed_date && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Closed:</span>
              <span className="text-white">{format(parseISO(rfi.closed_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {rfi.response_days_actual !== undefined && (
            <div className="flex justify-between border-t border-zinc-800 pt-2">
              <span className="text-zinc-500">Response Time:</span>
              <span className={`font-bold ${
                rfi.response_days_actual <= rfi.days_to_respond ? 'text-green-400' : 'text-red-400'
              }`}>
                {rfi.response_days_actual} days
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}