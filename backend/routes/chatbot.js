const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const router = express.Router();

// DeepSeek LLM API配置
const DEEPSEEK_API_KEY = process.env.LLM_API_KEY || 'sk-603a57ae782845ea8733f914e97d3004';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Socratic method prompts for different subjects
const socraticPrompts = {
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

// Helper function to determine subject area based on message content
function determineSubject(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('数学') || 
      lowerMessage.includes('方程') || 
      lowerMessage.includes('计算') ||
      lowerMessage.includes('几何') ||
      lowerMessage.includes('代数')) {
    return 'math';
  }
  
  if (lowerMessage.includes('科学') || 
      lowerMessage.includes('物理') || 
      lowerMessage.includes('化学') ||
      lowerMessage.includes('生物') ||
      lowerMessage.includes('实验')) {
    return 'science';
  }
  
  if (lowerMessage.includes('语文') || 
      lowerMessage.includes('文学') || 
      lowerMessage.includes('写作') ||
      lowerMessage.includes('阅读') ||
      lowerMessage.includes('语法')) {
    return 'language';
  }
  
  return 'general';
}

// Generate a response using DeepSeek LLM API
async function generateLLMResponse(message, videoContext = null) {
  try {
    // 构建系统提示，包含苏格拉底式教学方法和视频上下文（如果有）
    let systemPrompt = "你是一位使用苏格拉底式教学法的中文学习助手。引导学生通过提问来思考问题，而不是直接给出答案。";
    
    // 如果有视频上下文信息，添加到系统提示中
    if (videoContext) {
      systemPrompt += `\n\n当前学生正在观看以下视频：\n- 年级: ${videoContext.grade || '未知'}\n- 科目: ${videoContext.subject || '未知'}\n- 主题: ${videoContext.topic || '未知'}\n\n根据这个上下文来回答学生的问题。`;
    }

    // 调用DeepSeek API
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );

    // 返回LLM生成的回复
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.response?.data || error.message);
    // 如果API调用失败，回退到本地生成的回复
    return generateFallbackResponse(message);
  }
}

// 本地生成回复的备用函数（当API调用失败时使用）
function generateFallbackResponse(message) {
  const subject = determineSubject(message);
  const prompts = socraticPrompts[subject];
  
  // Basic response logic
  if (message.includes('?') || message.includes('？')) {
    // If user asks a question, guide them to think through it
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    return `我理解你的问题。让我们一起思考：${randomPrompt}`;
  } else if (message.length < 20) {
    // If message is too short, ask for more details
    return "能否请你详细描述一下你的问题或想法？这样我才能更好地引导你思考。";
  } else {
    // Generate a thoughtful response with follow-up questions
    const randomPrompt1 = prompts[Math.floor(Math.random() * prompts.length)];
    let randomPrompt2;
    do {
      randomPrompt2 = prompts[Math.floor(Math.random() * prompts.length)];
    } while (randomPrompt1 === randomPrompt2);
    
    return `谢谢你分享这些想法。让我们更深入地思考：\n\n${randomPrompt1}\n\n此外，${randomPrompt2}`;
  }
}

// Save chat message to database
function saveChatMessage(userId, message, isFromUser) {
  const db = getDatabase();
  const messageId = uuidv4();
  const timestamp = new Date().toISOString();
  
  db.run(
    `INSERT INTO chat_messages (message_id, user_id, content, is_from_user, created_at) 
     VALUES (?, ?, ?, ?, ?)`,
    [messageId, userId, message, isFromUser ? 1 : 0, timestamp],
    (err) => {
      if (err) {
        console.error('Error saving chat message:', err);
      }
    }
  );
  
  db.close();
}

// Create chat_messages table if it doesn't exist
function ensureChatMessagesTable() {
  const db = getDatabase();
  
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      message_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_from_user INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating chat_messages table:', err);
    }
  });
  
  db.close();
}

// Ensure table exists when module is loaded
ensureChatMessagesTable();

// Send message to chatbot
router.post('/message', authenticateToken, async (req, res) => {
  const { message, userId, videoContext } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Save user message
  saveChatMessage(userId || req.user.userId, message, true);
  
  try {
    // Generate response using DeepSeek LLM API
    const response = await generateLLMResponse(message, videoContext);
    
    // Save bot response
    saveChatMessage(userId || req.user.userId, response, false);
    
    // Return response
    res.json({ 
      message: response,
      socraticHints: socraticPrompts[determineSubject(message)]
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Get chat history
router.get('/history', authenticateToken, (req, res) => {
  const db = getDatabase();
  const userId = req.user.userId;
  
  db.all(
    `SELECT message_id as id, content, is_from_user, created_at 
     FROM chat_messages 
     WHERE user_id = ? 
     ORDER BY created_at ASC`,
    [userId],
    (err, messages) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Failed to retrieve chat history' });
      }
      
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.is_from_user ? 'user' : 'bot',
        timestamp: msg.created_at
      }));
      
      res.json({ messages: formattedMessages });
      db.close();
    }
  );
});

module.exports = router;