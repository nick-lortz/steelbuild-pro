import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const demoProjects = [
  {
    project_number: 'DEMO-001',
    name: 'Downtown Office Complex',
    client: 'ABC Construction',
    location: '123 Main Street, Downtown',
    status: 'in_progress',
    contract_value: 2500000,
    start_date: '2025-01-15',
    target_completion: '2025-08-30',
    project_manager: 'John Smith',
    superintendent: 'Mike Johnson',
    gc_contact: 'Sarah Williams',
    gc_email: 'sarah@abcconstruction.com',
    gc_phone: '555-0123',
    scope_of_work: 'Structural steel erection for 8-story office building including columns, beams, and floor deck.',
    exclusions: 'Foundation work, exterior cladding, MEP systems',
    notes: 'Demo project for training purposes',
  },
  {
    project_number: 'DEMO-002',
    name: 'Westside Parking Garage',
    client: 'Metro Development Corp',
    location: '456 West Ave',
    status: 'awarded',
    contract_value: 850000,
    start_date: '2025-02-01',
    target_completion: '2025-06-15',
    project_manager: 'Emily Davis',
    superintendent: 'Robert Chen',
    gc_contact: 'Tom Anderson',
    gc_email: 'tom@metrodev.com',
    gc_phone: '555-0456',
    scope_of_work: '5-level parking structure with precast concrete and structural steel framing.',
    exclusions: 'Paving, lighting systems, elevator installation',
    notes: 'Fast-track schedule',
  },
  {
    project_number: 'DEMO-003',
    name: 'Industrial Warehouse Expansion',
    client: 'Summit Logistics',
    location: '789 Industrial Blvd',
    status: 'bidding',
    contract_value: 1200000,
    start_date: '2025-03-15',
    target_completion: '2025-09-30',
    project_manager: 'Lisa Martinez',
    superintendent: 'David Brown',
    gc_contact: 'Kevin Lee',
    gc_email: 'kevin@summitlogistics.com',
    gc_phone: '555-0789',
    scope_of_work: 'Steel frame expansion including pre-engineered metal building system.',
    exclusions: 'Site preparation, utilities connection',
    notes: 'Potential for additional phases',
  },
];

export default function DemoProjectSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const project of demoProjects) {
        const result = await apiClient.entities.Project.create(project);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Demo projects created successfully!');
      setIsSeeding(false);
    },
    onError: (error) => {
      toast.error('Failed to create demo projects: ' + error.message);
      setIsSeeding(false);
    },
  });

  const handleSeedProjects = () => {
    setIsSeeding(true);
    seedMutation.mutate();
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
          <Sparkles size={32} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome to SteelBuild Pro!</h3>
          <p className="text-zinc-400 mb-4 max-w-md">
            Get started quickly by creating demo projects. These sample projects will help you explore all features.
          </p>
        </div>
        <Button
          onClick={handleSeedProjects}
          disabled={isSeeding || seedMutation.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
        >
          {isSeeding || seedMutation.isPending ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Creating Demo Projects...
            </>
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              Create Demo Projects
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}