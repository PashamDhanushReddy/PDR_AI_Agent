import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bot, ArrowRight, Sparkles, Zap, Brain } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!isLogin && password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login/`, { username: email, password });
        localStorage.setItem('access_token', res.data.access);
        navigate('/chat');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/auth/register/`, { email, password });
        setIsLogin(true);
      }
    } catch (error) {
      console.error(error);
      alert('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background animated-bg overflow-hidden relative">
      {/* Floating orbs */}
      <div className="absolute pointer-events-none orb orb-red w-[500px] h-[500px] top-[-120px] left-[-100px] opacity-10" />
      <div className="absolute pointer-events-none orb orb-dark w-[400px] h-[400px] bottom-[-100px] right-[-80px] opacity-10" />
      <div className="absolute pointer-events-none orb orb-white w-[300px] h-[300px] top-[40%] right-[15%] opacity-10" />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(225,29,72,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(225,29,72,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="flex w-full items-center justify-center p-6 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Hero Section */}
          <div className="hidden md:flex flex-col justify-center space-y-8 p-8 animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center animate-border-glow">
                <Bot size={32} className="text-primary animate-pulse-glow" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900">PDR AI AGENT</h1>
            </div>

            <p className="text-xl text-gray-600 font-light leading-relaxed max-w-md">
              Your intelligent AI companion with <span className="text-primary font-semibold">long-term memory</span>. Learns, adapts, and grows smarter every conversation.
            </p>

            <div className="flex flex-col gap-4">
              {[
                { icon: Brain,    text: 'Long-term memory across sessions' },
                { icon: Zap,      text: 'Powered by Gemini & LangGraph'    },
                { icon: Sparkles, text: 'Multimodal — text & images'        },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-700 font-semibold tracking-widest uppercase">
              by Pasham Dhanush Reddy
            </p>
          </div>

          {/* Auth Card */}
          <div className="glass p-8 md:p-12 rounded-3xl w-full max-w-md mx-auto animate-fade-in-up delay-200 border border-primary/15">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center justify-center gap-3 mb-8">
              <Bot size={28} className="text-primary animate-pulse-glow" />
              <span className="text-2xl font-black text-gray-900">PDR AI AGENT</span>
            </div>

            <h2 className="text-3xl font-bold mb-2 text-gray-900">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-gray-600 mb-8 text-sm">
              {isLogin ? 'Sign in to continue your AI journey.' : 'Create your account to begin.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5 group">
                <label className="text-sm font-medium text-gray-500 transition-colors group-focus-within:text-primary">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className="w-full px-5 py-3.5 bg-white rounded-xl border border-gray-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 placeholder-gray-400 text-base"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-sm font-medium text-gray-500 transition-colors group-focus-within:text-primary">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className="w-full px-5 py-3.5 bg-white rounded-xl border border-gray-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 placeholder-gray-400 text-base"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {!isLogin && (
                <div className="space-y-1.5 group">
                  <label className="text-sm font-medium text-gray-500 transition-colors group-focus-within:text-primary">Confirm Password</label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    className={`w-full px-5 py-3.5 bg-white rounded-xl border focus:outline-none focus:ring-2 transition-all text-gray-900 placeholder-gray-400 text-base ${
                      passwordError
                        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-200 focus:border-primary/50 focus:ring-primary/20'
                    }`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                    required
                  />
                  {passwordError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <span>⚠</span> {passwordError}
                    </p>
                  )}
                </div>
              )}
              <button
                id="auth-submit"
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary-hover w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-white text-sm mt-2 shadow-md transition-all"
              >
                {isLoading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:text-primary-light transition-colors">
                {isLogin ? 'Create one now' : 'Sign in instead'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
