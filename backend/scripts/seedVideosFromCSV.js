const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { getDatabase } = require('../database/connection');

function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function seedVideosFromCSV(csvPath) {
  console.log('开始从CSV添加视频数据...');
  
  const db = getDatabase();
  
  try {
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const videos = parse(csvData, { columns: true, skip_empty_lines: true });
    
    if (videos.length === 0) {
      console.log('CSV文件中没有数据');
      return;
    }
    
    let insertedCount = 0;
    
    for (const video of videos) {
      // Lookup subject
      const subject = await new Promise((resolve) => {
        db.get('SELECT id FROM subjects WHERE name_chinese = ?', [video.Subject], (err, row) => {
          resolve(row);
        });
      });
      
      if (!subject) {
        console.error(`未找到科目: ${video.Subject}`);
        continue;
      }
      
      const youtubeId = extractYouTubeId(video['Video URL']);
      if (!youtubeId) {
        console.error(`无效的YouTube URL: ${video['Video URL']}`);
        continue;
      }
      
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      let difficulty = video.Difficulty;
      if (difficulty === '0' || difficulty === 0) {
        difficulty = 'easy';
      } else if (difficulty === 'undefined') {
        difficulty = 'medium';
      }
      
      await new Promise((resolve) => {
        db.run(
          `INSERT OR IGNORE INTO videos (
            title, title_chinese, description, youtube_url, youtube_id,
            thumbnail_url, subject_id, grade_level, chapter, 
            difficulty_level, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            video.Title, // Assuming Title is English or main
            video.Title, // Assuming it's Chinese
            video.Description || '',
            video['Video URL'],
            youtubeId,
            thumbnailUrl,
            subject.id,
            video.Grade,
            video.Chapter,
            difficulty,
            parseInt(video['Sort Order']) || 0
          ],
          function (err) {
            if (err) {
              if (!err.message.includes('UNIQUE constraint failed')) {
                console.error(`插入视频 ${video.Title} 失败:`, err.message);
              }
            } else if (this.changes > 0) {
              insertedCount++;
              console.log(`✓ 添加视频: ${video.Title}`);
            } else {
              console.log(`Skipped ${video.Title} (already exists or constraint violation)`);
            }
            resolve();
          }
        );
      });
    }
    
    console.log(`\n🎉 完成! 共添加了 ${insertedCount} 个视频`);
    
  } catch (error) {
    console.error('添加视频数据时发生错误:', error);
  } finally {
    await new Promise((resolve) => db.close(resolve));
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  if (process.argv.length < 3) {
    console.log('Usage: node seedVideosFromCSV.js <path_to_csv>');
    process.exit(1);
  }
  seedVideosFromCSV(process.argv[2]);
}

module.exports = { seedVideosFromCSV };