import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from '@/components/ui/DataTable';
import { FileText, Filter, Download, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function DocumentLinkageCenter({ projectId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Fetch all documents linked to RFIs, Invoices, Submittals
  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis-with-docs', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoice-lines-with-docs', projectId],
    queryFn: () => base44.entities.InvoiceLine.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: submittals = [] } = useQuery({
    queryKey: ['submittals-with-docs', projectId],
    queryFn: () => base44.entities.Submittal.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Aggregate all documents with source info
  const allDocuments = [
    ...rfis.flatMap(rfi =>
      (rfi.attachments || []).map(doc => ({
        ...doc,
        source_type: 'RFI',
        source_id: rfi.id,
        source_name: `RFI-${rfi.rfi_number}: ${rfi.subject}`,
        is_markup: doc.is_markup || false
      }))
    ),
    ...invoiceLines.flatMap(line =>
      (line.attachments || []).map(doc => ({
        ...doc,
        source_type: 'Invoice',
        source_id: line.id,
        source_name: `Invoice Line: ${line.sov_item_id}`
      }))
    ),
    ...submittals.flatMap(sub =>
      (sub.file_urls || []).map((url, idx) => ({
        file_url: url,
        file_name: `Submittal-${sub.submittal_number}-${idx}`,
        source_type: 'Submittal',
        source_id: sub.id,
        source_name: `Submittal-${sub.submittal_number}: ${sub.title}`,
        uploaded_date: sub.submitted_date
      }))
    )
  ];

  const filtered = allDocuments
    .filter(doc =>
      (selectedType === 'all' || doc.source_type === selectedType) &&
      (!searchTerm || doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       doc.source_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const columns = [
    {
      header: 'File',
      accessor: 'file_name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-zinc-500" />
          <div>
            <p className="text-sm font-medium text-white truncate">{row.file_name}</p>
            {row.is_markup && <Badge className="bg-purple-500/20 text-purple-300 text-xs mt-1">Markup</Badge>}
          </div>
        </div>
      )
    },
    {
      header: 'From',
      accessor: 'source_type',
      render: (row) => (
        <div>
          <Badge className="bg-zinc-700">{row.source_type}</Badge>
          <p className="text-xs text-zinc-500 mt-1 truncate max-w-xs">{row.source_name}</p>
        </div>
      )
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_date',
      render: (row) => row.uploaded_date ? format(parseISO(row.uploaded_date), 'MMM d, yyyy') : '-'
    },
    {
      header: 'Uploaded By',
      accessor: 'uploaded_by',
      render: (row) => row.uploaded_by || '-'
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <a href={row.file_url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300">
            <ExternalLink size={14} className="mr-1" />
            View
          </Button>
        </a>
      )
    }
  ];

  const stats = {
    total: allDocuments.length,
    rfis: allDocuments.filter(d => d.source_type === 'RFI').length,
    invoices: allDocuments.filter(d => d.source_type === 'Invoice').length,
    submittals: allDocuments.filter(d => d.source_type === 'Submittal').length
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, key: 'all' },
          { label: 'RFI', value: stats.rfis, key: 'RFI' },
          { label: 'Invoice', value: stats.invoices, key: 'Invoice' },
          { label: 'Submittal', value: stats.submittals, key: 'Submittal' }
        ].map(stat => (
          <Card key={stat.key} className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-600"
            onClick={() => setSelectedType(stat.key)}>
            <CardContent className="p-3">
              <div className="text-xs text-zinc-500 uppercase mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText size={16} />
            All Project Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by file name or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Button variant="outline" size="icon" className="border-zinc-700">
                <Filter size={16} />
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={filtered}
              emptyMessage="No documents found"
            />

            {filtered.length > 0 && (
              <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                Showing {filtered.length} of {allDocuments.length} documents
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}