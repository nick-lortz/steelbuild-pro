import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center">
                <Building2 size={40} className="text-black" />
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              SteelBuild <span className="text-amber-500">Pro</span>
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-400 max-w-3xl mx-auto">
              Complete project management platform for structural steel fabricators
            </p>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Manage drawings, budgets, schedules, and teams from a single unified platform. 
              Powered by AI insights and real-time analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black text-lg px-8 py-6">
                  Get Started
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Projects')}>
                <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 text-lg px-8 py-6">
                  View Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-zinc-400 text-lg">Comprehensive tools for structural steel project management</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-all">
                <CardContent className="p-6 space-y-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Icon size={24} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Built for Steel Fabricators</h2>
              <p className="text-zinc-400 text-lg mb-8">
                SteelBuild Pro is specifically designed to handle the complexities of structural steel fabrication projects, 
                from initial detailing through final erection.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-zinc-300">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="text-3xl font-bold text-amber-500 mb-2">99.9%</div>
                <p className="text-sm text-zinc-400">System Uptime</p>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="text-3xl font-bold text-amber-500 mb-2">Real-time</div>
                <p className="text-sm text-zinc-400">Data Updates</p>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="text-3xl font-bold text-amber-500 mb-2">AI-Powered</div>
                <p className="text-sm text-zinc-400">Insights</p>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="text-3xl font-bold text-amber-500 mb-2">24/7</div>
                <p className="text-sm text-zinc-400">Access</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Card className="bg-gradient-to-br from-amber-500/10 to-zinc-900 border-amber-500/20">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold">Ready to Transform Your Projects?</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Join fabricators who are streamlining their operations with SteelBuild Pro
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black text-lg px-8 py-6">
                Start Managing Projects
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                <Building2 size={16} className="text-black" />
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