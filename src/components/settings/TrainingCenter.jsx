import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, Building, FileText, DollarSign, Calendar, 
  MessageSquareWarning, Truck, CheckCircle2, TrendingUp,
  AlertCircle, Users, Wrench, Package
} from 'lucide-react';

export default function TrainingCenter() {
  const [activeModule, setActiveModule] = useState('overview');

  const modules = [
    { id: 'overview', name: 'App Overview', icon: BookOpen },
    { id: 'projects', name: 'Project Setup', icon: Building },
    { id: 'schedule', name: 'Scheduling', icon: Calendar },
    { id: 'rfis', name: 'RFI Management', icon: MessageSquareWarning },
    { id: 'changes', name: 'Change Orders', icon: DollarSign },
    { id: 'financials', name: 'Cost Control', icon: TrendingUp },
    { id: 'deliveries', name: 'Logistics', icon: Truck },
    { id: 'workpackages', name: 'Work Packages', icon: FileText },
    { id: 'resources', name: 'Resources', icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* Module Selector */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {modules.map(module => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;
          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`p-4 rounded-lg border transition-all ${
                isActive 
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <Icon size={20} className="mx-auto mb-2" />
              <p className="text-xs font-bold">{module.name}</p>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          {activeModule === 'overview' && <OverviewContent />}
          {activeModule === 'projects' && <ProjectSetupContent />}
          {activeModule === 'schedule' && <SchedulingContent />}
          {activeModule === 'rfis' && <RFIManagementContent />}
          {activeModule === 'changes' && <ChangeOrdersContent />}
          {activeModule === 'financials' && <FinancialsContent />}
          {activeModule === 'deliveries' && <DeliveriesContent />}
          {activeModule === 'workpackages' && <WorkPackagesContent />}
          {activeModule === 'resources' && <ResourcesContent />}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">SteelBuild Pro Overview</h2>
        <p className="text-zinc-400 text-sm">Enterprise project management for structural steel fabrication and erection</p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="workflow" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Steel Project Lifecycle</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-3">
            <ol className="list-decimal ml-5 space-y-2">
              <li><strong>Bidding → Award:</strong> Project setup, contract review, scope documentation</li>
              <li><strong>Detailing:</strong> Connection design, shop drawings, approval cycles</li>
              <li><strong>Fabrication:</strong> Material procurement, shop production, QC inspections</li>
              <li><strong>Delivery:</strong> Load planning, logistics coordination, site readiness</li>
              <li><strong>Erection:</strong> Sequencing, crew assignment, safety, daily progress</li>
              <li><strong>Closeout:</strong> Punch list, as-builts, final billing, lessons learned</li>
            </ol>
            <p className="mt-3 text-amber-400 text-xs font-semibold">
              The app mirrors this lifecycle—every module aligns to a phase of work.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="navigation" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Navigation & Active Project</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Most pages require an <strong>active project</strong> to be selected. Use the project selector in the top bar or sidebar.</p>
            <p>Data is scoped by project—RFIs, tasks, costs, drawings all filter to your active selection.</p>
            <p><strong>Multi-project views</strong> are available in Schedule, Analytics, and Executive Roll-Up.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="roles" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">User Roles & Permissions</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Admin:</strong> Full access, user management, data governance</li>
              <li><strong>Project Manager:</strong> Full project control, cost approval, RFI routing</li>
              <li><strong>User:</strong> Task execution, time entry, field reporting</li>
            </ul>
            <p className="mt-2 text-xs text-zinc-500">Permissions are enforced at the database level (RLS) for security.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function ProjectSetupContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Project Setup & Job Won Workflow</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="create" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Creating a New Project</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-3">
            <p><strong>Required fields:</strong> Project Number, Name, Client, Status</p>
            <p><strong>Best practice:</strong> Set PM, Superintendent, and Assigned Users immediately for proper access control.</p>
            <p><strong>Contract tracking:</strong> Upload contract docs, set received/due dates, track ball-in-court status.</p>
            <div className="bg-zinc-800/50 p-3 rounded mt-3">
              <p className="font-semibold text-amber-400 text-xs mb-2">WHY IT WORKS THIS WAY:</p>
              <p className="text-xs">Project-scoped data ensures proper security and filtering. Assigning users early prevents access issues downstream.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pmtoolkit" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">PM Toolkit: Job Won Checklist</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Navigate to <strong>PM Toolkit → Job Setup</strong> to initialize:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Contract documentation and scope letter upload</li>
              <li>SOL kickoff email generation</li>
              <li>Scope exclusions and clarifications</li>
              <li>Contact management (GC, architect, engineer, suppliers)</li>
            </ul>
            <p className="mt-2 text-amber-400 text-xs">Use templates to standardize job won workflows across all projects.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="baseline" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Setting Baselines</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Set baseline hours (shop + field) and contract value to enable variance tracking.</p>
            <p><strong>Shop/Field Hours:</strong> Used for productivity analysis and EVM metrics.</p>
            <p><strong>Budget Baselines:</strong> Set in Financials → Budget tab for cost code-level tracking.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function SchedulingContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Scheduling & Critical Path</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="phases" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Task Phases</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Every task has a phase: Detailing → Fabrication → Delivery → Erection → Closeout</p>
            <p><strong>Gantt view</strong> color-codes by phase for visual sequencing.</p>
            <p><strong>Dependencies:</strong> Use Finish-to-Start (FS) dependencies to enforce logic (e.g., fab can't start until detailing complete).</p>
            <div className="bg-zinc-800/50 p-3 rounded mt-3">
              <p className="font-semibold text-amber-400 text-xs mb-2">STEEL LOGIC:</p>
              <p className="text-xs">Detailing must be approved before fab release. Fab must complete before delivery. Delivery must arrive before erection starts.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="critical" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Critical Path Tasks</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Mark tasks as <strong>Critical</strong> to highlight longest path to completion.</p>
            <p>Critical tasks show in red on Gantt and get priority in Look-Ahead Planning.</p>
            <p>Delays to critical tasks directly impact project completion date.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wbs" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">WBS Codes & Hierarchy</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Use WBS codes (e.g., 1.2.3) to organize tasks hierarchically.</p>
            <p>Example: <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">1.0 Detailing → 1.1 Connections → 1.1.1 Beam-to-Column</code></p>
            <p>AI WBS Generator can auto-create structure based on project scope.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lookahead" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Look-Ahead Planning</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Weekly look-ahead view shows upcoming work by crew and area.</p>
            <p><strong>Constraint detection:</strong> System flags tasks missing drawings, materials, or resources.</p>
            <p>Use this for <strong>Friday planning meetings</strong> to ensure Monday readiness.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function RFIManagementContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">RFI Best Practices</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="create" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Creating Effective RFIs</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-3">
            <p><strong>Be specific:</strong> Reference drawing number, detail, gridline, elevation.</p>
            <p><strong>Attach markups:</strong> Upload sketches or annotated drawings for clarity.</p>
            <p><strong>Link dependencies:</strong> Tag related drawings, tasks, or deliveries.</p>
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded mt-3">
              <p className="font-semibold text-amber-400 text-xs mb-2">EXAMPLE:</p>
              <p className="text-xs italic">"Connection detail 5/S3.4 shows W18x35 beam framing to W14x90 column. Weld size not called out. Clarify: 5/16" fillet or CJP? Affects fab release for Grid B."</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="statuses" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">RFI Status Workflow</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <ol className="list-decimal ml-5 space-y-1">
              <li><strong>Draft:</strong> Internal prep, not yet submitted</li>
              <li><strong>Internal Review:</strong> PM/team review before sending</li>
              <li><strong>Submitted:</strong> Sent to architect/engineer/GC</li>
              <li><strong>Under Review:</strong> External party reviewing</li>
              <li><strong>Answered:</strong> Response received, implement in field/shop</li>
              <li><strong>Closed:</strong> Drawings updated, teams notified, complete</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ballincourt" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Ball-in-Court Tracking</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Always update <strong>Ball in Court</strong> to show who's responsible for next action.</p>
            <p><strong>Internal:</strong> Your team (detailer, PM, estimator)</p>
            <p><strong>External:</strong> Waiting on architect, engineer, or GC response</p>
            <p className="text-amber-400 text-xs mt-2">Use this to drive accountability and follow-up cadence.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="escalation" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Auto-Escalation Logic</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>System auto-calculates business days open and escalation level:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Normal:</strong> 0-5 business days</li>
              <li><strong>Warning:</strong> 5-10 business days</li>
              <li><strong>Urgent:</strong> 10-15 business days</li>
              <li><strong>Overdue:</strong> 15+ business days</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-2">This ensures critical RFIs don't fall through the cracks.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="blockers" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Fabrication Blockers</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Tag RFIs as <strong>Fab Blocker</strong> if they prevent release to shop.</p>
            <p>Link to <strong>Release Groups</strong> and <strong>Piece Marks</strong> for traceability.</p>
            <p>Dashboard surfaces all fab blockers for daily stand-up review.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function ChangeOrdersContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Change Order Management</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="structure" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">CO Structure & Line Items</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Each Change Order contains multiple line items:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Charge:</strong> Additional work (increases contract value)</li>
              <li><strong>Credit:</strong> Deducted scope (reduces contract value)</li>
            </ul>
            <p className="mt-3">Track weight (tons), shop hours, field hours, equipment, material, and other costs per line.</p>
            <p className="text-amber-400 text-xs mt-2">Net CO value = Total Charges - Total Credits</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="workflow" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">CO Approval Workflow</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <ol className="list-decimal ml-5 space-y-1">
              <li><strong>Draft:</strong> Build line items, calculate costs</li>
              <li><strong>Submitted:</strong> Sent to GC for review</li>
              <li><strong>Under Review:</strong> GC evaluating pricing</li>
              <li><strong>Approved:</strong> Signed, incorporated into contract</li>
              <li><strong>Rejected:</strong> Not approved, archive or revise</li>
            </ol>
            <p className="mt-3 text-xs text-zinc-500">Version history tracks all revisions and approval chain.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pmtool" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">PM Toolkit: Shipping & Travel Calculator</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Use the calculator in <strong>PM Toolkit → Shipping & Travel</strong> to price:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Shipping costs:</strong> Loads, distance, labor, mileage</li>
              <li><strong>Travel costs:</strong> Men, duration, per diem, hotel, mileage</li>
            </ul>
            <p className="mt-2">Results auto-populate CO line items when linked.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="linkage" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Linking COs to RFIs & Tasks</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Always link Change Orders to:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>RFIs:</strong> Establishes cause-and-effect for backup claim documentation</li>
              <li><strong>Tasks:</strong> Tracks schedule impact of added scope</li>
              <li><strong>Drawings:</strong> References affected drawing sets/revisions</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-2">Linkage enables impact analysis and audit trail for disputes.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function FinancialsContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Cost Control & Budget Management</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="costcodes" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Cost Code Hierarchy</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Cost codes organize spending by category (Labor, Material, Equipment, Subs).</p>
            <p><strong>Hierarchy:</strong> Parent codes roll up child codes for summary reporting.</p>
            <p>Example: <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">05100 Structural Steel → 05110 Shop Fab → 05111 Beam Fab</code></p>
            <p className="text-amber-400 text-xs mt-2">Map cost codes to SOV line items for billing alignment.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="evm" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Earned Value Metrics (EVM)</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p><strong>Budget:</strong> Original plan (baseline)</p>
            <p><strong>Committed:</strong> POs and subcontracts issued</p>
            <p><strong>Actuals:</strong> Invoices, timesheets, expenses logged</p>
            <p><strong>ETC (Estimate to Complete):</strong> Forecast remaining cost</p>
            <p><strong>EAC (Estimate at Completion):</strong> Actuals + ETC = projected final cost</p>
            <div className="bg-zinc-800/50 p-3 rounded mt-3">
              <p className="font-semibold text-amber-400 text-xs mb-2">KEY FORMULAS:</p>
              <p className="text-xs font-mono">Variance = Budget - Actuals</p>
              <p className="text-xs font-mono">Forecast Overrun = EAC - Budget</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="expenses" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Expense Tracking</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Log expenses with cost code assignments for automatic rollup.</p>
            <p><strong>Expense splits:</strong> Allocate single expense across multiple cost codes/projects.</p>
            <p>Expenses auto-update Financial actuals in real-time.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sov" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">SOV & Billing</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Schedule of Values (SOV) defines billable line items per contract.</p>
            <p><strong>Percent complete:</strong> Update monthly based on actual work in place.</p>
            <p><strong>Cost alignment:</strong> System flags mismatches between SOV and budget cost codes.</p>
            <p>Generate invoices from SOV progress for AIA G702/G703 billing.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function DeliveriesContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Logistics & Delivery Management</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="planning" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Delivery Planning</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Plan deliveries by <strong>release group</strong> (bundles of related steel).</p>
            <p><strong>Sequence deliveries</strong> to match erection sequence—deliver Grid A before Grid B.</p>
            <p>Set <strong>required on-site date</strong> based on erection start minus laydown time.</p>
            <p className="text-amber-400 text-xs mt-2">Early deliveries cause site congestion. Late deliveries delay erection.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tracking" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Delivery Tracking</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Update delivery status: Planned → Shipped → In Transit → Delivered → Inspected</p>
            <p><strong>Receiving mode:</strong> Use mobile view for quick on-site check-in.</p>
            <p>Log any damage, shortages, or discrepancies immediately for claim documentation.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="conflicts" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Delivery Conflict Detection</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>System flags conflicts:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Delivery arrives before erection crew assigned</li>
              <li>Multiple heavy lifts scheduled same day (crane conflict)</li>
              <li>Delivery scheduled before prerequisite tasks complete</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-2">Review conflicts weekly in Look-Ahead Planning.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function WorkPackagesContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Work Package Execution</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="definition" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">What is a Work Package?</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>A work package is a <strong>releasable unit of work</strong> (e.g., Grid A columns, Roof joists).</p>
            <p>Tracks progression: Detailing → Fab → Delivery → Erection</p>
            <p><strong>Prerequisites:</strong> System validates drawings approved, materials available, resources assigned before phase advancement.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="blocker" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Blocker Engine</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Before advancing a work package, system checks:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>All drawings status = FFF (Final for Fabrication)</li>
              <li>No open design intent flags</li>
              <li>No fab blocker RFIs</li>
              <li>Material availability confirmed</li>
            </ul>
            <p className="text-red-400 text-xs mt-2">If blocked, system shows exact issue and owner to resolve.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="readiness" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Fabrication Readiness Score</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Automated scoring (0-100%) based on:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Drawing approval completeness</li>
              <li>Open RFI count and severity</li>
              <li>Material procurement status</li>
              <li>Connection design finalization</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-2">Below 80% = high risk of shop delays or rework.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function ResourcesContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Resource & Crew Management</h2>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="types" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Resource Types</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p><strong>Labor:</strong> Ironworkers, welders, foremen (track skill level, certifications)</p>
            <p><strong>Equipment:</strong> Cranes, lifts, welders (track usage, maintenance)</p>
            <p><strong>Subcontractors:</strong> Specialty trades (track scope, rates, availability)</p>
            <p className="mt-2">Set hourly/daily rates for cost calculation on tasks and work packages.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="allocation" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Resource Allocation</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Assign resources to tasks or work packages.</p>
            <p><strong>Capacity tracking:</strong> System calculates weekly capacity (default 40hrs) and flags over-allocation.</p>
            <p><strong>Cross-project view:</strong> See resource utilization across all active projects.</p>
            <p className="text-xs text-zinc-500 mt-2">Prevents double-booking and identifies capacity gaps early.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="crews" className="border border-zinc-800 rounded-lg px-4 bg-zinc-900/50">
          <AccordionTrigger className="text-white font-semibold">Crew Composition</AccordionTrigger>
          <AccordionContent className="text-sm text-zinc-300 space-y-2">
            <p>Build crews with mix of skill levels (foreman, journeyman, apprentice).</p>
            <p>Assign crews to erection areas or phases for sequencing.</p>
            <p>Track daily production rates (tons/day) for forecasting.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Placeholder content for remaining sections
function ScheduleContent() {
  return <p className="text-zinc-400">Schedule content coming soon</p>;
}
function DeliveryContent() {
  return <p className="text-zinc-400">Delivery content coming soon</p>;
}

function WorkPackagesContent2() {
  return <p className="text-zinc-400">Work packages content coming soon</p>;
}