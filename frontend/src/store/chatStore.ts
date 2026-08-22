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
  setActiveConversation: (id: string) => void;
  sendMessage: (content: string, imageBase64?: string) => Promise<void>;
}

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
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
  setActiveConversation: (id) => set({ activeConversationId: id }),

  sendMessage: async (content: string, imageBase64?: string) => {
    const { activeConversationId, conversations } = get();
    if (!activeConversationId) return;

    const messagePayload = imageBase64 ? JSON.stringify({ text: content, image: imageBase64 }) : content;

    // Optimistic UI update
    const tempId = Date.now().toString();
    const newUserMsg: Message = { id: tempId, role: 'user', content: messagePayload };
    const tempAsstMsg: Message = { id: tempId + 'a', role: 'assistant', content: '' };
    
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === activeConversationId 
          ? { ...c, messages: [...c.messages, newUserMsg, tempAsstMsg] }
          : c
      )
    }));

    try {
      set({ isLoading: true });
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/v1/conversations/${activeConversationId}/stream/`, {
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
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
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
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
