'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Plus, MessageSquare } from 'lucide-react';
import Navbar from '../components/navbar';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

export default function DiagnosisBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'Previous Consultation',
      lastMessage: 'Thank you for the information...',
      timestamp: new Date(Date.now() - 86400000),
    },
  ]);
  const [currentChatId, setCurrentChatId] = useState('1');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thank you for sharing that information. I\'m analyzing your symptoms to provide helpful guidance.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: 'New Consultation',
      lastMessage: '',
      timestamp: new Date(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChatId);
    setMessages([]);
    setInput('');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachedFiles([...attachedFiles, ...files]);
    }
  };

  const handleVoiceInput = () => {
    if (!isRecording) {
      // Start recording
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

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
            alert('Voice recognition error. Please try again.');
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          if (finalTranscript.trim()) {
            setInput((prev) => prev + (prev ? ' ' : '') + finalTranscript.trim());
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
        alert('Voice recognition is not supported in your browser.');
      }
    } else {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden mt-16">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-green-800/20 flex flex-col">
          <div className="p-4 border-b border-green-800/20">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                onClick={() => setCurrentChatId(chat.id)}
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

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
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
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-green-800/20 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-800/20 rounded-lg text-sm text-green-800"
                    >
                      <Paperclip size={14} />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <button
                        onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== index))}
                        className="text-green-700 hover:text-green-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                />
                <button
                  onClick={handleFileAttach}
                  className="p-3 rounded-lg border border-green-800/20 text-green-800 hover:bg-green-50 transition-colors flex-shrink-0"
                  title="Attach files"
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
                >
                  <Mic size={20} />
                </button>

                <button
                  onClick={handleSend}
                  className="p-3 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim()}
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