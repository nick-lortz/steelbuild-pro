import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Ruler, Grid3x3, Circle, Zap } from 'lucide-react';

const RFI_TEMPLATES = [
  {
    id: 'elevator_shaft',
    name: 'Elevator Shaft Dimensions',
    category: 'structural',
    icon: Grid3x3,
    fields: {
      subject: 'Elevator Shaft Dimensional Clarification',
      question: 'Please confirm elevator shaft dimensions and embed locations:\n\n- Shaft ID dimensions\n- Pit depth\n- Overhead clearance\n- Rail bracket locations\n- Guide rail embedments\n\nDrawings show conflicting dimensions between architectural and structural plans.',
      discipline: 'Steel Erection',
      spec_section: '05 12 00'
    }
  },
  {
    id: 'embed_coordination',
    name: 'Embed Coordination',
    category: 'coordination',
    icon: Circle,
    fields: {
      subject: 'Embed Plate Coordination Required',
      question: 'Embed plates shown on structural drawings conflict with architectural openings.\n\nPlease provide:\n- Updated embed locations\n- Revised anchor bolt layout\n- Coordination with MEP penetrations',
      discipline: 'Connections',
      spec_section: '05 12 00'
    }
  },
  {
    id: 'deck_direction',
    name: 'Deck Direction',
    category: 'clarification',
    icon: Ruler,
    fields: {
      subject: 'Deck Span Direction Clarification',
      question: 'Deck span direction is not clearly indicated on drawings.\n\nPlease confirm:\n- Span direction for Areas A, B, C\n- Deck gauge and profile\n- Shear stud layout requirements',
      discipline: 'Deck',
      spec_section: '05 31 00'
    }
  },
  {
    id: 'openings',
    name: 'Openings & Penetrations',
    category: 'coordination',
    icon: Grid3x3,
    fields: {
      subject: 'Floor Opening Dimensions',
      question: 'Please provide details for the following openings:\n\n- Exact dimensions and locations\n- Reinforcement requirements\n- Edge angles and headers\n- Coordination with deck layout',
      discipline: 'Structural Steel',
      spec_section: '05 12 00'
    }
  },
  {
    id: 'connection_clarification',
    name: 'Connection Clarification',
    category: 'structural',
    icon: Zap,
    fields: {
      subject: 'Connection Detail Clarification',
      question: 'Connection detail shown in drawings requires clarification:\n\n- Weld sizes and types\n- Bolt grade and installation method\n- Plate thickness confirmation\n- Field vs shop connection',
      discipline: 'Connections',
      spec_section: '05 12 00'
    }
  },
  {
    id: 'custom',
    name: 'Custom RFI',
    category: 'other',
    icon: FileText,
    fields: {
      subject: '',
      question: '',
      discipline: '',
      spec_section: ''
    }
  }
];

export default function RFITemplateSelector({ onSelectTemplate, onCancel }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold mb-2">Select RFI Template</h3>
        <p className="text-sm text-zinc-400">Start with a template to save time</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {RFI_TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="bg-zinc-900 border-zinc-800 hover:border-amber-500 cursor-pointer transition-all p-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-zinc-800 rounded">
                  <Icon size={20} className="text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">{template.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{template.category}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <Button variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export { RFI_TEMPLATES };