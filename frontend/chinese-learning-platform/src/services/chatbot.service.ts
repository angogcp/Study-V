import api from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

interface VideoContext {
  grade?: string;
  subject?: string;
  topic?: string;
  title?: string;
  currentTime?: number | string;
}

interface ChatRequest {
  message: string;
  userId?: string;
  context?: ChatMessage[];
  videoContext?: VideoContext;
}

interface ChatResponse {
  message: string;
  socraticHints?: string[];
}

export class ChatbotService {
  static async sendMessage(message: string, videoContext?: VideoContext): Promise<ChatResponse> {
    const userId = localStorage.getItem('userId') || '';
    const data: ChatRequest = {
      message,
      userId,
      videoContext
    };
    
    const response = await api.post<ChatResponse>('/chatbot/message', data);
    return response.data;
  }
}