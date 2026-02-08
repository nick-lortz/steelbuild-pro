import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2,
  Truck,
  Wrench,
  Zap,
  DollarSign, 
  FileText, 
  MessageSquareWarning, 
  FileCheck, 
  Calendar,
  BarChart3,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Flame,
  AlertCircle
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: FileText,
      title: "Detailing Coordination",
      description: "Track drawings, revisions, approvals, and flag field-ready releases with QA gates"
    },
    {
      icon: Wrench,
      title: "Fabrication Tracking",
      description: "Monitor shop progress, work packages, and fabrication deliverables in real-time"
    },
    {
      icon: Truck,
      title: "Delivery Logistics",
      description: "Plan shipping, track deliveries, confirm field receipts, and manage bundles"
    },
    {
      icon: AlertCircle,
      title: "Field Issue Logging",
      description: "Capture fit-up, tolerance, and detail issues on-site with photos and crew context"
    },
    {
      icon: MessageSquareWarning,
      title: "RFI Management",
      description: "Streamline clarifications with cost/schedule impact tracking and auto-escalation"
    },
    {
      icon: DollarSign,
      title: "Cost & Budget Control",
      description: "Real-time budget tracking, change order analysis, and earned value metrics"
    },
    {
      icon: Calendar,
      title: "Schedule Planning",
      description: "Critical path, look-ahead planning, and erection sequencing with resource leveling"
    },
    {
      icon: Sparkles,
      title: "AI Risk Detection",
      description: "Predict delays, identify cost risks, and suggest detail library improvements"
    }
  ];

  const benefits = [
    "Eliminate field surprises with detail library learning from recurring issues",
    "Accelerate RFF (Release for Fabrication) with coordinated drawing approvals",
    "Predict erection delays before equipment mobilizes",
    "Track tonnage, work packages, and crew productivity end-to-end",
    "Control change order impact with real-time cost and schedule analytics",
    "Close projects faster with automated closeout documentation"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-zinc-950 to-black" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 sm:py-40">
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Flame size={40} className="text-white" />
              </div>
            </div>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter">
              SteelBuild <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Pro</span>
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-300 max-w-3xl mx-auto font-light">
              End-to-end steel erection and fabrication project management
            </p>
            <p className="text-base text-zinc-500 max-w-2xl mx-auto">
              From detailing through erection closeout. Coordinate fabrication, track field issues, 
              manage RFIs and change orders, and control budgets—all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-10 py-7 font-semibold rounded-lg shadow-lg shadow-amber-600/30">
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
          <h2 className="text-5xl font-bold mb-4 tracking-tight">Steel-Specific Capabilities</h2>
          <p className="text-zinc-400 text-lg font-light">Purpose-built tools for detailing, fabrication, delivery, and erection</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 hover:border-amber-500/50 transition-all rounded-lg">
                <CardContent className="p-6 space-y-3">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30">
                    <Icon size={24} className="text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
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