'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login/Signup
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 selection:bg-blue-100 flex items-center justify-center p-6">
      
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/20 blur-[120px]" />
      </div>

      {/* NAVBAR (Simplified for Login) */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 group">
                <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-1.5 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">DocuMind</span>
            </Link>
        </div>
      </nav>

      {/* LOGIN CARD */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 md:p-10">
            
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isSignUp ? 'Create an Account' : 'Welcome Back'}
                </h1>
                <p className="text-slate-500 mt-2 text-sm">
                    {isSignUp ? 'Start analyzing documents in seconds.' : 'Enter your credentials to access your dashboard.'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="email" 
                            required 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                        <input 
                            type="password" 
                            required 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            {isSignUp ? 'Sign Up Free' : 'Sign In'} 
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-6 text-center pt-6 border-t border-slate-100">
                <p className="text-slate-500 text-sm">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button 
                        onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                        className="ml-2 font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all"
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}