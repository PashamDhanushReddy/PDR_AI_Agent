import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Brain, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post('http://localhost:8000/api/v1/auth/login/', { username: email, password });
        localStorage.setItem('access_token', res.data.access);
        navigate('/chat');
      } else {
        await axios.post('http://localhost:8000/api/v1/auth/register/', { email, password });
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
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-500"></div>

      <div className="flex w-full items-center justify-center p-6 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Hero Section */}
          <div className="hidden md:flex flex-col justify-center space-y-6 p-8 animate-fade-in-up">
            <div className="flex items-center gap-3 text-primary">
              <Brain size={48} className="animate-pulse-glow rounded-xl" />
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Antigravity</h1>
            </div>
            <p className="text-xl text-gray-400 font-light leading-relaxed max-w-md">
              Experience the next generation of conversational AI. Seamless, intelligent, and designed to augment your capabilities.
            </p>
          </div>

          {/* Auth Card */}
          <div className="glass p-8 md:p-12 rounded-3xl w-full max-w-md mx-auto animate-fade-in-up delay-200">
            <div className="md:hidden flex items-center justify-center gap-3 mb-8 text-primary">
              <Brain size={32} />
              <span className="text-2xl font-bold text-white">Antigravity</span>
            </div>

            <h2 className="text-3xl font-bold mb-8 text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-400 transition-colors group-focus-within:text-primary">Email</label>
                <input
                  type="email"
                  className="w-full px-5 py-3 bg-secondary-light/50 rounded-xl border border-white/5 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-white placeholder-gray-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-400 transition-colors group-focus-within:text-primary">Password</label>
                <input
                  type="password"
                  className="w-full px-5 py-3 bg-secondary-light/50 rounded-xl border border-white/5 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-white placeholder-gray-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity rounded-xl font-semibold flex items-center justify-center gap-2 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              >
                {isLoading ? (
                   <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
            
            <p className="mt-8 text-center text-sm text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-primary font-medium hover:text-white transition-colors"
              >
                {isLogin ? 'Create one now' : 'Sign in instead'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
