import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Plus, X, Save } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const SKILL_OPTIONS = [
  'AWS Certified Welder',
  'CWI Certified',
  'OSHA 30',
  'OSHA 10',
  'Rigging',
  'Bolting',
  'Crane Operations',
  'Blueprint Reading',
  'Layout',
  'Fit-Up',
  'Tack Welding',
  'Final Welding',
  'Grinding',
  'Plumb & Level',
  'Decking',
  'Shear Stud Installation'
];

const CERTIFICATION_OPTIONS = [
  'AWS D1.1',
  'AWS D1.8',
  'CWI',
  'CWE',
  'NCCER',
  'First Aid/CPR',
  'Forklift Certified',
  'Aerial Lift',
  'Confined Space',
  'Fall Protection'
];

export default function UserSkillsManager() {
  const queryClient = useQueryClient();
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    skills: [],
    skill_level: '',
    certifications: [],
    weekly_capacity_hours: 40,
    hourly_rate: 0
  });
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      await base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User profile updated');
      setEditingUserId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user');
    }
  });

  const startEditing = (user) => {
    setEditingUserId(user.id);
    setFormData({
      skills: user.skills || [],
      skill_level: user.skill_level || '',
      certifications: user.certifications || [],
      weekly_capacity_hours: user.weekly_capacity_hours || 40,
      hourly_rate: user.hourly_rate || 0
    });
  };

  const handleSave = () => {
    if (!editingUserId) return;
    updateUserMutation.mutate({
      userId: editingUserId,
      data: formData
    });
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (formData.skills.includes(newSkill)) {
      toast.error('Skill already added');
      return;
    }
    setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill] }));
    setNewSkill('');
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addCertification = () => {
    if (!newCert.trim()) return;
    if (formData.certifications.includes(newCert)) {
      toast.error('Certification already added');
      return;
    }
    setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert] }));
    setNewCert('');
  };

  const removeCertification = (cert) => {
    setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== cert) }));
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award size={18} />
          User Skills & Certifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">No users found</div>
        ) : (
          users.map(user => {
            const isEditing = editingUserId === user.id;
            const canEdit = currentUser?.role === 'admin' || currentUser?.id === user.id;

            return (
              <div key={user.id} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white">{user.full_name}</div>
                    <div className="text-xs text-zinc-400">{user.email} • {user.role}</div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <Button size="sm" variant="outline" onClick={() => startEditing(user)}>
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditingUserId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSave}>
                            <Save size={14} className="mr-1" />
                            Save
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Skill Level</Label>
                      <Select value={formData.skill_level} onValueChange={(v) => setFormData(prev => ({ ...prev, skill_level: v }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apprentice">Apprentice</SelectItem>
                          <SelectItem value="journeyman">Journeyman</SelectItem>
                          <SelectItem value="foreman">Foreman</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="specialist">Specialist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Skills</Label>
                      <div className="flex gap-2 mt-1">
                        <Select value={newSkill} onValueChange={setNewSkill}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Add skill" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_OPTIONS.map(skill => (
                              <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={addSkill}>
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.skills.map(skill => (
                          <Badge key={skill} variant="secondary" className="text-xs flex items-center gap-1">
                            {skill}
                            <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => removeSkill(skill)} />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Certifications</Label>
                      <div className="flex gap-2 mt-1">
                        <Select value={newCert} onValueChange={setNewCert}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Add certification" />
                          </SelectTrigger>
                          <SelectContent>
                            {CERTIFICATION_OPTIONS.map(cert => (
                              <SelectItem key={cert} value={cert}>{cert}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={addCertification}>
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.certifications.map(cert => (
                          <Badge key={cert} variant="default" className="text-xs flex items-center gap-1">
                            {cert}
                            <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => removeCertification(cert)} />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Weekly Capacity (hrs)</Label>
                        <Input
                          type="number"
                          value={formData.weekly_capacity_hours}
                          onChange={(e) => setFormData(prev => ({ ...prev, weekly_capacity_hours: Number(e.target.value) }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hourly Rate ($)</Label>
                        <Input
                          type="number"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: Number(e.target.value) }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {user.skill_level && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 w-24">Level:</span>
                        <Badge variant="outline" className="text-xs capitalize">{user.skill_level}</Badge>
                      </div>
                    )}
                    {user.skills?.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-zinc-500 w-24 pt-1">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {user.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.certifications?.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-zinc-500 w-24 pt-1">Certs:</span>
                        <div className="flex flex-wrap gap-1">
                          {user.certifications.map(cert => (
                            <Badge key={cert} variant="default" className="text-[10px]">{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.weekly_capacity_hours && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 w-24">Capacity:</span>
                        <span className="text-white">{user.weekly_capacity_hours} hrs/week</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}