import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { File, Search, Link as LinkIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DocumentPicker({ 
  open, 
  onOpenChange, 
  projectId, 
  onSelect,
  allowUpload = true,
  multiSelect = false,
  categoryFilter = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || 'all');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [uploadingNew, setUploadingNew] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ 
        project_id: projectId,
        is_current: true
      });
      return docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!projectId && open
  });

  const filteredDocs = React.useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, selectedCategory]);

  const handleQuickUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingNew(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newDoc = await base44.entities.Document.create({
        project_id: projectId,
        title: file.name.split('.')[0],
        file_url,
        file_name: file.name,
        file_size: file.size,
        category: selectedCategory !== 'all' ? selectedCategory : 'other',
        status: 'issued'
      });

      toast.success('Document uploaded');
      onSelect(multiSelect ? [newDoc] : newDoc);
      onOpenChange(false);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingNew(false);
    }
  };

  const handleSelect = (doc) => {
    if (multiSelect) {
      const isSelected = selectedDocs.find(d => d.id === doc.id);
      if (isSelected) {
        setSelectedDocs(selectedDocs.filter(d => d.id !== doc.id));
      } else {
        setSelectedDocs([...selectedDocs, doc]);
      }
    } else {
      onSelect(doc);
      onOpenChange(false);
    }
  };

  const handleConfirmMultiple = () => {
    onSelect(selectedDocs);
    setSelectedDocs([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="drawing">Drawings</SelectItem>
                <SelectItem value="specification">Specs</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="photo">Photos</SelectItem>
                <SelectItem value="safety_form">Safety Forms</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Upload */}
          {allowUpload && (
            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 border-dashed">
              <input
                type="file"
                id="quick-upload"
                onChange={handleQuickUpload}
                className="hidden"
                disabled={uploadingNew}
              />
              <label htmlFor="quick-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingNew}
                  className="w-full border-zinc-700"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('quick-upload').click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingNew ? 'Uploading...' : 'Quick Upload New Document'}
                </Button>
              </label>
            </div>
          )}

          {/* Document List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <File className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p>No documents found</p>
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isSelected = multiSelect && selectedDocs.find(d => d.id === doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelect(doc)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {multiSelect && (
                        <Checkbox
                          checked={!!isSelected}
                          onCheckedChange={() => handleSelect(doc)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                      )}
                      <div className="p-2 bg-zinc-800 rounded">
                        <File size={16} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm mb-1 truncate">{doc.title}</h4>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-[10px] capitalize">
                            {doc.category}
                          </Badge>
                          {doc.version > 1 && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                              v{doc.version}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">
                          {format(new Date(doc.created_date), 'MMM d, yyyy')} • {doc.file_name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {multiSelect && selectedDocs.length > 0 && (
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <p className="text-sm text-zinc-400">{selectedDocs.length} document(s) selected</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedDocs([])}>
                  Clear
                </Button>
                <Button onClick={handleConfirmMultiple}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Link Selected
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}