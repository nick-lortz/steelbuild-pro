import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Phone, Mail as MailIcon, Building } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PMContacts() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    role_title: '',
    phone: '',
    email: '',
    tags: [],
    notes: ''
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['projectContacts', activeProjectId],
    queryFn: () => base44.entities.ProjectContact.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectContact.create({ ...data, project_id: activeProjectId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectContacts']);
      toast.success('Contact added');
      setShowDialog(false);
      setFormData({ company: '', name: '', role_title: '', phone: '', email: '', tags: [], notes: '' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const contactsByTag = (tag) => contacts.filter(c => c.tags?.includes(tag));

  const tags = ['gc', 'owner', 'engineer', 'architect', 'joist_supplier', 'deck_supplier', 'field_super', 'detailer', 'inspector', 'other'];

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Select a project to manage contacts
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E7EB]">Project Contacts</h1>
          <p className="text-sm text-[#9CA3AF]">Centralized Contact Directory</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="grid gap-4">
        {tags.map(tag => {
          const tagContacts = contactsByTag(tag);
          if (tagContacts.length === 0) return null;
          return (
            <Card key={tag}>
              <CardHeader>
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {tag.replace('_', ' ')}
                  <Badge variant="secondary">{tagContacts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tagContacts.map(contact => (
                  <div key={contact.id} className="p-3 border border-[rgba(255,255,255,0.05)] rounded-lg hover:border-[rgba(255,157,66,0.2)] transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#E5E7EB]">{contact.name}</h4>
                        {contact.company && (
                          <p className="text-sm text-[#9CA3AF] flex items-center gap-1 mt-1">
                            <Building className="w-3 h-3" />
                            {contact.company}
                          </p>
                        )}
                        {contact.role_title && (
                          <p className="text-sm text-[#6B7280] mt-1">{contact.role_title}</p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-sm text-[#FF9D42] hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </a>
                        )}
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-sm text-[#FF9D42] hover:underline flex items-center gap-1">
                            <MailIcon className="w-3 h-3" />
                            {contact.email}
                          </a>
                        )}
                      </div>
                    </div>
                    {contact.notes && (
                      <p className="text-xs text-[#6B7280] mt-2 border-t border-[rgba(255,255,255,0.05)] pt-2">{contact.notes}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {contacts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-[#6B7280]">
              No contacts yet. Click "Add Contact" to get started.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[#9CA3AF]">Name *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-[#9CA3AF]">Company</label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-[#9CA3AF]">Role/Title</label>
              <Input
                value={formData.role_title}
                onChange={(e) => setFormData(prev => ({ ...prev, role_title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-[#9CA3AF]">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-[#9CA3AF]">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-[#9CA3AF]">Tags</label>
              <Select
                value={formData.tags[0] || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tags: [value] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag} value={tag} className="capitalize">
                      {tag.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Add Contact</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}