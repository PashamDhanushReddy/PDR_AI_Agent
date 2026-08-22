import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bot, Trash2, Tag, Clock, Sparkles, LogOut } from 'lucide-react';

interface Memory {
  id: number;
  content: string;
  category: string;
  importance: number;
  status: string;
  access_count: number;
  created_at: string;
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMemories = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return navigate('/auth');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/memories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMemories(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMemories(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('activeConversationId');
    navigate('/auth');
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/memories/${id}/`,
        { status: 'inactive' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMemories(memories.filter(m => m.id !== id));
    } catch (e) {
      console.error('Failed to delete memory', e);
    }
  };

  return (
    <div className="min-h-screen bg-background animated-bg overflow-x-hidden relative">
      {/* Orbs */}
      <div className="absolute pointer-events-none orb orb-red w-[400px] h-[400px] top-[-80px] right-[-80px] opacity-10" />
      <div className="absolute pointer-events-none orb orb-dark w-[350px] h-[350px] bottom-[-60px] left-[-60px] opacity-10" />
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(225,29,72,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(225,29,72,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="max-w-6xl mx-auto relative z-10 p-4 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 animate-fade-in-up">
          <div className="flex items-center gap-5">
            <Link to="/chat" id="back-to-chat"
              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 shadow-sm transition-all hover:scale-105 active:scale-95 hover:border-primary/30">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Bot size={22} className="text-primary animate-pulse-glow" />
                </div>
                <span className="text-gray-900">Neural Memory</span>
              </h1>
              <p className="text-gray-700 mt-1 text-sm font-medium tracking-wide">
                Facts, preferences and context extracted by <span className="text-primary">PDR AI AGENT</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {memories.length > 0 && (
              <span className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-semibold">
                <Sparkles size={14} /> {memories.length} memories
              </span>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-200 bg-white text-red-500 text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
              <LogOut size={16} /> <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <Bot size={22} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
          </div>
        ) : memories.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl text-center animate-fade-in-up delay-200 border border-primary/10 shadow-2xl">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-float">
              <Sparkles size={40} className="text-primary/50" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-gray-800">No Memories Yet</h3>
            <p className="text-gray-600 max-w-sm mx-auto leading-relaxed text-base">
              Start chatting and <span className="text-primary font-semibold">PDR AI AGENT</span> will remember important things about you.
            </p>
            <Link to="/chat"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl text-white text-sm font-semibold shadow-md transition-all">
              Start Chatting
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {memories.map((memory, idx) => (
              <div key={memory.id}
                className="group bg-white p-6 rounded-2xl flex flex-col card-hover border border-gray-100 shadow-sm animate-fade-in-up"
                style={{ animationDelay: `${(idx % 9) * 80}ms` }}>
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-primary/25 bg-primary/8 text-primary uppercase tracking-wider">
                    <Tag size={11} /> {memory.category}
                  </span>
                  <button onClick={() => handleDelete(memory.id)}
                    className="text-gray-700 hover:text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Forget this">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-gray-800 flex-1 mb-5 leading-relaxed text-sm font-medium">{memory.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-4 mt-auto">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-primary-light bg-primary/8 px-2.5 py-1 rounded-md font-semibold">
                    <Bot size={12} /> ×{memory.access_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
