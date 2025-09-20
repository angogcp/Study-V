// Remove import api
// Add import axios
import axios from 'axios';
import api from '../lib/api'; // Assuming this is the authenticated axios instance

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

// Update the ChatbotService class
export class ChatbotService {
  static socraticPrompts = {
    math: [
      "你能解释一下你是如何得出这个答案的吗？",
      "这个问题可以用另一种方法解决吗？",
      "如果我们改变问题中的一个条件，结果会有什么不同？",
      "你能找出这个解法中可能的错误吗？",
      "这个概念如何应用到实际生活中？"
    ],
    science: [
      "这个现象背后的原理是什么？",
      "你能设计一个实验来验证这个理论吗？",
      "这个结论基于什么证据？",
      "如果条件改变，你认为会发生什么？",
      "这个概念与我们之前学过的内容有什么联系？"
    ],
    language: [
      "这段文字的主要观点是什么？",
      "作者使用了什么修辞手法？目的是什么？",
      "你能用自己的话重述这个概念吗？",
      "这个词在不同上下文中可能有什么不同的含义？",
      "你如何评价这个论点的有效性？"
    ],
    general: [
      "你能更详细地解释一下你的想法吗？",
      "这个问题的不同角度是什么？",
      "你的结论基于什么假设？",
      "有没有可能存在其他解释？",
      "你能举一个例子来说明这个概念吗？"
    ]
  };

  static determineSubject(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('数学') || lowerMessage.includes('方程') || lowerMessage.includes('计算') || lowerMessage.includes('几何') || lowerMessage.includes('代数')) {
      return 'math';
    }
    if (lowerMessage.includes('科学') || lowerMessage.includes('物理') || lowerMessage.includes('化学') || lowerMessage.includes('生物') || lowerMessage.includes('实验')) {
      return 'science';
    }
    if (lowerMessage.includes('语文') || lowerMessage.includes('文学') || lowerMessage.includes('写作') || lowerMessage.includes('阅读') || lowerMessage.includes('语法')) {
      return 'language';
    }
    return 'general';
  }

  static generateFallbackResponse(message: string): string {
    const subject = this.determineSubject(message);
    const prompts = this.socraticPrompts[subject];

    if (message.includes('?') || message.includes('？')) {
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      return `我理解你的问题。让我们一起思考：${randomPrompt}`;
    } else if (message.length < 20) {
      return "能否请你详细描述一下你的问题或想法？这样我才能更好地引导你思考。";
    } else {
      const randomPrompt1 = prompts[Math.floor(Math.random() * prompts.length)];
      let randomPrompt2;
      do {
        randomPrompt2 = prompts[Math.floor(Math.random() * prompts.length)];
      } while (randomPrompt1 === randomPrompt2);
      return `谢谢你分享这些想法。让我们更深入地思考：\n\n${randomPrompt1}\n\n此外，${randomPrompt2}`;
    }
  }

  static async sendMessage(options: { message: string; videoContext?: VideoContext; context?: ChatMessage[] }): Promise<ChatResponse> {
    const { message, videoContext, context = [] } = options;

    const systemPrompt = `You are a helpful learning assistant that uses the Socratic method to guide students in their thinking. Respond in Chinese. Encourage critical thinking by asking questions rather than giving direct answers. Keep responses concise but thought-provoking.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...context.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: message }
    ];

    if (videoContext) {
      apiMessages[apiMessages.length - 1].content += `\nVideo context: ${JSON.stringify(videoContext)}`;
    }

    try {
      const response = await api.post('/chatbot/message', { messages: apiMessages });
      const botMessage = response.data.message.trim();
      return { message: botMessage };
    } catch (error) {
      console.error('API error:', error);
      return { message: this.generateFallbackResponse(message) };
    }
  }

  // captureScreenshot method removed as it requires server-side processing not available in client-only mode
}