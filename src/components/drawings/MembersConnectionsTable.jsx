import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function MembersConnectionsTable({ extracted }) {
  if (!extracted) return null;

  return (
    <div className="space-y-6">
      {/* Members Table */}
      {extracted.members && extracted.members.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Structural Members</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extracted.members.map((member, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{member.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.designation || '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{member.quantity || 1}</TableCell>
                  <TableCell>
                    <Badge className="bg-slate-600">
                      {member.grade || 'Unspecified'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{member.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Connections Table */}
      {extracted.connections && extracted.connections.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Connections</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bolt Spec</TableHead>
                <TableHead>Weld Spec</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extracted.connections.map((conn, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{conn.location}</TableCell>
                  <TableCell>
                    <Badge>{conn.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {conn.bolt_spec || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {conn.weld_spec || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={conn.status === 'incomplete' ? 'border-red-500' : ''}>
                      {conn.status || 'OK'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}