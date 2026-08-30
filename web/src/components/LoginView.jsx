import React, { useState } from 'react';
import { Lock, Building2, Sparkles, Loader2, KeyRound } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      localStorage.setItem('hive_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-6 bg-slate-900 text-white text-center">
            <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">LoanGuard-AI</h1>
            <p className="text-slate-400 text-sm font-medium">Securitization Portal Login</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                <Lock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="aditya.raj@gmail.com"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserCheckIcon className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Sign In to Platform
              </button>
            </form>

            {/* Quick Login Helpers */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-center font-medium text-slate-500 uppercase tracking-wider mb-4">Demo Credentials</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => { setEmail('aditya.raj@gmail.com'); setPassword('password123'); }}
                  className="text-left px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors flex justify-between items-center group"
                >
                  <div><span className="font-semibold text-slate-900">Data Operator</span> (Aditya Raj)</div>
                  <div className="text-xs text-slate-400 group-hover:text-indigo-600">Auto-fill &rarr;</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('rajesh.menon@LoanGuard-AI.io'); setPassword('password123'); }}
                  className="text-left px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors flex justify-between items-center group"
                >
                  <div><span className="font-semibold text-slate-900">Exception Reviewer</span> (Rajesh Menon)</div>
                  <div className="text-xs text-slate-400 group-hover:text-indigo-600">Auto-fill &rarr;</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('ananya.iyer@LoanGuard-AI.io'); setPassword('password123'); }}
                  className="text-left px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors flex justify-between items-center group"
                >
                  <div><span className="font-semibold text-slate-900">Data Consumer</span> (Ananya Iyer)</div>
                  <div className="text-xs text-slate-400 group-hover:text-indigo-600">Auto-fill &rarr;</div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Enterprise-Grade RBAC Activated</span>
          </div>

        </div>
      </div>
    </div>
  );
}

function UserCheckIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
    </svg>
  )
}
