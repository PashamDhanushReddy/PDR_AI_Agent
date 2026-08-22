import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Brain, Trash2, Tag, Clock, Sparkles } from 'lucide-react';

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
      
      const res = await axios.get('http://localhost:8000/api/v1/memories/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMemories(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(`http://localhost:8000/api/v1/memories/${id}/`, 
        { status: 'inactive' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setMemories(memories.filter(m => m.id !== id));
    } catch (e) {
      console.error("Failed to delete memory", e);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 animated-bg overflow-x-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex items-center justify-between mb-12 animate-fade-in-up">
          <div className="flex items-center gap-6">
            <Link to="/chat" className="p-3 glass rounded-xl text-gray-400 hover:text-white transition-transform hover:scale-105 active:scale-95 shadow-lg">
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                <Brain className="text-primary animate-pulse-glow rounded-xl" size={36} />
                Neural Memory
              </h1>
              <p className="text-gray-500 mt-1 font-medium tracking-wide">Facts, preferences, and context extracted from our chats.</p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative">
               <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
               <Brain size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
          </div>
        ) : memories.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl text-center text-gray-400 animate-fade-in-up delay-200 border border-white/5 shadow-2xl">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary-light/50 flex items-center justify-center">
               <Sparkles size={48} className="text-primary/50" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Tabula Rasa</h3>
            <p className="text-lg">I don't have any long-term memories of you yet.<br/>Start chatting, and I'll organically remember important facts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {memories.map((memory, idx) => (
              <div 
                key={memory.id} 
                className="group glass-panel p-6 rounded-3xl flex flex-col hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] hover:border-primary/30 animate-fade-in-up cursor-default"
                style={{ animationDelay: `${(idx % 10) * 100}ms` }}
              >
                <div className="flex justify-between items-start mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] group-hover:bg-primary/20 transition-colors uppercase tracking-wider">
                    <Tag size={12} /> {memory.category}
                  </span>
                  <button 
                    onClick={() => handleDelete(memory.id)}
                    className="text-gray-500 hover:text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Forget this"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <p className="text-gray-100 flex-1 mb-6 leading-relaxed text-lg font-medium">
                  {memory.content}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 border-t border-white/5 pt-4 mt-auto">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> {new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-accent-light bg-accent/10 px-2.5 py-1 rounded-md font-medium">
                    <Brain size={14} /> x{memory.access_count}
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
