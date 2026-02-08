import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { createPageUrl } from '@/utils';

export default function ProjectSettings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('project');
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await apiClient.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const [config, setConfig] = useState({
    custom_fields: [],
    phase_settings: {
      detailing_defaults: { default_duration_days: 14 },
      fabrication_defaults: { default_duration_days: 21 },
      delivery_defaults: { default_duration_days: 1 },
      erection_defaults: { default_duration_days: 30 },
      closeout_defaults: { default_duration_days: 7 }
    },
    task_defaults: {
      default_status: 'not_started',
      require_predecessor: false,
      auto_assign_pm: true
    }
  });

  React.useEffect(() => {
    if (project?.settings) {
      try {
        const parsed = typeof project.settings === 'string' 
          ? JSON.parse(project.settings) 
          : project.settings;
        setConfig({ ...config, ...parsed });
      } catch (e) {
        // Invalid JSON, keep defaults
      }
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async (settings) => {
      return await apiClient.entities.Project.update(projectId, {
        settings: JSON.stringify(settings)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Settings saved');
    }
  });

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const addCustomField = () => {
    setConfig({
      ...config,
      custom_fields: [
        ...config.custom_fields,
        { name: '', type: 'text', required: false }
      ]
    });
  };

  const updateCustomField = (index, field) => {
    const updated = [...config.custom_fields];
    updated[index] = { ...updated[index], ...field };
    setConfig({ ...config, custom_fields: updated });
  };

  const removeCustomField = (index) => {
    setConfig({
      ...config,
      custom_fields: config.custom_fields.filter((_, i) => i !== index)
    });
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500">No project selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('Projects'))}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white uppercase tracking-wide">Project Settings</h1>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {project?.project_number} - {project?.name}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <Save size={16} className="mr-2" />
              {updateMutation.isPending ? 'SAVING...' : 'SAVE SETTINGS'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <Tabs defaultValue="phases" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="phases">Phase Defaults</TabsTrigger>
            <TabsTrigger value="tasks">Task Defaults</TabsTrigger>
            <TabsTrigger value="custom">Custom Fields</TabsTrigger>
          </TabsList>

          {/* Phase Defaults */}
          <TabsContent value="phases">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Phase Duration Defaults</CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  Default durations applied when creating new tasks in each phase
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-zinc-400">Detailing</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.phase_settings.detailing_defaults.default_duration_days}
                        onChange={(e) => setConfig({
                          ...config,
                          phase_settings: {
                            ...config.phase_settings,
                            detailing_defaults: {
                              default_duration_days: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      <span className="text-sm text-zinc-500">days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-zinc-400">Fabrication</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.phase_settings.fabrication_defaults.default_duration_days}
                        onChange={(e) => setConfig({
                          ...config,
                          phase_settings: {
                            ...config.phase_settings,
                            fabrication_defaults: {
                              default_duration_days: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      <span className="text-sm text-zinc-500">days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-zinc-400">Delivery</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.phase_settings.delivery_defaults.default_duration_days}
                        onChange={(e) => setConfig({
                          ...config,
                          phase_settings: {
                            ...config.phase_settings,
                            delivery_defaults: {
                              default_duration_days: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      <span className="text-sm text-zinc-500">days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-zinc-400">Erection</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.phase_settings.erection_defaults.default_duration_days}
                        onChange={(e) => setConfig({
                          ...config,
                          phase_settings: {
                            ...config.phase_settings,
                            erection_defaults: {
                              default_duration_days: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      <span className="text-sm text-zinc-500">days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-zinc-400">Closeout</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.phase_settings.closeout_defaults.default_duration_days}
                        onChange={(e) => setConfig({
                          ...config,
                          phase_settings: {
                            ...config.phase_settings,
                            closeout_defaults: {
                              default_duration_days: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      <span className="text-sm text-zinc-500">days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Defaults */}
          <TabsContent value="tasks">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Task Creation Defaults</CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  Default settings applied to new tasks
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                    <div>
                      <p className="text-sm font-medium text-white">Auto-assign Project Manager</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Automatically assign tasks to the project PM
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.task_defaults.auto_assign_pm}
                      onChange={(e) => setConfig({
                        ...config,
                        task_defaults: {
                          ...config.task_defaults,
                          auto_assign_pm: e.target.checked
                        }
                      })}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                    <div>
                      <p className="text-sm font-medium text-white">Require Predecessor</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Enforce dependency assignment for new tasks
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.task_defaults.require_predecessor}
                      onChange={(e) => setConfig({
                        ...config,
                        task_defaults: {
                          ...config.task_defaults,
                          require_predecessor: e.target.checked
                        }
                      })}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Fields */}
          <TabsContent value="custom">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Custom Fields</span>
                  <Button
                    size="sm"
                    onClick={addCustomField}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  >
                    <Plus size={14} className="mr-1" />
                    ADD FIELD
                  </Button>
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  Project-specific data fields
                </p>
              </CardHeader>
              <CardContent>
                {config.custom_fields.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">
                    No custom fields defined
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config.custom_fields.map((field, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-zinc-950 rounded border border-zinc-800">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <Input
                            placeholder="Field name"
                            value={field.name}
                            onChange={(e) => updateCustomField(index, { name: e.target.value })}
                            className="bg-zinc-900 border-zinc-800"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateCustomField(index, { type: e.target.value })}
                            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                          <label className="flex items-center gap-2 text-sm text-zinc-400">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                              className="w-4 h-4"
                            />
                            Required
                          </label>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCustomField(index)}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}