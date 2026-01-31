'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Plus, MessageSquare, LogOut, FileText, Download } from 'lucide-react';
import Navbar from "../components/navbar";
import { MarkdownMessage } from '../components/MarkdownMessage';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  reportGenerated?: boolean;
  reportId?: string;
  documentInfo?: {
    fileName: string;
    fileType: string;
  };
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function DiagnosisBot() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authToken) {
      loadConversations();
    }
  }, [authToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token || !userDataStr) {
        router.push('/patient_login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/patient_login');
        return;
      }

      setAuthToken(token);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/patient_login');
    } finally {
      setIsAuthChecking(false);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/conversations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setChats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownloadReport = async (reportId: string) => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/download`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download report. Please try again.');
      }
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !authToken) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: currentInput,
          conversationId: conversationId
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          router.push('/patient_login');
          return;
        }
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      const botResponse = data.data;

      if (!botResponse || !botResponse.message) {
        throw new Error('Invalid response format from server');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botResponse.message,
        timestamp: new Date(),
        confidence: botResponse.confidence,
        reportGenerated: botResponse.reportGenerated,
        reportId: botResponse.reportId,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (botResponse.conversationId && !conversationId) {
        setConversationId(botResponse.conversationId);
      }

      loadConversations();

    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${errorMsg}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversationId(undefined);
    setMessages([]);
    setInput('');
    setError(null);
  };

  const loadChat = async (chatId: string) => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/history/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const loadedMessages: Message[] = data.data.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            confidence: msg.confidence
          })).reverse();
          
          setMessages(loadedMessages);
          setConversationId(chatId);
        }
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
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
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    const allowedTypes = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, TXT, PNG, and JPEG files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    setError(null);

    const uploadNotification: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `Uploading document: ${file.name}...`,
      timestamp: new Date(),
      documentInfo: {
        fileName: file.name,
        fileType: file.type
      }
    };
    setMessages(prev => [...prev, uploadNotification]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }
      if (input) {
        formData.append('message', input);
      }

      const response = await fetch(`${API_BASE_URL}/api/chatbot/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const data = await response.json();

      setMessages(prev => prev.filter(msg => msg.id !== uploadNotification.id));

      const documentMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Document uploaded: ${file.name}`,
        timestamp: new Date(),
        documentInfo: {
          fileName: file.name,
          fileType: file.type
        }
      };

      const analysisMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data || 'Document uploaded successfully.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, documentMessage, analysisMessage]);
      loadConversations();

    } catch (err) {
      console.error('Failed to upload document:', err);
      setMessages(prev => prev.filter(msg => msg.id !== uploadNotification.id));
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Failed to upload document: ${errorMsg}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploadingFile(false);
      setInput('');
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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    router.push('/patient_login');
  };

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto"></div>
          <p className="text-green-800 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar/>
      <div className="flex flex-1 overflow-hidden mt-20">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-green-800/20 flex flex-col">
          <div className="p-4 border-b border-green-800/20">
            <button
              onClick={handleNewChat}
              disabled={isLoading || uploadingFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 mb-2"
            >
              <Plus size={20} />
              <span className="font-medium">New Chat</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-green-800 border border-green-800/20 rounded-lg hover:bg-green-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm">Logout</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-3 px-2">
              Past Chats
            </h3>
            {chats.length === 0 ? (
              <p className="text-xs text-green-700/70 px-2">No chat history yet</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                    conversationId === chat.id
                      ? 'bg-green-50 border border-green-800/30'
                      : 'hover:bg-green-50/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="text-green-700 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-900 truncate">
                        {chat.title}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-xs text-green-700/70 truncate mt-1">
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs text-red-500 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={32} className="text-green-700" />
                  </div>
                  <h2 className="text-2xl font-semibold text-green-900 mb-2">
                    AI Medical Assistant
                  </h2>
                  <p className="text-green-700/70 mb-6">
                    I'm your AI medical assistant powered by peer-reviewed PubMed research.
                    Describe your symptoms or upload medical documents for evidence-based analysis.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-800/10">
                      <p className="font-medium text-green-900 mb-1">Evidence-Based</p>
                      <p className="text-green-700/70 text-xs">All responses backed by medical research</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-800/10">
                      <p className="font-medium text-green-900 mb-1">Document Analysis</p>
                      <p className="text-green-700/70 text-xs">Upload lab results, reports, or images</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-800/10">
                      <p className="font-medium text-green-900 mb-1">PDF Reports</p>
                      <p className="text-green-700/70 text-xs">Get downloadable medical reports</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-green-800 text-white'
                          : message.role === 'system'
                          ? 'bg-gray-50 border border-gray-200 text-gray-600'
                          : 'bg-green-50 text-green-900 border border-green-800/10'
                      }`}
                    >
                      {message.documentInfo && (
                        <div className="mb-2 pb-2 border-b border-green-800/20">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium">
                              {message.documentInfo.fileName}
                            </span>
                          </div>
                        </div>
                      )}

                      <MarkdownMessage
                        content={message.content}
                        isUser={message.role === 'user'}
                      />

                      {message.reportGenerated && message.reportId && (
                        <div className="mt-3 pt-3 border-t border-green-800/20">
                          <button
                            onClick={() => handleDownloadReport(message.reportId!)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all text-sm font-medium"
                          >
                            <Download size={16} />
                            Download Medical Report
                          </button>
                        </div>
                      )}

                      {message.confidence !== undefined && message.confidence > 0 && (
                        <p className="text-xs mt-2 opacity-70">
                          Confidence: {Math.round(message.confidence)}%
                        </p>
                      )}
                      
                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
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

          {/* Input Area */}
          <div className="border-t border-green-800/20 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                />
                <button
                  onClick={handleFileAttach}
                  className="p-3 rounded-lg border border-green-800/20 text-green-800 hover:bg-green-50 transition-colors shrink-0 disabled:opacity-50"
                  title="Attach files (PDF, TXT, PNG, JPEG)"
                  disabled={isLoading || uploadingFile}
                >
                  <Paperclip size={20} />
                </button>

                <div className="flex-1 relative flex items-center">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your symptoms in detail..."
                    className="w-full px-5 py-2.5 border border-green-800/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent resize-none text-green-900 placeholder-green-700/50"
                    rows={1}
                    disabled={isLoading || uploadingFile}
                    style={{
                      height: '48px',
                      maxHeight: '120px',
                    }}
                  />
                </div>

                <button
                  onClick={handleVoiceInput}
                  className={`p-3 rounded-lg border transition-colors shrink-0 ${
                    isRecording
                      ? 'bg-green-700 border-green-700 text-white animate-pulse'
                      : 'border-green-800/20 text-green-800 hover:bg-green-50'
                  }`}
                  title="Voice input"
                  disabled={isLoading || uploadingFile}
                >
                  <Mic size={20} />
                </button>

                <button
                  onClick={handleSend}
                  className="p-3 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim() || isLoading || uploadingFile}
                  title="Send message"
                >
                  <Send size={20} />
                </button>
              </div>
              
              <div className="text-xs text-green-700/70 mt-2">
                Powered by PubMed research • Supported formats: PDF, TXT, PNG, JPEG (max 10MB)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}