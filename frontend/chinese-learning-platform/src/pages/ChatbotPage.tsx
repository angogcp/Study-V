import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatbotService } from '@/services/chatbot.service';
import Chatbot from '@/components/Chatbot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

export default function ChatbotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: '你好！我是你的学习助手。我会用苏格拉底式方法帮助你思考和学习。你可以问我任何学习相关的问题。'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send message to API
      const response = await ChatbotService.sendMessage({
        message,
        userId: user?.id || '',
        context: messages
      });

      // Add bot response to chat
      const botMessage: ChatMessage = { role: 'bot', content: response.message };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: ChatMessage = { 
        role: 'bot', 
        content: '抱歉，我遇到了一些问题。请稍后再试。' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">苏格拉底式学习助手</CardTitle>
        </CardHeader>
        <CardContent>
          <Chatbot 
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}