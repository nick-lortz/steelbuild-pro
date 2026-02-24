import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VendorInfoPanel({ project }) {
  if (!project) return null;

  const hasVendorInfo = project.has_deck || project.has_joists || project.detailer;

  if (!hasVendorInfo) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6 text-center">
          <XCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No vendor information configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Detailer */}
      {project.detailer && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Detailer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div>
              <p className="text-xs text-zinc-500 uppercase">Company</p>
              <p className="text-sm text-white font-medium">{project.detailer}</p>
            </div>
            {project.detailer_contact && (
              <div>
                <p className="text-xs text-zinc-500 uppercase">Contact</p>
                <p className="text-sm text-zinc-300">{project.detailer_contact}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {project.detailer_email && (
                <a 
                  href={`mailto:${project.detailer_email}`}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <Mail className="w-3 h-3" />
                  {project.detailer_email}
                </a>
              )}
              {project.detailer_phone && (
                <a 
                  href={`tel:${project.detailer_phone}`}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                  <Phone className="w-3 h-3" />
                  {project.detailer_phone}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Joist Manufacturer */}
      {project.has_joists && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-500" />
                Joist Manufacturer
              </CardTitle>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                JOISTS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {project.joist_manufacturer ? (
              <>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Company</p>
                  <p className="text-sm text-white font-medium">{project.joist_manufacturer}</p>
                </div>
                {project.joist_mfg_contact && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Contact</p>
                    <p className="text-sm text-zinc-300">{project.joist_mfg_contact}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  {project.joist_mfg_email && (
                    <a 
                      href={`mailto:${project.joist_mfg_email}`}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                      <Mail className="w-3 h-3" />
                      {project.joist_mfg_email}
                    </a>
                  )}
                  {project.joist_mfg_phone && (
                    <a 
                      href={`tel:${project.joist_mfg_phone}`}
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                      <Phone className="w-3 h-3" />
                      {project.joist_mfg_phone}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-amber-400">⚠️ No manufacturer specified</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deck Manufacturer */}
      {project.has_deck && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-500" />
                Deck Manufacturer
              </CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                DECK MFG
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {project.deck_manufacturer ? (
              <>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Company</p>
                  <p className="text-sm text-white font-medium">{project.deck_manufacturer}</p>
                </div>
                {project.deck_mfg_contact && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Contact</p>
                    <p className="text-sm text-zinc-300">{project.deck_mfg_contact}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  {project.deck_mfg_email && (
                    <a 
                      href={`mailto:${project.deck_mfg_email}`}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                      <Mail className="w-3 h-3" />
                      {project.deck_mfg_email}
                    </a>
                  )}
                  {project.deck_mfg_phone && (
                    <a 
                      href={`tel:${project.deck_mfg_phone}`}
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                      <Phone className="w-3 h-3" />
                      {project.deck_mfg_phone}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-amber-400">⚠️ No manufacturer specified</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deck Installer */}
      {project.has_deck && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                Deck Installer
              </CardTitle>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                INSTALLER
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {project.deck_installer ? (
              <>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Company</p>
                  <p className="text-sm text-white font-medium">{project.deck_installer}</p>
                </div>
                {project.deck_installer_contact && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Contact</p>
                    <p className="text-sm text-zinc-300">{project.deck_installer_contact}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  {project.deck_installer_email && (
                    <a 
                      href={`mailto:${project.deck_installer_email}`}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                      <Mail className="w-3 h-3" />
                      {project.deck_installer_email}
                    </a>
                  )}
                  {project.deck_installer_phone && (
                    <a 
                      href={`tel:${project.deck_installer_phone}`}
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                      <Phone className="w-3 h-3" />
                      {project.deck_installer_phone}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-amber-400">⚠️ No installer specified</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}