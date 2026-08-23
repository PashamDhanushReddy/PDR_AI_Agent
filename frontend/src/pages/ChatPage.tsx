import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Send, Menu, Plus, MessageSquare, X, Sparkles, LogOut, Settings, Moon, Lock, UploadCloud, ArrowRight, Mic, MicOff, Volume2, VolumeX, Trash2, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../store/chatStore';
import { useTheme } from '../hooks/useTheme';
import { useVoice } from '../hooks/useVoice';

const useLongPress = (callback: () => void, ms: number = 500) => {
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const start = useCallback(() => {
    timeout.current = setTimeout(() => {
      callback();
      // Vibrate if supported to provide haptic feedback
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, ms);
  }, [callback, ms]);

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
  };
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'password' | 'upload'>('main');
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '', error: '', success: '', loading: false });
  const [uploadForm, setUploadForm] = useState({ file: null as File | null, error: '', success: '', loading: false });
  const toggleTheme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { conversations, activeConversationId, isLoading, setConversations, setActiveConversation, sendMessage, deleteConversation } = useChatStore();
  const navigate = useNavigate();

  const handleVoiceInput = (text: string) => {
    setInput(prev => {
      const separator = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + separator + text;
    });
  };

  const { isListening, toggleListening, speakMessage, speakingMessageId } = useVoice(handleVoiceInput);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordForm(p => ({ ...p, error: 'Passwords do not match', success: '' }));
      return;
    }
    setPasswordForm(p => ({ ...p, loading: true, error: '', success: '' }));
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/change-password/`, {
        old_password: passwordForm.old,
        new_password: passwordForm.new
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPasswordForm(p => ({ ...p, loading: false, success: 'Password changed successfully!', old: '', new: '', confirm: '' }));
    } catch (err: any) {
      setPasswordForm(p => ({ ...p, loading: false, error: err.response?.data?.error || 'Failed to change password' }));
    }
  };

  const handleUploadMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) return;
    setUploadForm(p => ({ ...p, loading: true, error: '', success: '' }));
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      await axios.post(`${import.meta.env.VITE_API_URL}/memories/upload/`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUploadForm(p => ({ ...p, loading: false, success: 'Memory extracted successfully!', file: null }));
    } catch (err: any) {
      setUploadForm(p => ({ ...p, loading: false, error: err.response?.data?.error || 'Failed to process file' }));
    }
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
            <div key={conv.id} className="relative group w-full flex items-center animate-slide-in-right" style={{ animationDelay: `${idx * 40}ms` }}>
              <button 
                onClick={() => setActiveConversation(conv.id)}
                {...useLongPress(() => deleteConversation(conv.id), 600)}
                className={`flex-1 flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium pr-10 ${
                  activeConversationId === conv.id
                    ? 'bg-primary text-white shadow-[0_0_12px_rgba(37,99,235,0.25)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                }`}>
                <MessageSquare size={15} className={activeConversationId === conv.id ? 'text-primary/80' : 'text-gray-500'} />
                <span className="truncate">{conv.title || 'New Conversation'}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                className={`absolute right-2 p-1.5 rounded-lg opacity-0 md:group-hover:opacity-100 transition-all hidden md:block ${
                  activeConversationId === conv.id ? 'text-white hover:bg-white/20' : 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
                }`}
                title="Delete Chat">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary/10 space-y-1">

          <button onClick={() => { setSettingsView('main'); setSettingsOpen(true); }} className="w-full flex items-center gap-3 text-gray-600 hover:text-white p-3 rounded-xl hover:bg-white/5 transition-all group">
            <Settings size={18} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-gray-600 hover:text-red-400 p-3 rounded-xl hover:bg-white/5 transition-all group">
            <LogOut size={18} className="text-red-500/70 group-hover:text-red-400 transition-colors" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative bg-background dark:bg-dark-bg">
        {/* ── App Header (Solid & Fixed) ── */}
        <div className="flex-none w-full z-20 shadow-sm border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="h-14 md:h-16 w-full flex items-center justify-between px-4">
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
            <span className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm md:text-base tracking-wide">
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
        </div>

        {/* ── Messages Area ── */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 space-y-6">
          {!activeConversation || activeConversation.messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
              <div className="w-24 h-24 md:w-28 md:h-28 mb-6 md:mb-8 rounded-3xl overflow-hidden border border-primary/20 shadow-[0_0_60px_rgba(37,99,235,0.3)] animate-float">
                <img src={`${import.meta.env.BASE_URL}pdr_logo.jpg`} alt="PDR AI Agent" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-gray-800 dark:text-gray-100">PDR AI AGENT</h2>
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
                      <div className="flex flex-col items-center mr-3 mt-1 flex-shrink-0 gap-2">
                        <img src={`${import.meta.env.BASE_URL}pdr_logo.jpg`} alt="AI Logo" className="w-8 h-8 rounded-full object-cover border border-primary/30 shadow-sm" />
                        <button 
                          onClick={() => speakMessage(parsedText || '', idx)}
                          className={`p-1.5 rounded-full transition-colors ${speakingMessageId === idx ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                          title="Read aloud"
                        >
                          {speakingMessageId === idx ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      </div>
                    )}
                    <div 
                      {...(msg.role === 'user' ? useLongPress(() => { setInput(parsedText || ''); fileInputRef.current?.focus(); }, 600) : {})}
                      className={`relative group max-w-[90%] md:max-w-[75%] min-w-0 rounded-2xl px-5 py-3.5 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white ml-auto' 
                        : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-100 prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none break-words overflow-hidden'
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
                                },
                                table({ children, ...props }: any) {
                                  return (
                                    <div className="overflow-x-auto w-full my-4 rounded-lg border border-gray-100 dark:border-gray-800">
                                      <table className="min-w-full m-0" {...props}>
                                        {children}
                                      </table>
                                    </div>
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
                      {msg.role === 'user' && (
                        <button 
                          onClick={() => { setInput(parsedText || ''); fileInputRef.current?.focus(); }}
                          className="absolute -left-10 top-2 p-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-400 opacity-0 md:group-hover:opacity-100 transition-all hover:text-primary shadow-sm border border-gray-100 dark:border-gray-700 hidden md:block"
                          title="Copy to edit"
                        >
                          <Pencil size={14} />
                        </button>
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
        <div className="flex-none px-4 pb-4 pt-2 md:px-8 md:pb-6 bg-background dark:bg-dark-bg">
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
              <div className="relative flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-800 group-focus-within:border-primary/30 rounded-full transition-all shadow-md overflow-hidden">
                <button type="button" id="attach-image-btn" onClick={() => fileInputRef.current?.click()}
                  className="ml-2 p-2.5 text-gray-500 hover:text-primary transition-colors rounded-full flex-shrink-0">
                  <Plus size={22} />
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
                <input id="chat-input" type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Message PDR AI AGENT..."
                  className="flex-1 px-3 py-3.5 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-base min-w-0"
                  disabled={isLoading} />
                <button type="button" onClick={toggleListening}
                  className={`mr-1 p-2.5 rounded-full transition-colors flex-shrink-0 ${isListening ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse' : 'text-gray-400 hover:text-primary hover:bg-gray-50'}`}
                  title={isListening ? "Stop listening" : "Start Voice Input"}>
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
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

      {/* ── Settings Modal ── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-in-up border dark:border-gray-800">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {settingsView === 'main' ? <><Settings size={20} className="text-primary" /> Settings</> : null}
                {settingsView === 'password' ? <><Lock size={20} className="text-red-500" /> Change Password</> : null}
                {settingsView === 'upload' ? <><UploadCloud size={20} className="text-blue-500" /> Upload Memory</> : null}
              </h2>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            {settingsView === 'main' && (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</label>
                  <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-xl border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:shadow-sm transition-all">
                        <Moon size={16} className="text-gray-600 dark:text-gray-300" />
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Toggle Dark Mode</span>
                    </div>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</label>
                  <button onClick={() => setSettingsView('password')} className="w-full flex items-center justify-between p-3 rounded-xl border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:shadow-sm transition-all">
                        <Lock size={16} className="text-red-500" />
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Change Password</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data & Memory</label>
                  <button onClick={() => setSettingsView('upload')} className="w-full flex items-center justify-between p-3 rounded-xl border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:shadow-sm transition-all">
                        <UploadCloud size={16} className="text-blue-500" />
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Upload Memory Files</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </button>
                </div>
              </div>
            )}

            {settingsView === 'password' && (
              <form onSubmit={handleChangePassword} className="p-4 space-y-4">
                <input type="password" required placeholder="Old Password" value={passwordForm.old} onChange={(e) => setPasswordForm(p => ({ ...p, old: e.target.value, error: '', success: '' }))} className="w-full px-4 py-3 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 dark:text-white" />
                <input type="password" required placeholder="New Password" value={passwordForm.new} onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value, error: '', success: '' }))} className="w-full px-4 py-3 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 dark:text-white" />
                <input type="password" required placeholder="Confirm New Password" value={passwordForm.confirm} onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value, error: '', success: '' }))} className="w-full px-4 py-3 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 dark:text-white" />
                {passwordForm.error && <p className="text-red-500 text-sm">{passwordForm.error}</p>}
                {passwordForm.success && <p className="text-green-600 text-sm">{passwordForm.success}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setSettingsView('main')} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Back</button>
                  <button type="submit" disabled={passwordForm.loading} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                    {passwordForm.loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            {settingsView === 'upload' && (
              <form onSubmit={handleUploadMemory} className="p-4 space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative">
                  <input type="file" accept=".txt,.pdf,.csv" onChange={(e) => setUploadForm(p => ({ ...p, file: e.target.files?.[0] || null, error: '', success: '' }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud size={32} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {uploadForm.file ? uploadForm.file.name : "Tap to select or drop a file"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Supports TXT, PDF (Max 5MB)</p>
                </div>
                {uploadForm.error && <p className="text-red-500 text-sm">{uploadForm.error}</p>}
                {uploadForm.success && <p className="text-green-600 text-sm">{uploadForm.success}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setSettingsView('main')} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Back</button>
                  <button type="submit" disabled={uploadForm.loading || !uploadForm.file} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                    {uploadForm.loading ? 'Extracting...' : 'Upload & Extract'}
                  </button>
                </div>
              </form>
            )}

            <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                PDR AI AGENT • Built by Pasham Dhanush Reddy
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
