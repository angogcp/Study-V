const express = require('express');
const path = require('path');

const { getDatabase } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ytdl = require('ytdl-core');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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
async function generateLLMResponse(message, image, userId, videoId) {
  // Always use LLM for all messages regardless of length
  // Skip fallback logic and directly use LLM
  console.log('Processing message with LLM:', message);
  try {
    let videoContext = null;
    let contextMarkdown = '';
    const db = getDatabase();
    if (videoId) {
      videoContext = await new Promise((resolve) => {
        db.get('SELECT v.title, v.title_chinese, v.description, v.grade_level, v.chapter, s.name_chinese as subject FROM videos v LEFT JOIN subjects s ON v.subject_id = s.id WHERE v.youtube_id = ?', [videoId], (err, row) => {
          if (err) console.error('Database query error:', err);
          resolve(row);
        });
      });
      if (videoContext) {
        contextMarkdown = `# Video Context\n\nTitle: ${videoContext.title_chinese || videoContext.title}\nDescription: ${videoContext.description || 'No description'}\nSubject: ${videoContext.subject || 'Unknown'}\nGrade: ${videoContext.grade_level || 'Unknown'}\nChapter: ${videoContext.chapter || 'Unknown'}`;
      }
    }
    // Comment out OCR for now
    let ocrText = '';
    let ocrMarkdown = '';
    // if (image) {
    //   ocrText = await extractTextFromImage(image);
    //   ocrMarkdown = `# OCR Extracted Text\n\n\`\`\`\n${ocrText}\n\`\`\``;
    // }
    let systemPrompt = "你是一位使用苏格拉底式教学法的中文学习助手。引导学生通过提问来思考问题，而不是直接给出答案。";
    let userPrompt = message;
    if (contextMarkdown) {
      userPrompt += `\n${contextMarkdown}`;
    }
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return { llmResponse: response.data.choices[0].message.content, ocrMarkdown: '' };
  } catch (error) {
    console.error('DeepSeek API call failed:', error.response ? error.response.data : error.message);
    // Always use fallback response when API fails, regardless of message length
    return { llmResponse: generateFallbackResponse(message), ocrMarkdown: '' };
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
    // For short messages, we'll still provide fallback responses when LLM fails
    const shortResponses = [
      "能否请你详细描述一下你的问题或想法？这样我才能更好地引导你思考。",
      "你能再多提供一些信息吗？这样我可以更好地理解你的问题。",
      "请再详细说明一下你的想法，这样我们可以一起深入探讨。",
      "你能展开解释一下你的问题吗？这样我才能给你更有针对性的引导。",
      "为了更好地帮助你，你能分享更多关于这个话题的细节吗？"
    ];
    return shortResponses[Math.floor(Math.random() * shortResponses.length)];
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
  
}

// Ensure table exists when module is loaded
ensureChatMessagesTable();

// Add middleware to handle guest user for routes that require authentication
router.use((req, res, next) => {
  // If no user is authenticated, create a guest user
  if (!req.user) {
    req.user = {
      id: 'guest-user',
      email: 'guest@example.com',
      full_name: 'Guest User',
      role: 'student',
      grade_level: '初中1'
    };
  }
  next();
});

// Send message to chatbot
router.post('/message', async (req, res) => {
  const { message, image, videoId } = req.body;
  const userId = req.user.id;
  console.log('Received image:', !!image);
  
  if (!message && !image) {
    return res.status(400).json({ error: 'Message or image is required' });
  }
  
  const effectiveUserId = userId || req.user.userId;
  
  // Save user message or image
  const contentToSave = image ? JSON.stringify({ type: 'image', content: image }) : message;
  saveChatMessage(effectiveUserId, contentToSave, true);
  
  let effectiveMessage = message || '';
  
  try {
    // Always use LLM for all messages regardless of length
    // Force direct LLM usage without fallback for all messages
    let result;
    
    // Skip the fallback logic entirely and directly call the LLM API
    try {
      let videoContext = null;
      let contextMarkdown = '';
      const db = getDatabase();
      if (videoId) {
        videoContext = await new Promise((resolve) => {
          db.get('SELECT v.title, v.title_chinese, v.description, v.grade_level, v.chapter, s.name_chinese as subject FROM videos v LEFT JOIN subjects s ON v.subject_id = s.id WHERE v.youtube_id = ?', [videoId], (err, row) => {
            if (err) console.error('Database query error:', err);
            resolve(row);
          });
        });
        if (videoContext) {
          contextMarkdown = `# Video Context\n\nTitle: ${videoContext.title_chinese || videoContext.title}\nDescription: ${videoContext.description || 'No description'}\nSubject: ${videoContext.subject || 'Unknown'}\nGrade: ${videoContext.grade_level || 'Unknown'}\nChapter: ${videoContext.chapter || 'Unknown'}`;
        }
      }
      
      let systemPrompt = "你是一位使用苏格拉底式教学法的中文学习助手。引导学生通过提问来思考问题，而不是直接给出答案。";
      let userPrompt = effectiveMessage;
      if (contextMarkdown) {
        userPrompt += `\n${contextMarkdown}`;
      }
      
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      result = { llmResponse: response.data.choices[0].message.content, ocrMarkdown: '' };
    } catch (error) {
      console.error('Direct LLM API call failed:', error.response ? error.response.data : error.message);
      // If direct LLM call fails, use a more varied fallback
      const subject = determineSubject(effectiveMessage);
      const prompts = socraticPrompts[subject];
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      result = { 
        llmResponse: `我现在无法连接到AI服务，但我们可以继续讨论。${randomPrompt}`, 
        ocrMarkdown: '' 
      };
    }
    
    saveChatMessage(effectiveUserId, result.llmResponse, false);
    
    res.json({ 
      message: result.llmResponse,
      socraticHints: socraticPrompts[determineSubject(effectiveMessage)],
      ocrMarkdown: result.ocrMarkdown
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Get chat history
router.get('/history', (req, res) => {
  const db = getDatabase();
  const userId = req.user.id;
  
  db.all(
    `SELECT message_id as id, content, is_from_user, created_at 
     FROM chat_messages 
     WHERE user_id = ? 
     ORDER BY created_at ASC`,
    [userId],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve chat history' });
      }
      
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.is_from_user ? 'user' : 'bot',
        timestamp: msg.created_at
      }));
      
      res.json({ messages: formattedMessages });
    }
  );
});

// Import puppeteer for screenshot functionality
const puppeteer = require('puppeteer');
const tesseract = require('tesseract.js');

// New endpoint for capturing YouTube video frame
router.post('/ask', async (req, res) => {
  const { videoId, time } = req.body;
  
  if (!videoId || time === undefined) {
    return res.status(400).json({ error: 'videoId and time are required' });
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${time}`;

  try {
    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']});
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(youtubeUrl, {waitUntil: 'networkidle2'});

    // Enable subtitles if available
    await page.waitForSelector('.ytp-subtitles-button', {timeout: 5000}).catch(() => {});
    await page.evaluate(() => {
      const ccButton = document.querySelector('.ytp-subtitles-button');
      if (ccButton && ccButton.getAttribute('aria-pressed') === 'false') {
        ccButton.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Seek to time
    await page.waitForSelector('video');
    await page.evaluate((t) => {
      const video = document.querySelector('video');
      video.currentTime = t;
    }, time);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for seek and render

    // Screenshot the player container to include subtitles
    const playerElement = await page.$('#movie_player');
    console.log('Player element found:', !!playerElement);
    const screenshot = await playerElement.screenshot({encoding: 'base64'});
    console.log('Screenshot size:', screenshot.length);

    await browser.close();

    res.json({ image: `data:image/png;base64,${screenshot}` });
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: 'Failed to capture screenshot' });
  }
});

module.exports = router;


async function extractTextFromImage(base64Image) {
  try {
    // Remove data URL prefix if present
    if (base64Image.startsWith('data:image/')) {
      base64Image = base64Image.split(',')[1];
    }
    const buffer = Buffer.from(base64Image, 'base64');
    const metadata = await sharp(buffer).metadata();
    console.log('Original image dimensions:', metadata.width, 'x', metadata.height);
    console.log('Starting OCR with image length:', buffer.length);
    console.log('Buffer length:', buffer.length);
    
    const cropHeight = Math.floor(metadata.height * 0.3);
    const cropTop = metadata.height - cropHeight;
    
    const processedBuffer = await sharp(buffer)
      .extract({ left: 0, top: cropTop, width: metadata.width, height: cropHeight })
      .resize({ width: 2000, kernel: sharp.kernel.lanczos3 })
      .grayscale()
      .median(3)
      .negate()
      .normalize()
      .sharpen({ sigma: 2 })
      .threshold(128)
      .toBuffer();
    
    // Detect orientation
    const osdWorker = await Tesseract.createWorker('osd', 1, {
      langPath: path.join(__dirname, '..')
    });
    await osdWorker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.OSD_ONLY });
    const { data: osdData } = await osdWorker.recognize(processedBuffer);
    await osdWorker.terminate();
    
    const orientationMatch = osdData.text.match(/Orientation in degrees:\\s*(\\d+)/);
    let orientation = 0;
    if (orientationMatch) {
      orientation = parseInt(orientationMatch[1]);
    }
    
    let ocrBuffer = processedBuffer;
    if (orientation !== 0) {
      console.log(`Rotating image by ${-orientation} degrees`);
      ocrBuffer = await sharp(processedBuffer).rotate(-orientation).toBuffer();
    }
    
    const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
      langPath: path.join(__dirname, '..')
    });
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ一二三四五六七八九十百千万亿的了是我不人在他有这个上们来到时大地为子中你说生国年着就那和要她出得以里后自以会家可下过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情己面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亿来分钟秒全字幕功能'
    });
    
    const { data: { text } } = await worker.recognize(ocrBuffer);
    console.log('Extracted text:', text);
    await worker.terminate();
    
    return text.trim();
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);
    return '';
  }
}