'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Plus, MessageSquare } from 'lucide-react';
import Navbar from "../components/navbar";
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  confidence?: number;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

async function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userDataStr = localStorage.getItem('userData');
  if (!userDataStr) return null;
  try {
    return JSON.parse(userDataStr);
  } catch {
    return null;
  }
}

export default function DiagnosisBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = '/patient_login';
      return;
    }

    const initialChatId = Date.now().toString();
    const initialChat: Chat = {
      id: initialChatId,
      title: 'New Consultation',
      lastMessage: '',
      timestamp: new Date(),
    };
    setChats([initialChat]);
    setCurrentChatId(initialChatId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: currentInput,
          conversationId: currentChatId,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      const botResponse = data.data;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse.message || 'I apologize, but I could not generate a response.',
        sender: 'bot',
        timestamp: new Date(),
        confidence: botResponse.confidence,
      };
      
      setMessages(prev => [...prev, botMessage]);

      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, lastMessage: currentInput, timestamp: new Date() }
          : chat
      ));
      
    } catch (err) {
      console.error('Error:', err);
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${errorMsg}. Please try again.`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: 'New Consultation',
      lastMessage: '',
      timestamp: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
    setInput('');
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      setError('Only PDF and TXT files are supported');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', currentChatId);

      const response = await fetch(`${API_BASE_URL}/api/chatbot/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const data = await response.json();

      const documentMessage: Message = {
        id: Date.now().toString(),
        text: `📄 **Document Uploaded**: ${file.name}\n\n**Analysis**:\n${data.data}`,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, documentMessage]);
      
    } catch (err) {
      console.error('Document upload error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVoiceInput = () => {
    if (!isRecording) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognitionRef.current = recognition;
        let finalTranscript = '';

        recognition.onstart = () => {
          setIsRecording(true);
          finalTranscript = '';
        };

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          recognitionRef.current = null;
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError('Voice recognition error. Please try again.');
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          if (finalTranscript.trim()) {
            setInput(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
          }
          recognitionRef.current = null;
        };

        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to start recognition:', error);
          setIsRecording(false);
        }
      } else {
        setError('Voice recognition is not supported in your browser.');
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar/>
      <div className="flex flex-1 overflow-hidden mt-20">
        <div className="w-64 bg-white border-r border-green-800/20 flex flex-col">
          <div className="p-4 border-b border-green-800/20">
            <button
              onClick={handleNewChat}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Plus size={20} />
              <span className="font-medium">New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-3 px-2">
              Past Chats
            </h3>
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setCurrentChatId(chat.id);
                  setMessages([]);
                }}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  currentChatId === chat.id
                    ? 'bg-green-50 border border-green-800/30'
                    : 'hover:bg-green-50/50 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare size={16} className="text-green-700 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 truncate">
                      {chat.title}
                    </p>
                    <p className="text-xs text-green-700/70 truncate mt-1">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={32} className="text-green-700" />
                  </div>
                  <h2 className="text-2xl font-semibold text-green-900 mb-2">
                    Welcome to Diagnosis Bot
                  </h2>
                  <p className="text-green-700/70 max-w-md">
                    Start a conversation to receive medical guidance and support.
                    I'm here to help you understand your symptoms.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.sender === 'user'
                          ? 'bg-green-800 text-white'
                          : 'bg-green-50 text-green-900 border border-green-800/10'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      {message.confidence && (
                        <p className="text-xs mt-2 opacity-70">
                          Confidence: {Math.round(message.confidence)}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-green-50 rounded-2xl px-4 py-3 border border-green-800/10">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-700 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-700 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-green-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-green-800/20 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.txt"
                />
                <button
                  onClick={handleFileAttach}
                  className="p-3 rounded-lg border border-green-800/20 text-green-800 hover:bg-green-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Attach files"
                  disabled={loading}
                >
                  <Paperclip size={20} />
                </button>

                <div className="flex-1 relative flex items-center">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your symptoms..."
                    className="w-full px-5 py-2.5 border border-green-800/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent resize-none text-green-900 placeholder-green-700/50"
                    rows={1}
                    disabled={loading}
                    style={{
                      height: '48px',
                      maxHeight: '120px',
                    }}
                  />
                </div>

                <button
                  onClick={handleVoiceInput}
                  className={`p-3 rounded-lg border transition-colors flex-shrink-0 ${
                    isRecording
                      ? 'bg-green-700 border-green-700 text-white animate-pulse'
                      : 'border-green-800/20 text-green-800 hover:bg-green-50'
                  }`}
                  title="Voice input"
                  disabled={loading}
                >
                  <Mic size={20} />
                </button>

                <button
                  onClick={handleSend}
                  className="p-3 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim() || loading}
                  title="Send message"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}