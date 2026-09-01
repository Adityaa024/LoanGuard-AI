import React, { useState, useEffect } from 'react';
import { Lock, Building2, Loader2, Database, ShieldAlert, CheckCircle2, ArrowRight, Mail, KeyRound, Eye, EyeOff, TrendingUp, PieChart, FileText, Shield, Zap, BarChart3 } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const executeLogin = async (loginEmail, loginPass) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      localStorage.setItem('loanguard_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const quickLaunch = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
    executeLogin(roleEmail, 'password123');
  };

  const slides = [
    {
      title: 'Welcome back!',
      subtitle: 'Manage your loan tape verification pipeline with institutional-grade precision.',
      detail: 'Real-time ingestion, AI-powered anomaly detection, and cryptographic audit trails.',
    },
    {
      title: 'AI-Powered Verification',
      subtitle: 'Our copilot identifies and remediates data anomalies with 94% confidence.',
      detail: 'SHA-256 signed records ensure tamper-proof data lineage across every field.',
    },
    {
      title: 'Enterprise Grade',
      subtitle: 'Role-based access control with 3 specialized dashboard personas.',
      detail: 'SOC-2 compliant workflows with full audit trail for securitization readiness.',
    }
  ];

  return (
    <div className="min-h-screen bg-white flex font-sans select-none overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEFT PANEL — Brand Showcase & Floating Widgets         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 flex-col overflow-hidden">
        
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #064e3b 1px, transparent 0)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* Soft gradient orbs */}
        <div className="absolute top-20 -left-20 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-teal-200/25 rounded-full blur-3xl pointer-events-none" />
        
        {/* Logo */}
        <div className="relative z-10 px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">LoanGuard-AI</span>
          </div>
        </div>

        {/* Floating Financial Widgets — Stacked Cards */}
        <div className="flex-1 flex items-center justify-center relative z-10 px-10">
          <div className="relative w-full max-w-md">
            
            {/* Main Balance Card */}
            <div 
              className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 relative z-20"
              style={{
                transform: mounted ? 'translateY(0) rotate(-1deg)' : 'translateY(40px) rotate(-1deg)',
                opacity: mounted ? 1 : 0,
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Portfolio Value</span>
              </div>
              <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                $<span className="text-emerald-600">64,85,769</span><span className="text-lg text-slate-400">.00</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">↑ 12.4%</span>
                <span className="text-[11px] text-slate-400">Verified & Compliant</span>
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-1 mt-5 h-10">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all duration-500" 
                    style={{
                      height: `${h}%`,
                      backgroundColor: i >= 9 ? '#059669' : '#d1fae5',
                      transitionDelay: `${i * 50}ms`,
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
                      transformOrigin: 'bottom'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Floating Donut Card — overlaps main card */}
            <div 
              className="absolute -right-6 top-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4 z-30 w-44"
              style={{
                transform: mounted ? 'translateY(0) rotate(2deg)' : 'translateY(30px) rotate(2deg)',
                opacity: mounted ? 1 : 0,
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s'
              }}
            >
              {/* SVG Donut */}
              <div className="flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#059669" strokeWidth="8"
                    strokeDasharray="120 188" strokeDashoffset="0" strokeLinecap="round"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dasharray 1.2s ease 0.8s'
                    }}
                  />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#10b981" strokeWidth="8"
                    strokeDasharray="38 188" strokeDashoffset="-125" strokeLinecap="round"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dasharray 1.2s ease 1s'
                    }}
                  />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#6ee7b7" strokeWidth="8"
                    strokeDasharray="22 188" strokeDashoffset="-168" strokeLinecap="round"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dasharray 1.2s ease 1.2s'
                    }}
                  />
                  <text x="40" y="37" textAnchor="middle" className="text-sm font-bold" fill="#0f172a" fontSize="14">94<tspan fontSize="9" fill="#64748b">%</tspan></text>
                  <text x="40" y="50" textAnchor="middle" fill="#64748b" fontSize="8">Verified</text>
                </svg>
              </div>
              <div className="text-center mt-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data Quality</div>
              </div>
            </div>

            {/* Floating Transaction Card — bottom left */}
            <div 
              className="absolute -left-4 -bottom-14 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4 z-30 w-52"
              style={{
                transform: mounted ? 'translateY(0) rotate(-1.5deg)' : 'translateY(30px) rotate(-1.5deg)',
                opacity: mounted ? 1 : 0,
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">73,064 Records</div>
                  <div className="text-[10px] text-slate-400">Processed this session</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  style={{
                    width: mounted ? '94%' : '0%',
                    transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1) 1s'
                  }}
                />
              </div>
              <div className="text-[10px] text-right text-emerald-600 font-semibold mt-1">94% Compliant</div>
            </div>
          </div>
        </div>

        {/* Bottom Carousel Text + Dots */}
        <div className="relative z-10 px-10 pb-10">
          <div className="min-h-[100px]">
            {slides.map((slide, idx) => (
              <div 
                key={idx}
                className="transition-all duration-500"
                style={{
                  opacity: activeSlide === idx ? 1 : 0,
                  transform: activeSlide === idx ? 'translateY(0)' : 'translateY(8px)',
                  position: activeSlide === idx ? 'relative' : 'absolute',
                  pointerEvents: activeSlide === idx ? 'auto' : 'none'
                }}
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">{slide.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-sm">{slide.subtitle}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">{slide.detail}</p>
              </div>
            ))}
          </div>

          {/* Carousel Dots */}
          <div className="flex items-center gap-2 mt-5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className="transition-all duration-300 rounded-full cursor-pointer"
                style={{
                  width: activeSlide === idx ? '24px' : '8px',
                  height: '8px',
                  backgroundColor: activeSlide === idx ? '#059669' : '#cbd5e1',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* RIGHT PANEL — Clean Login Form                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-10 bg-white relative">
        
        {/* Subtle corner accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/40 rounded-bl-[120px] pointer-events-none" />
        
        <div 
          className="w-full max-w-md relative z-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s'
          }}
        >
          {/* Mobile logo — only shown on small screens */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">LoanGuard-AI</span>
          </div>

          {/* Welcome Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back!</h1>
            <p className="text-sm text-slate-400 mt-2">Start managing your loan verification faster and better</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-600 text-xs font-medium"
              style={{ animation: 'shake 0.4s ease' }}
            >
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Manual Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Mail className="w-[18px] h-[18px] text-slate-300" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Lock className="w-[18px] h-[18px] text-slate-300" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl pl-12 pr-12 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button type="button" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer">
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Login
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <span className="relative bg-white px-4 text-xs font-medium text-slate-400">
              or launch as demo persona
            </span>
          </div>

          {/* Quick Launch Persona Cards — styled like social login buttons */}
          <div className="grid grid-cols-1 gap-2.5 mb-8">
            <button
              type="button"
              onClick={() => quickLaunch('aditya.raj@gmail.com')}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/50 transition-all group cursor-pointer active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-900 transition-colors">
                  Aditya <span className="font-normal text-slate-400">· Data Operator</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">Ingestion & Real-Time Quality Studio</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => quickLaunch('rajesh.menon@loanguard.ai')}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/50 transition-all group cursor-pointer active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-900 transition-colors">
                  Rajesh Menon <span className="font-normal text-slate-400">· Reviewer</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">AI Diagnostic Copilot & Remediation Queue</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => quickLaunch('alex.morgan@loanguard.ai')}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50/50 transition-all group cursor-pointer active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-all shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                  Alex Morgan <span className="font-normal text-slate-400">· Data Consumer</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">Verified Portfolio & SHA-256 Audit Trail</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-slate-400">
              Protected by <span className="font-semibold text-emerald-600">Role-Based Access Control</span>
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-300">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> SOC-2</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> SHA-256</span>
              <span>·</span>
              <span className="font-mono">v2.4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shake animation for error */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
