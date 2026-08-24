import { create } from 'zustand';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (content: string, imageBase64?: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Assuming token is stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => {
    if (id) {
      sessionStorage.setItem('activeConversationId', id);
    } else {
      sessionStorage.removeItem('activeConversationId');
    }
    set({ activeConversationId: id });
  },

  deleteConversation: async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      await api.delete(`/conversations/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set((state) => {
        const remaining = state.conversations.filter(c => c.id !== id);
        const nextActive = state.activeConversationId === id ? null : state.activeConversationId;
        if (!nextActive) {
            sessionStorage.removeItem('activeConversationId');
        }
        return { 
          conversations: remaining,
          activeConversationId: nextActive
        };
      });
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  },

  sendMessage: async (content: string, imageBase64?: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const messagePayload = imageBase64 ? JSON.stringify({ text: content, image: imageBase64 }) : content;

    // Optimistic UI update
    const tempId = Date.now().toString();
    const newUserMsg: Message = { id: tempId, role: 'user', content: messagePayload };
    const tempAsstMsg: Message = { id: tempId + 'a', role: 'assistant', content: '' };
    
    set((state) => {
      const activeConv = state.conversations.find(c => c.id === activeConversationId);
      if (!activeConv) return state;
      
      const updatedConv = { ...activeConv, messages: [...activeConv.messages, newUserMsg, tempAsstMsg] };
      const otherConvs = state.conversations.filter(c => c.id !== activeConversationId);
      
      return { conversations: [updatedConv, ...otherConvs] };
    });

    try {
      set({ isLoading: true });
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/conversations/${activeConversationId}/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: messagePayload })
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth';
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        set((state) => ({
          conversations: state.conversations.map(c => 
            c.id === activeConversationId 
              ? {
                  ...c,
                  messages: c.messages.map(m => 
                    m.id === tempAsstMsg.id ? { ...m, content: "Error: Could not get response from the server. Please check backend logs." } : m
                  )
                }
              : c
          )
        }));
        return;
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let asstContent = "";
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const data = line.trim().replace('data: ', '');
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              asstContent += parsed.chunk;
              
              // Update state with chunk
              set((state) => ({
                conversations: state.conversations.map(c => 
                  c.id === activeConversationId 
                    ? {
                        ...c,
                        messages: c.messages.map(m => 
                          m.id === tempAsstMsg.id ? { ...m, content: asstContent } : m
                        )
                      }
                    : c
                )
              }));
            } catch (e) {
               // handle parsing errors of incomplete chunks if needed
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === activeConversationId 
            ? {
                ...c,
                messages: c.messages.map(m => 
                  m.id === tempAsstMsg.id ? { ...m, content: `Error: ${error.message || 'Network error occurred.'}` } : m
                )
              }
            : c
        )
      }));
    } finally {
      set({ isLoading: false });
    }
  }
}));
