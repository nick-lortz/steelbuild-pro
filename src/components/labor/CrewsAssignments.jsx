import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, UserPlus, X, Users } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

export default function CrewsAssignments({ projectId }) {
  const queryClient = useQueryClient();
  const [createCrewOpen, setCreateCrewOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState(null);

  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews', projectId],
    queryFn: () => apiClient.entities.Crew.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.filter({ type: 'labor' })
  });

  const updateCrewMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Crew.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      toast.success('Crew updated');
      setAssignDialogOpen(false);
      setSelectedCrew(null);
    }
  });

  const handleAssignResources = (crew) => {
    setSelectedCrew(crew);
    setAssignDialogOpen(true);
  };

  const handleRemoveMember = (crew, memberEmail) => {
    const updatedMembers = crew.crew_members.filter(m => m.email !== memberEmail);
    updateCrewMutation.mutate({
      id: crew.id,
      data: { crew_members: updatedMembers }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading crews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Crews & Assignments</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {crews.length} {crews.length === 1 ? 'crew' : 'crews'} active
          </p>
        </div>
        <Button
          onClick={() => setCreateCrewOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus size={16} className="mr-2" />
          Create Crew
        </Button>
      </div>

      {/* Crews Grid */}
      {crews.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg">No crews created</p>
            <p className="text-zinc-500 text-sm mt-2">Create a crew to start assigning resources.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crews.map(crew => (
            <Card key={crew.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{crew.crew_name}</span>
                  <Badge className="capitalize">{crew.crew_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Lead: <span className="text-white">{crew.crew_lead}</span></p>
                  {crew.crew_lead_phone && (
                    <p className="text-sm text-zinc-400">Phone: <span className="text-white">{crew.crew_lead_phone}</span></p>
                  )}
                </div>

                {/* Crew Members */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Members ({crew.crew_members?.length || 0})
                  </p>
                  {crew.crew_members && crew.crew_members.length > 0 ? (
                    <div className="space-y-2">
                      {crew.crew_members.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                          <div>
                            <p className="text-white font-medium">{member.name}</p>
                            <p className="text-zinc-400 text-xs">{member.role || 'Worker'}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(crew, member.email)}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">No members assigned</p>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAssignResources(crew)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700"
                >
                  <UserPlus size={14} className="mr-2" />
                  Assign Resources
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Crew Dialog */}
      <Dialog open={createCrewOpen} onOpenChange={setCreateCrewOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Create New Crew</DialogTitle>
          </DialogHeader>
          <CreateCrewForm
            projectId={projectId}
            onClose={() => setCreateCrewOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['crews'] });
              setCreateCrewOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Assign Resources Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Resources to {selectedCrew?.crew_name}</DialogTitle>
          </DialogHeader>
          {selectedCrew && (
            <AssignResourcesForm
              crew={selectedCrew}
              resources={resources}
              onSave={(selectedResources) => {
                const existingMembers = selectedCrew.crew_members || [];
                const newMembers = selectedResources.map(r => ({
                  name: r.name,
                  email: r.contact_email || r.name.toLowerCase().replace(/\s/g, '.') + '@example.com',
                  role: r.classification || r.role || 'Worker',
                  skills: r.skills || []
                }));
                
                // Merge without duplicates
                const allMembers = [...existingMembers];
                newMembers.forEach(newMember => {
                  if (!allMembers.find(m => m.email === newMember.email)) {
                    allMembers.push(newMember);
                  }
                });
                
                updateCrewMutation.mutate({
                  id: selectedCrew.id,
                  data: { crew_members: allMembers }
                });
              }}
              onCancel={() => {
                setAssignDialogOpen(false);
                setSelectedCrew(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateCrewForm({ projectId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    crew_name: '',
    crew_lead: '',
    crew_lead_phone: '',
    crew_type: 'erection',
    status: 'active'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.crew_name || !formData.crew_lead) {
      toast.error('Crew name and lead required');
      return;
    }

    try {
      await apiClient.entities.Crew.create(formData);
      toast.success('Crew created');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create crew');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Crew Name *</label>
        <Input
          value={formData.crew_name}
          onChange={(e) => setFormData({ ...formData, crew_name: e.target.value })}
          placeholder="e.g., Erection Crew A"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Crew Type</label>
        <Select value={formData.crew_type} onValueChange={(v) => setFormData({ ...formData, crew_type: v })}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="erection">Erection</SelectItem>
            <SelectItem value="bolting">Bolting</SelectItem>
            <SelectItem value="welding">Welding</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="rigging">Rigging</SelectItem>
            <SelectItem value="coordination">Coordination</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Crew Lead *</label>
          <Input
            value={formData.crew_lead}
            onChange={(e) => setFormData({ ...formData, crew_lead: e.target.value })}
            placeholder="Name or email"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Lead Phone</label>
          <Input
            value={formData.crew_lead_phone}
            onChange={(e) => setFormData({ ...formData, crew_lead_phone: e.target.value })}
            placeholder="(555) 123-4567"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
          Create Crew
        </Button>
      </div>
    </form>
  );
}

function AssignResourcesForm({ crew, resources, onSave, onCancel }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResources, setSelectedResources] = useState([]);

  const existingEmails = (crew.crew_members || []).map(m => m.email);
  const availableResources = resources.filter(r => 
    !existingEmails.includes(r.contact_email || r.name.toLowerCase().replace(/\s/g, '.') + '@example.com')
  );

  const filteredResources = availableResources.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleResource = (resource) => {
    setSelectedResources(prev => 
      prev.find(r => r.id === resource.id)
        ? prev.filter(r => r.id !== resource.id)
        : [...prev, resource]
    );
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search resources..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-zinc-800 border-zinc-700"
      />

      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredResources.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">
            {availableResources.length === 0 
              ? 'All available resources are already assigned to this crew'
              : 'No matching resources found'}
          </p>
        ) : (
          filteredResources.map(resource => (
            <div
              key={resource.id}
              className="flex items-center gap-3 p-3 bg-zinc-800 rounded hover:bg-zinc-700 cursor-pointer"
              onClick={() => toggleResource(resource)}
            >
              <Checkbox
                checked={selectedResources.find(r => r.id === resource.id)}
                className="pointer-events-none"
              />
              <div className="flex-1">
                <p className="font-medium text-white">{resource.name}</p>
                <p className="text-sm text-zinc-400 capitalize">
                  {resource.classification || resource.role || 'Worker'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedResources.length > 0 && (
        <div className="p-3 bg-zinc-800 rounded">
          <p className="text-sm text-zinc-400 mb-2">
            {selectedResources.length} {selectedResources.length === 1 ? 'resource' : 'resources'} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedResources.map(r => (
              <Badge key={r.id} className="bg-amber-700">
                {r.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(selectedResources)}
          disabled={selectedResources.length === 0}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          Assign {selectedResources.length > 0 && `(${selectedResources.length})`}
        </Button>
      </div>
    </div>
  );
}