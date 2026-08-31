import React, { useState } from 'react';
import { Lock, Building2, Sparkles, Loader2, KeyRound, Database, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Ambient background glows - Emerald & Titanium */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-neutral-900/90 backdrop-blur-2xl rounded-3xl border border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
          
          {/* Header Banner */}
          <div className="px-8 pt-8 pb-6 border-b border-neutral-800/80 text-center relative">
            <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/25 mb-4 ring-4 ring-emerald-500/15">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">LoanGuard-AI</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PRO COPILOT
              </span>
            </div>
            <p className="text-neutral-400 text-xs font-medium max-w-xs mx-auto">
              Intelligent Loan Tape Securitization & Continuous Governance Swarm
            </p>
          </div>

          {/* Form Content */}
          <div className="p-7 sm:p-8 space-y-6">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Demo Persona Launchpad */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Select Demo Persona
                </span>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 1-Click Launch
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => quickLaunch('aditya.raj@gmail.com')}
                  disabled={loading}
                  className="w-full text-left p-3.5 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 hover:border-emerald-500/50 transition-all duration-200 group flex items-center justify-between cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors">
                        Aditya Raj <span className="text-[11px] font-normal text-neutral-400">· Data Operator</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">Ingestion, Parser & Real-Time Quality Tape Studio</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  type="button"
                  onClick={() => quickLaunch('rajesh.menon@loanguard.ai')}
                  disabled={loading}
                  className="w-full text-left p-3.5 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 hover:border-amber-500/50 transition-all duration-200 group flex items-center justify-between cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors">
                        Rajesh Menon <span className="text-[11px] font-normal text-neutral-400">· Exception Reviewer</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">AI Diagnostic Copilot & Batch Remediation Queue</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  type="button"
                  onClick={() => quickLaunch('ananya.iyer@loanguard.ai')}
                  disabled={loading}
                  className="w-full text-left p-3.5 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 hover:border-teal-500/50 transition-all duration-200 group flex items-center justify-between cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors">
                        Ananya Iyer <span className="text-[11px] font-normal text-neutral-400">· Data Consumer</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">Verified Portfolio Export & SHA-256 Audit Trail</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800"></div></div>
              <span className="relative bg-neutral-900 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Or Manual Login
              </span>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="name@loanguard.ai"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Sign In to Platform
              </button>
            </form>
          </div>
          
          {/* Footer Info */}
          <div className="bg-neutral-950/90 px-8 py-3.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Role-Based Access Control</span>
            </div>
            <span className="font-mono text-[10px] text-neutral-500">v2.4 LTS</span>
          </div>

        </div>
      </div>
    </div>
  );
}
