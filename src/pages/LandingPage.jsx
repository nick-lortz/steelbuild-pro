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
    <div className="min-h-screen bg-[#0A0E13] text-[#E5E7EB] relative overflow-hidden">
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
      <header className="relative z-10 border-b border-[rgba(255,255,255,0.05)] bg-[#0F1419]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(255, 157, 66, 0.3)' }}
            >
              <Building size={20} className="text-[#0A0E13]" />
            </div>
            <span className="text-xl font-bold tracking-wide">SteelBuild Pro</span>
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
            Automate conversations, analyze data, and make smarter decisions — all in one place.
            Built for structural steel fabricators and erectors.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="text-base gap-2"
            >
              Get Started <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="outline" className="text-base">
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
            className="rounded-2xl border border-[rgba(255,157,66,0.2)] bg-[#0F1419]/60 backdrop-blur-md p-2 shadow-2xl"
            style={{ 
              boxShadow: '0 0 60px rgba(255, 157, 66, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5)',
              background: 'linear-gradient(135deg, rgba(255, 107, 44, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)'
            }}
          >
            <div className="aspect-video rounded-xl bg-[#0A0E13] overflow-hidden">
              {/* Placeholder for screenshot/demo */}
              <div className="w-full h-full flex items-center justify-center text-[#6B7280]">
                <div className="text-center">
                  <Sparkles size={48} className="mx-auto mb-4 text-[#FF9D42]" />
                  <p className="text-lg">Dashboard Preview</p>
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
                  className="rounded-2xl border border-[rgba(255,157,66,0.2)] bg-[#0F1419]/60 backdrop-blur-md p-8"
                  style={{ boxShadow: '0 0 40px rgba(255, 157, 66, 0.1)' }}
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#151B24] flex items-center justify-center">
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
              className="rounded-2xl border border-[rgba(255,157,66,0.2)] bg-gradient-to-br from-[#0F1419] to-[#151B24] p-12"
              style={{ boxShadow: '0 0 60px rgba(255, 157, 66, 0.15)' }}
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
                style={{ boxShadow: '0 0 16px rgba(255, 157, 66, 0.3)' }}
              >
                <Building size={16} className="text-[#0A0E13]" />
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