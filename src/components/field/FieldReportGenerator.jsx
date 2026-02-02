import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Camera, CheckSquare, Wrench } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FieldReportGenerator({ 
  photos, 
  punchItems, 
  installs, 
  project,
  currentFolder 
}) {
  const [reportType, setReportType] = useState('photo');
  const [groupBy, setGroupBy] = useState('folder');
  const [generating, setGenerating] = useState(false);

  const generatePhotoReport = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.text('Daily Photo Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Project: ${project?.name || 'N/A'}`, 20, yPos);
    yPos += 5;
    doc.text(`Date: ${format(new Date(), 'MMM dd, yyyy')}`, 20, yPos);
    yPos += 5;
    doc.text(`Total Photos: ${photos.length}`, 20, yPos);
    yPos += 15;

    if (groupBy === 'folder') {
      // Group by folder
      const folderGroups = photos.reduce((acc, photo) => {
        const folder = photo.folder_path || '/';
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(photo);
        return acc;
      }, {});

      Object.entries(folderGroups).forEach(([folder, folderPhotos]) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Folder: ${folder}`, 20, yPos);
        yPos += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        folderPhotos.forEach(photo => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          const timestamp = photo.created_date ? format(new Date(photo.created_date), 'MM/dd h:mma') : '';
          doc.text(`• ${photo.title} - ${timestamp}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      });
    } else {
      // List by date
      doc.setFontSize(9);
      photos.forEach(photo => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        const timestamp = photo.created_date ? format(new Date(photo.created_date), 'MM/dd h:mma') : '';
        const folder = photo.folder_path || '/';
        doc.text(`${timestamp} - ${photo.title} [${folder}]`, 20, yPos);
        yPos += 5;
      });
    }

    doc.save(`Photo_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generatePunchListReport = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.text('Punch List Report', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Project: ${project?.name || 'N/A'}`, 20, yPos);
    yPos += 5;
    doc.text(`Date: ${format(new Date(), 'MMM dd, yyyy')}`, 20, yPos);
    yPos += 5;
    doc.text(`Total Items: ${punchItems.length}`, 20, yPos);
    yPos += 5;
    doc.text(`Open: ${punchItems.filter(p => p.status !== 'closed').length}`, 20, yPos);
    yPos += 15;

    if (groupBy === 'severity') {
      ['critical', 'major', 'minor'].forEach(severity => {
        const items = punchItems.filter(p => p.severity === severity);
        if (items.length === 0) return;

        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${severity.toUpperCase()} (${items.length})`, 20, yPos);
        yPos += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        items.forEach(item => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• ${item.description} - ${item.status}`, 25, yPos);
          yPos += 5;
          if (item.location) {
            doc.text(`  Location: ${item.location}`, 27, yPos);
            yPos += 5;
          }
        });
        yPos += 5;
      });
    } else if (groupBy === 'status') {
      ['open', 'in_progress', 'pending', 'closed'].forEach(status => {
        const items = punchItems.filter(p => p.status === status);
        if (items.length === 0) return;

        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${status.replace('_', ' ').toUpperCase()} (${items.length})`, 20, yPos);
        yPos += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        items.forEach(item => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• [${item.severity}] ${item.description}`, 25, yPos);
          yPos += 5;
          if (item.location) {
            doc.text(`  Location: ${item.location}`, 27, yPos);
            yPos += 5;
          }
        });
        yPos += 5;
      });
    } else {
      // By location
      const locationGroups = punchItems.reduce((acc, item) => {
        const loc = item.location || 'Unspecified';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(item);
        return acc;
      }, {});

      Object.entries(locationGroups).forEach(([location, items]) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${location} (${items.length})`, 20, yPos);
        yPos += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        items.forEach(item => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• [${item.severity}] ${item.description} - ${item.status}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      });
    }

    doc.save(`Punch_List_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generateInstallReport = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.text('Install Tracking Report', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Project: ${project?.name || 'N/A'}`, 20, yPos);
    yPos += 5;
    doc.text(`Date: ${format(new Date(), 'MMM dd, yyyy')}`, 20, yPos);
    yPos += 5;
    doc.text(`Total Items: ${installs.length}`, 20, yPos);
    yPos += 5;
    const complete = installs.filter(i => i.status === 'complete').length;
    const progress = installs.filter(i => i.status === 'in_progress').length;
    doc.text(`Complete: ${complete} | In Progress: ${progress}`, 20, yPos);
    yPos += 15;

    if (groupBy === 'status') {
      ['complete', 'in_progress', 'not_started'].forEach(status => {
        const items = installs.filter(i => i.status === status);
        if (items.length === 0) return;

        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${status.replace('_', ' ').toUpperCase()} (${items.length})`, 20, yPos);
        yPos += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        items.forEach(item => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          const dateStr = item.install_date ? format(new Date(item.install_date), 'MM/dd') : 'N/A';
          doc.text(`• ${item.piece_mark} - ${item.location || 'N/A'} - ${dateStr}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      });
    } else {
      // By date
      const dateGroups = installs.reduce((acc, item) => {
        const date = item.install_date || 'Unscheduled';
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
      }, {});

      Object.entries(dateGroups).sort().forEach(([date, items]) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const dateLabel = date === 'Unscheduled' ? date : format(new Date(date), 'MMM dd, yyyy');
        doc.text(`${dateLabel} (${items.length})`, 20, yPos);
        yPos += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        items.forEach(item => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• ${item.piece_mark} - ${item.location || 'N/A'} - ${item.status}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      });
    }

    doc.save(`Install_Tracking_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (reportType === 'photo') {
      csvContent = 'Timestamp,Title,Folder,URL\n';
      photos.forEach(p => {
        const timestamp = p.created_date ? format(new Date(p.created_date), 'yyyy-MM-dd HH:mm') : '';
        const folder = (p.folder_path || '/').replace(/,/g, ';');
        const title = (p.title || '').replace(/,/g, ';');
        csvContent += `${timestamp},${title},${folder},${p.file_url}\n`;
      });
      filename = `Photos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (reportType === 'punch') {
      csvContent = 'Description,Severity,Status,Location,Assigned To,Due Date\n';
      punchItems.forEach(p => {
        const desc = (p.description || '').replace(/,/g, ';');
        const loc = (p.location || '').replace(/,/g, ';');
        const assigned = (p.assigned_to || '').replace(/,/g, ';');
        const due = p.due_date || '';
        csvContent += `${desc},${p.severity},${p.status},${loc},${assigned},${due}\n`;
      });
      filename = `Punch_List_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      csvContent = 'Piece Mark,Location,Status,Install Date,Crew,Notes\n';
      installs.forEach(i => {
        const mark = (i.piece_mark || '').replace(/,/g, ';');
        const loc = (i.location || '').replace(/,/g, ';');
        const crew = (i.crew || '').replace(/,/g, ';');
        const notes = (i.notes || '').replace(/,/g, ';');
        const date = i.install_date || '';
        csvContent += `${mark},${loc},${i.status},${date},${crew},${notes}\n`;
      });
      filename = `Install_Tracking_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (reportType === 'photo') {
        generatePhotoReport();
      } else if (reportType === 'punch') {
        generatePunchListReport();
      } else {
        generateInstallReport();
      }
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText size={20} className="text-amber-500" />
          Field Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                <SelectItem value="photo">
                  <div className="flex items-center gap-2">
                    <Camera size={14} />
                    Photo Summary
                  </div>
                </SelectItem>
                <SelectItem value="punch">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} />
                    Punch List
                  </div>
                </SelectItem>
                <SelectItem value="install">
                  <div className="flex items-center gap-2">
                    <Wrench size={14} />
                    Install Tracking
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Group By</label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                {reportType === 'photo' && (
                  <>
                    <SelectItem value="folder">Folder</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </>
                )}
                {reportType === 'punch' && (
                  <>
                    <SelectItem value="severity">Severity</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </>
                )}
                {reportType === 'install' && (
                  <>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              <FileText size={16} className="mr-2" />
              {generating ? 'Generating...' : 'Generate PDF'}
            </Button>
            <Button
              onClick={exportCSV}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Download size={16} />
            </Button>
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          {reportType === 'photo' && `${photos.length} photos available`}
          {reportType === 'punch' && `${punchItems.length} punch items`}
          {reportType === 'install' && `${installs.length} install records`}
        </div>
      </CardContent>
    </Card>
  );
}