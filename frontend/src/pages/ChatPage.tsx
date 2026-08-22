import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Send, Menu, Plus, User as UserIcon, Brain, MessageSquare, Image as ImageIcon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../store/chatStore';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    conversations, 
    activeConversationId, 
    isLoading, 
    setConversations, 
    setActiveConversation, 
    sendMessage 
  } = useChatStore();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return navigate('/auth');
        
        const res = await axios.get('http://localhost:8000/api/v1/conversations/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(res.data);
        if (res.data.length > 0 && !activeConversationId) {
          setActiveConversation(res.data[0].id);
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

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;
    
    let currentActiveId = activeConversationId;
    
    if (!currentActiveId) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.post('http://localhost:8000/api/v1/conversations/', 
          { title: input.substring(0, 30) },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        currentActiveId = res.data.id;
        setConversations([...conversations, { ...res.data, messages: [] }]);
        setActiveConversation(res.data.id);
      } catch (e: any) {
        if (e.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          navigate('/auth');
        }
        return;
      }
    }
    
    const messageText = input;
    const messageImage = imagePreview;
    setInput('');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    await sendMessage(messageText, messageImage || undefined);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background animated-bg">
      {/* Decorative Blur for Main Chat */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen animate-pulse delay-200"></div>

      {/* Sidebar */}
      <div className={`glass w-72 flex flex-col transition-transform duration-500 cubic-bezier-out z-20 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full fixed h-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <span className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent flex items-center gap-3">
            <Brain size={28} className="text-primary animate-pulse-glow rounded-xl" />
            Antigravity
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Menu size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <button 
            onClick={() => setActiveConversation(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary hover:text-blue-400 rounded-xl transition-all border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] font-medium"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 mt-2 custom-scrollbar">
          {conversations.map((conv, idx) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all duration-300 animate-slide-in-right ${
                activeConversationId === conv.id 
                  ? 'bg-primary/20 border border-primary/30 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <MessageSquare size={16} className={activeConversationId === conv.id ? 'text-primary' : 'text-gray-500'} />
              <span className="truncate font-medium">{conv.title || 'New Conversation'}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-secondary-light/20 backdrop-blur-sm">
          <Link to="/memory" className="flex items-center gap-3 text-gray-400 hover:text-white p-3 rounded-xl hover:bg-white/5 transition-all">
            <UserIcon size={20} className="text-accent" /> 
            <span className="font-medium">Manage Memory</span>
          </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full relative transition-all duration-500 ${!sidebarOpen ? 'ml-0' : 'ml-0 lg:ml-0'}`}>
        {/* Mobile Header / Sidebar Toggle */}
        <div className="absolute top-4 left-4 z-30">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-3 glass rounded-xl text-gray-400 hover:text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-72 custom-scrollbar">
          {!activeConversation || activeConversation.messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
              <div className="w-24 h-24 mb-8 rounded-3xl bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                <Brain size={48} className="text-primary animate-pulse-glow" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">How can I help you today?</h2>
              <p className="text-gray-400 text-lg max-w-md">I remember our past conversations and adapt to your preferences over time.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-8">
              {activeConversation.messages.map((msg, idx) => {
                let parsedText = msg.content;
                let attachedImage = null;
                try {
                  const data = JSON.parse(msg.content);
                  if (data.text !== undefined && data.image) {
                    parsedText = data.text;
                    attachedImage = data.image;
                  }
                } catch (e) {
                  // Not JSON, ignore
                }

                return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-pop`} style={{ animationDelay: '50ms' }}>
                  
                  {msg.role === 'assistant' && (
                     <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 mr-3 mt-1 flex-shrink-0">
                       <Brain size={16} className="text-primary" />
                     </div>
                  )}

                  <div className={`max-w-[85%] md:max-w-[75%] px-6 py-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-[0_10px_25px_rgba(59,130,246,0.3)] rounded-tr-sm' 
                      : 'glass-panel text-gray-200 border-white/10 shadow-lg rounded-tl-sm prose prose-invert prose-p:leading-relaxed prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-white/10 max-w-none'
                  }`}>
                    {attachedImage && (
                      <div className="mb-4 rounded-xl overflow-hidden shadow-md max-w-sm">
                        <img src={attachedImage} alt="Attachment" className="w-full h-auto object-cover" />
                      </div>
                    )}
                    
                    {parsedText ? (
                      msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-[15px] md:text-base">
                          {parsedText}
                        </p>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {parsedText}
                        </ReactMarkdown>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-[15px] md:text-base">
                        <span className="flex items-center gap-1 opacity-60 h-6">
                          <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></span>
                          <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></span>
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )})}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
          <div className="max-w-4xl mx-auto">
            {/* Image Preview Area */}
            {imagePreview && (
              <div className="mb-4 relative inline-block animate-fade-in-up">
                <div className="relative rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg max-w-xs">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover max-h-48" />
                  <button 
                    onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors backdrop-blur-md"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSend} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-full opacity-30 group-focus-within:opacity-100 transition duration-500 blur-md"></div>
              <div className="relative flex items-center">
                
                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-3 p-2.5 text-gray-400 hover:text-primary transition-colors hover:bg-white/5 rounded-full z-10"
                >
                  <ImageIcon size={22} />
                </button>
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageChange}
                />
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full pl-14 pr-16 py-4 bg-secondary-light/80 backdrop-blur-xl border border-white/10 rounded-full focus:outline-none focus:border-white/20 text-white placeholder-gray-400 shadow-2xl transition-all text-lg"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !imagePreview) || isLoading}
                  className="absolute right-3 p-2.5 bg-primary hover:bg-primary-hover disabled:bg-gray-600 rounded-full text-white transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
                >
                  <Send size={20} className={isLoading ? 'animate-pulse' : ''} />
                </button>
              </div>
            </form>
            <div className="text-center mt-3 text-xs text-gray-500 font-medium tracking-wide">
              Antigravity can make mistakes. Verify important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
