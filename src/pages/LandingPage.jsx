import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  DollarSign, 
  FileText, 
  MessageSquareWarning, 
  FileCheck, 
  Calendar,
  BarChart3,
  Sparkles,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Building2,
      title: "Project Management",
      description: "Centralized hub for all your structural steel projects with real-time status tracking"
    },
    {
      icon: DollarSign,
      title: "Financial Control",
      description: "Comprehensive budget tracking, expense management, and forecast analytics"
    },
    {
      icon: FileText,
      title: "Drawing Management",
      description: "Track drawing submissions, revisions, and approvals with automated workflows"
    },
    {
      icon: MessageSquareWarning,
      title: "RFI Tracking",
      description: "Streamline Request for Information processes with priority-based management"
    },
    {
      icon: FileCheck,
      title: "Change Orders",
      description: "Monitor change order impacts on budget and schedule in real-time"
    },
    {
      icon: Calendar,
      title: "Schedule Management",
      description: "Gantt charts, critical path analysis, and resource allocation tools"
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Data-driven insights on project performance, costs, and timelines"
    },
    {
      icon: Sparkles,
      title: "AI Project Manager",
      description: "Intelligent analysis and recommendations based on your actual project data"
    }
  ];

  const benefits = [
    "Reduce project delays by identifying critical path bottlenecks",
    "Improve budget accuracy with real-time cost tracking",
    "Streamline communication with automated RFI and CO workflows",
    "Make data-driven decisions with AI-powered insights",
    "Increase team productivity with centralized project data",
    "Ensure compliance with comprehensive audit trails"
  ];

  const workflowSteps = [
    {
      title: "Detailing & BOM",
      description: "Automated bills of material, connection tracking, and revision control."
    },
    {
      title: "Shop Fabrication",
      description: "Cut lists, weld maps, and QA checkpoints aligned to your shop floor."
    },
    {
      title: "Paint & Galvanize",
      description: "Coating schedules, cure times, and release tracking in one view."
    },
    {
      title: "Ship & Receive",
      description: "Load planning, delivery sequencing, and site check-in confirmations."
    },
    {
      title: "Field Erection",
      description: "Crane picks, bolt-up progress, and punch-list closeout visibility."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-zinc-950 to-black" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 sm:py-40">
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 size={40} className="text-white" />
              </div>
            </div>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter">
              SteelBuild <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Pro</span>
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-300 max-w-3xl mx-auto font-light">
              Complete project management platform for steel fabrication and erection teams
            </p>
            <p className="text-base text-zinc-500 max-w-2xl mx-auto">
              Coordinate detailing, shop production, and field erection from one crisp, unified workspace. 
              Powered by AI insights and real-time analytics built for steel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-7 font-semibold rounded-lg shadow-lg shadow-blue-600/30">
                  Get Started
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Projects')}>
                <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800/50 text-lg px-10 py-7 font-semibold rounded-lg bg-zinc-800/20">
                  View Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-4 tracking-tight">Everything You Need</h2>
          <p className="text-zinc-400 text-lg font-light">Comprehensive tools for structural steel project management</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 hover:border-blue-500/50 transition-all rounded-lg">
                <CardContent className="p-6 space-y-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <Icon size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Workflow Section */}
      <section className="bg-gradient-to-b from-black via-zinc-950 to-black border-y border-zinc-800/50 py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-5xl font-bold mb-4 tracking-tight">From Shop to Site</h2>
              <p className="text-zinc-400 text-lg font-light">
                A single workflow that connects fabrication, shipping, and erection with full traceability.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="px-3 py-1 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300">
                Steel-ready operations
              </span>
              <span className="px-3 py-1 rounded-full border border-zinc-700/60 bg-zinc-900/60">
                Real-time status
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step, idx) => (
              <Card key={step.title} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-700/50 rounded-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Step {idx + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full border border-blue-500/30 bg-blue-500/10 flex items-center justify-center text-blue-300 text-sm font-semibold">
                      {idx + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-b from-zinc-900/30 to-black border-y border-zinc-800/50 py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">Built for Steel Fabricators</h2>
              <p className="text-zinc-400 text-base mb-10 leading-relaxed font-light">
                SteelBuild Pro is specifically designed to handle the complexities of structural steel fabrication projects, 
                from initial detailing through final erection.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-zinc-300 text-sm">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
                <p className="text-sm text-zinc-400">System Uptime</p>
              </Card>
              <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-cyan-400 mb-2">Real-time</div>
                <p className="text-sm text-zinc-400">Data Updates</p>
              </Card>
              <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-blue-400 mb-2">AI-Powered</div>
                <p className="text-sm text-zinc-400">Insights</p>
              </Card>
              <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-cyan-400 mb-2">24/7</div>
                <p className="text-sm text-zinc-400">Access</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
        <Card className="bg-gradient-to-br from-blue-600/10 to-black border-blue-500/30 rounded-lg overflow-hidden">
          <CardContent className="p-16 text-center space-y-6">
            <h2 className="text-5xl font-bold tracking-tight">Ready to Transform Your Projects?</h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-light">
              Join fabricators who are streamlining their operations with SteelBuild Pro
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-7 font-semibold rounded-lg shadow-lg shadow-blue-600/30">
                Start Managing Projects
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="font-bold">SteelBuild Pro</span>
            </div>
            <p className="text-sm text-zinc-500">
              © 2025 SteelBuild Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
