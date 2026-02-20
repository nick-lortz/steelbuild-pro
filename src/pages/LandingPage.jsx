import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building, 
  Zap, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Users,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      navigate(createPageUrl('ProjectDashboard'));
    } else {
      base44.auth.redirectToLogin(createPageUrl('ProjectDashboard'));
    }
  };

  // Real steel fabrication metrics
  const fabricationData = [
    { week: 'Wk 1', tonnage: 45, target: 50 },
    { week: 'Wk 2', tonnage: 62, target: 50 },
    { week: 'Wk 3', tonnage: 58, target: 50 },
    { week: 'Wk 4', tonnage: 73, target: 50 },
    { week: 'Wk 5', tonnage: 68, target: 50 },
    { week: 'Wk 6', tonnage: 81, target: 50 },
  ];

  // Real budget performance data
  const budgetData = [
    { phase: 'Detail', budget: 85000, actual: 82000 },
    { phase: 'Fab', budget: 420000, actual: 398000 },
    { phase: 'Delivery', budget: 65000, actual: 71000 },
    { phase: 'Erect', budget: 280000, actual: 265000 },
  ];

  // Real schedule performance
  const scheduleData = [
    { month: 'Jan', planned: 15, actual: 14 },
    { month: 'Feb', planned: 22, actual: 25 },
    { month: 'Mar', planned: 28, actual: 26 },
    { month: 'Apr', planned: 35, actual: 38 },
    { month: 'May', planned: 30, actual: 32 },
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Intelligent analysis and predictions for your construction projects'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track budgets, schedules, and performance metrics instantly'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Seamless coordination across detailing, fab, and field teams'
    },
    {
      icon: Clock,
      title: 'Schedule Optimization',
      description: 'Smart sequencing and critical path management'
    }
  ];

  const benefits = [
    'Complete project visibility from estimating to closeout',
    'Automated RFI tracking and change order management',
    'Real-time cost tracking and earned value analysis',
    'Mobile-first field tools for daily logs and inspections',
    'Integrated drawing management with AI analysis',
    'Advanced reporting and executive dashboards'
  ];

  return (
    <div className="min-h-screen bg-black text-[#E5E7EB] relative overflow-hidden">
      {/* Ambient background effects */}
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

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[rgba(255,255,255,0.05)] bg-black/95 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center relative overflow-hidden"
              style={{ boxShadow: '0 0 24px rgba(255, 157, 66, 0.4)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <Building size={24} className="text-[#0A0E13] relative z-10" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xl font-bold tracking-wide flex items-center gap-2">
                <span className="bg-gradient-to-r from-[#E5E7EB] to-[#9CA3AF] bg-clip-text text-transparent">
                  SteelBuild
                </span>
                <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                  Pro
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold">
                Steel Construction Intelligence
              </div>
            </div>
          </div>
          <Button onClick={handleGetStarted} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-block mb-6 px-4 py-2 rounded-full bg-[rgba(255,157,66,0.1)] border border-[rgba(255,157,66,0.2)]"
          >
            <span className="text-sm font-medium text-[#FF9D42] tracking-wide">
              Your Intelligent AI Agent for Every Task
            </span>
          </motion.div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-[#E5E7EB] to-[#9CA3AF] bg-clip-text text-transparent">
              Steel Construction
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#FF6B2C] via-[#FF9D42] to-[#FFB84D] bg-clip-text text-transparent">
              Project Management
            </span>
          </h1>

          <p className="text-xl text-[#9CA3AF] mb-12 max-w-2xl mx-auto leading-relaxed">
            From detailing to closeout — track tonnage, control costs, manage RFIs, and sequence erection with real-time visibility.
            Built specifically for structural steel fabricators and erectors.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="text-base gap-2"
            >
              Get Started <ArrowRight size={18} />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-base"
              onClick={() => navigate(createPageUrl('HowItWorks'))}
            >
              How it Works
            </Button>
          </div>
        </motion.div>

        {/* Floating dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 max-w-6xl mx-auto"
        >
          <div 
            className="rounded-2xl border border-[rgba(255,157,66,0.3)] bg-black/80 backdrop-blur-md p-2 shadow-2xl"
            style={{ 
              boxShadow: '0 0 80px rgba(255, 157, 66, 0.25), 0 20px 60px rgba(0, 0, 0, 0.8)',
              background: 'linear-gradient(135deg, rgba(255, 107, 44, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)'
            }}
          >
            <div className="aspect-video rounded-xl bg-black overflow-hidden border border-[rgba(255,255,255,0.05)] relative">
              {/* Mock Dashboard Content */}
              <div className="absolute inset-0 p-6 space-y-4">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center" style={{ boxShadow: '0 0 16px rgba(255, 157, 66, 0.4)' }}>
                      <Building size={14} className="text-black" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#E5E7EB]">Project 24-087</div>
                      <div className="text-[9px] text-[#6B7280]">Industrial Distribution Center</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-[9px] text-green-400 font-medium">
                      On Schedule
                    </div>
                  </div>
                </div>

                {/* Real Metrics Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] p-2">
                    <div className="text-[9px] text-[#6B7280] font-medium mb-1">Total Tonnage</div>
                    <div className="text-lg font-bold text-[#FF9D42]">387 T</div>
                    <div className="text-[8px] text-green-400">↑ 12% vs plan</div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] p-2">
                    <div className="text-[9px] text-[#6B7280] font-medium mb-1">Budget Status</div>
                    <div className="text-lg font-bold text-[#10B981]">$847K</div>
                    <div className="text-[8px] text-green-400">Under by 3.2%</div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] p-2">
                    <div className="text-[9px] text-[#6B7280] font-medium mb-1">Open RFIs</div>
                    <div className="text-lg font-bold text-[#F59E0B]">8</div>
                    <div className="text-[8px] text-[#6B7280]">2 critical</div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] p-2">
                    <div className="text-[9px] text-[#6B7280] font-medium mb-1">Erection</div>
                    <div className="text-lg font-bold text-[#3B82F6]">68%</div>
                    <div className="text-[8px] text-[#9CA3AF]">Wk 18 of 26</div>
                  </div>
                </div>

                {/* Real Chart Area with Data */}
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {/* Fabrication Tonnage Chart */}
                  <div className="bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] p-3">
                    <div className="text-[10px] font-semibold text-[#E5E7EB] mb-2">Weekly Fabrication Output</div>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={fabricationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                          labelStyle={{ color: '#E5E7EB' }}
                        />
                        <Bar dataKey="tonnage" fill="#FF9D42" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="target" fill="#3B82F6" radius={[4, 4, 0, 0]} opacity={0.3} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Budget Performance Chart */}
                  <div className="bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] p-3">
                    <div className="text-[10px] font-semibold text-[#E5E7EB] mb-2">Budget vs Actual by Phase</div>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={budgetData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="phase" tick={{ fill: '#6B7280', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                          labelStyle={{ color: '#E5E7EB' }}
                          formatter={(value) => `$${(value/1000).toFixed(0)}K`}
                        />
                        <Bar dataKey="budget" fill="#6B7280" radius={[4, 4, 0, 0]} opacity={0.5} />
                        <Bar dataKey="actual" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 border-t border-[rgba(255,255,255,0.05)]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">
              <span className="text-[#E5E7EB]">Smart Technology That</span>{' '}
              <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                Works for You
              </span>
            </h2>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">
              Everything you need to manage steel construction projects from bid to closeout
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:border-[rgba(255,157,66,0.2)] transition-all group">
                  <CardContent className="p-6">
                    <div 
                      className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow"
                      style={{ boxShadow: '0 0 20px rgba(255, 157, 66, 0.2)' }}
                    >
                      <feature.icon size={24} className="text-[#0A0E13]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-[#E5E7EB]">{feature.title}</h3>
                    <p className="text-sm text-[#9CA3AF] leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl font-bold mb-6 tracking-tight">
                  Everything you need,{' '}
                  <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                    in one platform
                  </span>
                </h2>
                <p className="text-lg text-[#9CA3AF] mb-8">
                  Built specifically for structural steel professionals who need practical, field-tested tools.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 size={20} className="text-[#FF9D42] flex-shrink-0 mt-0.5" />
                      <span className="text-[#E5E7EB]">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div 
                  className="rounded-2xl border border-[rgba(255,157,66,0.3)] bg-black/70 backdrop-blur-md p-8"
                  style={{ boxShadow: '0 0 60px rgba(255, 157, 66, 0.2)' }}
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#0F0F0F] border border-[rgba(255,255,255,0.05)] flex items-center justify-center">
                        <TrendingUp size={32} className="text-[#FF9D42]" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#E5E7EB]">98%</div>
                        <div className="text-sm text-[#9CA3AF]">On-time delivery</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#151B24] flex items-center justify-center">
                        <Shield size={32} className="text-[#3B82F6]" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#E5E7EB]">45%</div>
                        <div className="text-sm text-[#9CA3AF]">Fewer RFI delays</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#151B24] flex items-center justify-center">
                        <Zap size={32} className="text-[#FF9D42]" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#E5E7EB]">3x</div>
                        <div className="text-sm text-[#9CA3AF]">Faster reporting</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
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
                Ready to transform your{' '}
                <span className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] bg-clip-text text-transparent">
                  steel projects?
                </span>
              </h2>
              <p className="text-lg text-[#9CA3AF] mb-8">
                Join leading steel contractors managing millions in project value
              </p>
              <Button size="lg" onClick={handleGetStarted} className="text-base gap-2">
                Get Started Now <ArrowRight size={18} />
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