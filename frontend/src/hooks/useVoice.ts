import { useState, useCallback, useRef, useEffect } from 'react';

export function useVoice(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Force early loading of voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Initialize Speech Recognition
  if (!recognitionRef.current && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isListening]);

  const speakMessage = useCallback((text: string, messageId: number) => {
    if (!('speechSynthesis' in window)) return;
    
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = [
      "Microsoft Heera",
      "Microsoft Ravi",
      "Rishi",
      "Veena",
      "Google English (India)",
      "Google UK English Female" // Fallback if no Indian voice
    ];
    
    let selectedVoice = null;

    // 1. First try to find a voice by specific name
    for (const pref of preferredVoices) {
      selectedVoice = voices.find(v => v.name.includes(pref));
      if (selectedVoice) break;
    }
    
    // 2. If not found by name, try to find ANY voice with the en-IN language code
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang === 'en-IN');
    }
    
    // 3. Absolute fallback
    if (!selectedVoice) {
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      selectedVoice = enVoices.find(v => v.name.toLowerCase().includes('female')) || enVoices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Adjust pitch and rate for natural Indian cadence
    utterance.pitch = 1.1; 
    utterance.rate = 1.15; 
    
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, []);

  return {
    isListening,
    toggleListening,
    speakMessage,
    stopSpeaking,
    speakingMessageId
  };
}
