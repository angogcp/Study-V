import React, { useEffect, useRef, useState } from 'react';
import { Send, Upload, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  image?: string;
}

interface ChatbotProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, image?: string) => void;
  isLoading: boolean;
  className?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ messages, onSendMessage, isLoading, className }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remove API key check and related states

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Remove handleSaveApiKey

  const handleSendMessage = async () => {
    if (isLoading) return;

    let imageBase64: string | undefined;
    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      await new Promise((resolve) => { reader.onload = resolve; });
      imageBase64 = reader.result as string;
      setSelectedFile(null);
    }

    if (inputValue.trim() || imageBase64) {
      onSendMessage(inputValue.trim() || 'Please analyze this image', imageBase64);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-[600px] border rounded-lg overflow-hidden", className)}>
      {/* Remove showApiKeyInput conditional */}
      <>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 max-w-[80%]",
                  message.role === 'user' ? 'ml-auto' : ''
                )}
              >
                <div className={cn(
                  "p-3 rounded-lg markdown-content",
                  message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                )}>
                  {message.role === 'bot' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                  {message.image && (
                    <img src={message.image} alt="Uploaded" className="mt-2 max-w-[200px] rounded" />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gray-100">思考中...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的消息..."
            className="flex-1"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button onClick={handleSendMessage} disabled={isLoading || (!inputValue.trim() && !selectedFile)}>
            发送
          </Button>
        </div>
      </>
    </div>
  );
};

export default Chatbot;