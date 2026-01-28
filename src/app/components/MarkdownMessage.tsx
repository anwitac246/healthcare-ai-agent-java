import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

/**
 * Renders chat messages with proper markdown formatting
 * - Preserves medical formatting (lists, bold, headers)
 * - Professional healthcare styling
 */
export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ 
  content, 
  isUser = false 
}) => {
  // Ensure content is a string and handle edge cases
  const contentString = typeof content === 'string' ? content : String(content || '');
  
  // Remove emojis for cleaner professional display
  const cleanContent = contentString.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  return (
    <div className={`markdown-content ${isUser ? 'user-message' : 'assistant-message'}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom heading styling
          h1: ({node, ...props}) => <h1 className="text-xl font-bold text-green-800 mb-2 mt-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-green-700 mb-2 mt-3" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-base font-semibold text-green-600 mb-1 mt-2" {...props} />,
          
          // Lists
          ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="text-gray-700 ml-4" {...props} />,
          
          // Paragraphs
          p: ({node, ...props}) => <p className="my-2 text-gray-800 leading-relaxed" {...props} />,
          
          // Strong/Bold
          strong: ({node, ...props}) => <strong className="font-semibold text-green-700" {...props} />,
          
          // Links
          a: ({node, ...props}) => (
            <a 
              className="text-green-600 underline hover:text-green-700" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),
          
          // Code blocks
          code: ({node, inline, ...props}: any) => (
            inline 
              ? <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />
              : <code className="block bg-gray-100 p-3 rounded my-2 text-sm font-mono overflow-x-auto" {...props} />
          ),
          
          // Blockquotes
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-green-500 pl-4 my-2 italic text-gray-700" {...props} />
          ),
          
          // Tables
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full divide-y divide-gray-200 border" {...props} />
            </div>
          ),
          th: ({node, ...props}) => (
            <th className="px-4 py-2 bg-green-50 text-left text-sm font-semibold text-green-800 border" {...props} />
          ),
          td: ({node, ...props}) => (
            <td className="px-4 py-2 text-sm text-gray-700 border" {...props} />
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;