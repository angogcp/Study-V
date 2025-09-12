const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { getDatabase } = require('../database/connection');

async function seedChapters() {
  console.log('开始添加章节数据...');
  
  const db = getDatabase();
  
  try {
    const csvPath = path.join(__dirname, '../data/chapters.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const chapters = parse(csvData, { columns: true, skip_empty_lines: true });
    
    if (chapters.length === 0) {
      console.log('CSV文件中没有数据');
      db.close();
      return;
    }
    
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO chapters (
        subject_id, grade_level, name, sort_order
      ) VALUES (?, ?, ?, ?)
    `);
    
    let insertedCount = 0;
    
    chapters.forEach((chapter, index) => {
      insertStmt.run(
        chapter.subject_id,
        chapter.grade_level,
        chapter.name,
        chapter.sort_order || 0,
        (err) => {
          if (err) {
            console.error(`插入章节 ${chapter.name} 失败:`, err.message);
          } else {
            insertedCount++;
            console.log(`✓ 添加章节: ${chapter.name}`);
          }
          
          // Check if this is the last chapter
          if (index === chapters.length - 1) {
            insertStmt.finalize();
            console.log(`\n🎉 完成! 共添加了 ${insertedCount} 个章节`);
            db.close();
          }
        }
      );
    });
    
  } catch (error) {
    console.error('添加章节数据时发生错误:', error);
    db.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedChapters();
}

module.exports = { seedChapters };