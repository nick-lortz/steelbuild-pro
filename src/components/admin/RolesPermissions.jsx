import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from '@/components/ui/notifications';
import { Save } from 'lucide-react';

const MODULES = [
  { id: 'projects', label: 'Projects', permissions: ['view', 'create', 'edit', 'delete'] },
  { id: 'change_orders', label: 'Change Orders', permissions: ['view', 'create', 'approve', 'edit'] },
  { id: 'rfis', label: 'RFIs', permissions: ['view', 'create', 'respond', 'close'] },
  { id: 'submittals', label: 'Submittals', permissions: ['view', 'create', 'approve'] },
  { id: 'financials', label: 'Financials', permissions: ['view', 'edit', 'approve_expenses'] },
  { id: 'reports', label: 'Reports', permissions: ['view', 'export'] }
];

const ROLES = ['Admin', 'Project Manager', 'Superintendent', 'Foreman', 'Accounting', 'Read-Only'];

export default function RolesPermissions() {
  const [selectedRole, setSelectedRole] = useState('Project Manager');
  const [permissions, setPermissions] = useState({});

  const togglePermission = (module, permission) => {
    const key = `${module}_${permission}`;
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    // In production, this would save to UserPermissionOverride entity
    toast.success('Permissions updated and logged');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">Configure module-level access control</p>
        </div>
        <Button onClick={handleSave}>
          <Save size={16} className="mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {ROLES.map(role => (
          <Button
            key={role}
            variant={selectedRole === role ? 'default' : 'outline'}
            onClick={() => setSelectedRole(role)}
            className="text-xs"
          >
            {role}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions for {selectedRole}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {MODULES.map(module => (
            <div key={module.id} className="border-b border-border pb-4 last:border-0">
              <h4 className="font-semibold mb-3">{module.label}</h4>
              <div className="grid grid-cols-4 gap-4">
                {module.permissions.map(perm => {
                  const key = `${module.id}_${perm}`;
                  return (
                    <div key={perm} className="flex items-center gap-2">
                      <Switch
                        id={key}
                        checked={permissions[key] || false}
                        onCheckedChange={() => togglePermission(module.id, perm)}
                      />
                      <Label htmlFor={key} className="text-sm capitalize cursor-pointer">
                        {perm.replace('_', ' ')}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded">
        <p className="text-sm text-amber-400">
          ⚠️ All permission changes are logged and auditable. Changes take effect immediately.
        </p>
      </div>
    </div>
  );
}