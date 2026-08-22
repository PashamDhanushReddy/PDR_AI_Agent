import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Send, Menu, Plus, User as UserIcon, Bot, MessageSquare, X, Sparkles, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../store/chatStore';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { conversations, activeConversationId, isLoading, setConversations, setActiveConversation, sendMessage } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return navigate('/auth');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/conversations/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(res.data);
        
        const savedId = sessionStorage.getItem('activeConversationId');
        if (savedId && res.data.some((c: any) => c.id === savedId)) {
          setActiveConversation(savedId);
        } else {
          setActiveConversation(null);
        }
      } catch (e: any) {
        if (e.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          navigate('/auth');
        }
      }
    };
    fetchConversations();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('activeConversationId');
    navigate('/auth');
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { 
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeConversation?.messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;
    let currentActiveId = activeConversationId;
    if (!currentActiveId) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/conversations/`,
          { title: input.substring(0, 30) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        currentActiveId = res.data.id;
        setConversations([{ ...res.data, messages: [] }, ...conversations]);
        setActiveConversation(res.data.id);
      } catch (e: any) {
        if (e.response?.status === 401) { localStorage.removeItem('access_token'); navigate('/auth'); }
        return;
      }
    }
    const messageText = input;
    const messageImage = imagePreview;
    setInput(''); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await sendMessage(messageText, messageImage || undefined);
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background animated-bg" style={{ height: '100dvh', width: '100vw' }}>
      {/* Orbs */}
      <div className="absolute pointer-events-none orb orb-red w-[400px] h-[400px] top-[-80px] left-[200px] opacity-10" />
      <div className="absolute pointer-events-none orb orb-dark w-[350px] h-[350px] bottom-[-60px] right-[100px] opacity-10" />
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(225,29,72,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(225,29,72,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* ── Sidebar Overlay (Mobile) ── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* ── Sidebar ── */}
      <div className={`glass w-72 flex flex-col transition-transform duration-500 z-40 border-r border-primary/10 h-full fixed inset-y-0 left-0 md:relative ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:fixed'}`}>
        {/* Brand */}
        <div className="p-6 flex items-center justify-between border-b border-primary/10">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}pdr_logo.jpg`} alt="PDR Logo" className="w-9 h-9 rounded-xl object-cover border border-primary/30 shadow-[0_0_12px_rgba(37,99,235,0.3)]" />
            <span className="font-black text-base shimmer-text tracking-tight">PDR AI AGENT</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors">
            <Menu size={18} />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-4">
          <button id="new-chat-btn" onClick={() => setActiveConversation(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(225,29,72,0.2)] transition-all">
            <Plus size={17} /> New Chat
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 mt-1">
          {conversations.map((conv, idx) => (
            <button key={conv.id} onClick={() => setActiveConversation(conv.id)}
              className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all duration-200 animate-slide-in-right text-sm font-medium ${
                activeConversationId === conv.id
                  ? 'bg-primary text-white shadow-[0_0_12px_rgba(37,99,235,0.25)]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}>
              <MessageSquare size={15} className={activeConversationId === conv.id ? 'text-primary' : 'text-gray-700'} />
              <span className="truncate">{conv.title || 'New Conversation'}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary/10 space-y-1">
          <Link to="/memory" className="flex items-center gap-3 text-gray-600 hover:text-white p-3 rounded-xl hover:bg-white/5 transition-all group">
            <UserIcon size={18} className="text-primary/70 group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">Manage Memory</span>
            <Sparkles size={14} className="ml-auto text-primary/30 group-hover:text-primary/70 transition-colors" />
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-gray-600 hover:text-red-400 p-3 rounded-xl hover:bg-white/5 transition-all group">
            <LogOut size={18} className="text-red-500/70 group-hover:text-red-400 transition-colors" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative bg-background">
        {/* ── App Header (Solid & Fixed) ── */}
        <div className="flex-none h-14 md:h-16 w-full flex items-center justify-between px-4 z-20 shadow-sm border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {/* Left: Menu Toggle */}
          <div className="w-12 flex justify-start">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-200/50 transition-colors">
                <Menu size={20} />
              </button>
            )}
          </div>
          
          {/* Center: App Title */}
          <div className="flex-1 flex justify-center">
            <span className="font-semibold text-gray-800 flex items-center gap-2 text-sm md:text-base tracking-wide">
              PDR AI AGENT <Sparkles size={14} className="text-primary/70" />
            </span>
          </div>

          {/* Right: New Chat (Mobile) */}
          <div className="w-12 flex justify-end">
            <button onClick={() => setActiveConversation(null)} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-200/50 transition-colors md:hidden">
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* ── Messages Area ── */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 space-y-6">
          {!activeConversation || activeConversation.messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
              <div className="w-24 h-24 md:w-28 md:h-28 mb-6 md:mb-8 rounded-3xl overflow-hidden border border-primary/20 shadow-[0_0_60px_rgba(37,99,235,0.3)] animate-float">
                <img src={`${import.meta.env.BASE_URL}pdr_logo.jpg`} alt="PDR AI Agent" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-gray-800">PDR AI AGENT</h2>
              <p className="text-gray-500 text-base md:text-lg max-w-md leading-relaxed">
                Your intelligent assistant with <span className="text-primary font-semibold">long-term memory</span>. Ask me anything.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                {['Tell me something interesting', 'Help me write code', 'What do you remember about me?'].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-4 py-2 rounded-full text-sm border border-primary/20 text-gray-500 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-6 pb-4">
              {activeConversation.messages.map((msg, idx) => {
                let parsedText = msg.content;
                let attachedImage = null;
                try {
                  const data = JSON.parse(msg.content);
                  if (data.text !== undefined && data.image) { parsedText = data.text; attachedImage = data.image; }
                } catch (_) {}
                return (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-pop`} style={{ animationDelay: '40ms' }}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                        <Bot size={16} className="text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[75%] min-w-0 rounded-2xl px-5 py-3.5 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white ml-auto' 
                        : 'bg-white border border-gray-100 text-gray-800 prose prose-sm md:prose-base prose-slate max-w-none break-words'
                    }`}>
                      {attachedImage && (
                        <div className="mb-4 rounded-xl overflow-hidden max-w-sm border border-primary/20">
                          <img src={attachedImage} alt="Attachment" className="w-full h-auto object-cover" />
                        </div>
                      )}
                      {parsedText ? (
                        msg.role === 'user'
                          ? <p className="whitespace-pre-wrap leading-relaxed">{parsedText}</p>
                          : <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <div className="not-prose relative group my-4 rounded-xl overflow-hidden bg-[#1e1e2e] border border-gray-800 shadow-lg">
                                      <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-gray-800">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{match[1]}</span>
                                      </div>
                                      <div className="overflow-x-auto p-4">
                                        <code className="text-sm font-mono text-gray-300 whitespace-pre" {...props}>{children}</code>
                                      </div>
                                    </div>
                                  ) : (
                                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-primary font-medium" {...props}>{children}</code>
                                  );
                                }
                              }}
                            >{parsedText}</ReactMarkdown>
                      ) : (
                        <span className="flex items-center gap-1.5 opacity-60 h-5">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="flex-none px-4 pb-4 pt-2 md:px-8 md:pb-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {imagePreview && (
              <div className="mb-4 relative inline-block animate-fade-in-up">
                <div className="relative rounded-xl overflow-hidden border-2 border-primary/40 max-w-xs shadow-md">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover max-h-48" />
                  <button onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors backdrop-blur-sm">
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSend} className="relative group">
              <div className="absolute -inset-0.5 bg-primary rounded-full opacity-5 group-focus-within:opacity-10 transition duration-500 blur-sm" />
              <div className="relative flex items-center bg-white border border-gray-200 group-focus-within:border-primary/30 rounded-full transition-all shadow-md overflow-hidden">
                <button type="button" id="attach-image-btn" onClick={() => fileInputRef.current?.click()}
                  className="ml-2 p-2.5 text-gray-500 hover:text-primary transition-colors rounded-full flex-shrink-0">
                  <Plus size={22} />
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
                <input id="chat-input" type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Message PDR AI AGENT..."
                  className="flex-1 px-3 py-3.5 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400 text-base min-w-0"
                  disabled={isLoading} />
                <button id="send-btn" type="submit" disabled={(!input.trim() && !imagePreview) || isLoading}
                  className="mr-2 my-1.5 p-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary rounded-full text-white transition-all shadow-sm flex items-center justify-center flex-shrink-0">
                  <Send size={16} className={isLoading ? 'animate-pulse' : 'ml-0.5'} />
                </button>
              </div>
            </form>
            <p className="text-center mt-2 text-[10px] md:text-xs text-gray-400 font-medium tracking-wide hidden md:block">
              PDR AI AGENT can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
