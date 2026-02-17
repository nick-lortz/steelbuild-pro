import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building, 
  FileText, 
  Wrench, 
  Truck, 
  HardHat, 
  CheckCircle2,
  ArrowRight,
  BarChart3,
  MessageSquare,
  DollarSign,
  Calendar,
  Users,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HowItWorks() {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      navigate(createPageUrl('ProjectDashboard'));
    } else {
      base44.auth.redirectToLogin(createPageUrl('ProjectDashboard'));
    }
  };

  const workflow = [
    {
      icon: FileText,
      title: 'Estimating & Contract',
      description: 'Upload contracts, define SOV, set baseline budgets. Track contract status and ball-in-court.',
      features: ['Contract tracking', 'SOV setup', 'Budget baselines']
    },
    {
      icon: FileText,
      title: 'Detailing',
      description: 'Manage drawing sets, track IFA/BFA/FFF status, run steel QA gates, coordinate RFIs.',
      features: ['Drawing management', 'QA gates', 'RFI tracking']
    },
    {
      icon: Wrench,
      title: 'Fabrication',
      description: 'Track shop progress, log labor hours, manage material costs, monitor production milestones.',
      features: ['Shop tracking', 'Labor logging', 'Cost control']
    },
    {
      icon: Truck,
      title: 'Delivery & Logistics',
      description: 'Schedule deliveries, track on-time performance, coordinate with erection readiness.',
      features: ['Delivery scheduling', 'On-time tracking', 'Prerequisites']
    },
    {
      icon: HardHat,
      title: 'Erection',
      description: 'Sequence tasks, assign crews, log daily progress, manage field issues and safety.',
      features: ['Task sequencing', 'Daily logs', 'Field tools']
    },
    {
      icon: CheckCircle2,
      title: 'Closeout',
      description: 'Final billing, as-builts, punch lists, project handoff documentation.',
      features: ['Final billing', 'As-builts', 'Handoff']
    }
  ];

  const capabilities = [
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Budget vs actual, earned value, cost trending, executive roll-ups'
    },
    {
      icon: MessageSquare,
      title: 'RFI Management',
      description: 'Track ball-in-court, escalation levels, impacts on schedule and budget'
    },
    {
      icon: DollarSign,
      title: 'Financial Control',
      description: 'SOV alignment, change orders, expense tracking, invoice generation'
    },
    {
      icon: Calendar,
      title: 'Schedule Intelligence',
      description: 'Critical path, look-ahead planning, dependency management, AI prioritization'
    },
    {
      icon: Users,
      title: 'Team Coordination',
      description: 'Resource allocation, crew assignments, cross-project visibility'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Risk detection, cost forecasting, schedule optimization, anomaly alerts'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-[#E5E7EB] relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute top-[10%] right-[10%] w-[800px] h-[800px] opacity-30"
          style={{ background: 'radial-gradient(circle at center, rgba(255, 107, 44, 0.2) 0%, transparent 70%)' }} 
        />
        <div 
          className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] opacity-20"
          style={{ background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[rgba(255,255,255,0.05)] bg-black/95 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(createPageUrl('LandingPage'))}
            className="flex items-center gap-3"
          >
            <div 
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(255, 157, 66, 0.5)' }}
            >
              <Building size={20} className="text-black" />
            </div>
            <span className="text-xl font-bold tracking-wide">SteelBuild Pro</span>
          </button>
          <Button onClick={handleGetStarted} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-[#E5E7EB] to-[#9CA3AF] bg-clip-text text-transparent">
              End-to-End Project
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#FF6B2C] via-[#FF9D42] to-[#FFB84D] bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            From estimating through closeout, manage every phase of structural steel projects in one platform
          </p>
        </motion.div>
      </section>

      {/* Workflow Section */}
      <section className="relative z-10 py-16 border-t border-[rgba(255,255,255,0.05)]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 tracking-tight">
              <span className="text-[#E5E7EB]">Steel Construction</span>{' '}
              <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                Workflow
              </span>
            </h2>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">
              Built to match how steel projects actually run
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {workflow.map((phase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:border-[rgba(255,157,66,0.2)] transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow"
                        style={{ boxShadow: '0 0 20px rgba(255, 157, 66, 0.2)' }}
                      >
                        <phase.icon size={24} className="text-black" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#E5E7EB]">{phase.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-[#9CA3AF] mb-4 leading-relaxed">{phase.description}</p>
                    <div className="space-y-2">
                      {phase.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-[#FF9D42] flex-shrink-0" />
                          <span className="text-xs text-[#9CA3AF]">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="relative z-10 py-16 border-t border-[rgba(255,255,255,0.05)]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                Core Capabilities
              </span>
            </h2>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">
              Practical tools for real jobsite conditions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {capabilities.map((capability, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:border-[rgba(255,157,66,0.2)] transition-all">
                  <CardContent className="p-6">
                    <capability.icon size={32} className="text-[#FF9D42] mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-[#E5E7EB]">{capability.title}</h3>
                    <p className="text-sm text-[#9CA3AF] leading-relaxed">{capability.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 border-t border-[rgba(255,255,255,0.05)]">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <div 
              className="rounded-2xl border border-[rgba(255,157,66,0.3)] bg-gradient-to-br from-black to-[#0A0A0A] p-12"
              style={{ boxShadow: '0 0 80px rgba(255, 157, 66, 0.25)' }}
            >
              <h2 className="text-4xl font-bold mb-4 tracking-tight">
                Ready to streamline your{' '}
                <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                  steel projects?
                </span>
              </h2>
              <p className="text-lg text-[#9CA3AF] mb-8">
                See how leading contractors manage projects end-to-end
              </p>
              <Button size="lg" onClick={handleGetStarted} className="text-base gap-2">
                Get Started <ArrowRight size={18} />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(255,255,255,0.05)] py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center"
                style={{ boxShadow: '0 0 20px rgba(255, 157, 66, 0.5)' }}
              >
                <Building size={16} className="text-black" />
              </div>
              <span className="font-bold tracking-wide">SteelBuild Pro</span>
            </div>
            <p className="text-sm text-[#6B7280]">
              © 2026 SteelBuild Pro. Built for construction professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}