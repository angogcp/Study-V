const { getDatabase } = require('../database/connection');

// Chapters data from 数学.txt for Jr2 Mathematics
const chapters = [
  { name: '第1章 多项式', sort_order: 1 },
  { name: '第2章 因式分解', sort_order: 2 },
  { name: '第3章 平方根与立方根', sort_order: 3 },
  { name: '第4章 三角形', sort_order: 4 },
  { name: '第5章 四边形及多边形', sort_order: 5 },
  { name: '第6章 周长与面积', sort_order: 6 },
  { name: '第7章 圆与扇形', sort_order: 7 },
  { name: '第8章 毕氏定理', sort_order: 8 },
  { name: '第9章 集合论', sort_order: 9 },
  { name: '第10章 集合论的应用', sort_order: 10 },
  { name: '第11章 一元二次方程式与一元二次函数', sort_order: 11 },
  { name: '第12章 分式', sort_order: 12 },
  { name: '第13章 公式', sort_order: 13 },
  { name: '第14章 不等式', sort_order: 14 }
];

async function seedChapters() {
  console.log('开始添加章节数据...');
  
  const db = getDatabase();
  
  try {
    // Get the Mathematics subject ID
    db.get('SELECT id FROM subjects WHERE name = ?', ['Mathematics'], (err, subject) => {
      if (err) {
        console.error('获取数学科目失败:', err);
        return;
      }
      
      if (!subject) {
        console.error('未找到数学科目，请先初始化数据库');
        return;
      }
      
      const subjectId = subject.id;
      const gradeLevel = '初中2';
      
      // Insert chapters
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO chapters (
          subject_id, grade_level, name, sort_order
        ) VALUES (?, ?, ?, ?)
      `);
      
      let insertedCount = 0;
      
      chapters.forEach((chapter, index) => {
        insertStmt.run(
          subjectId,
          gradeLevel,
          chapter.name,
          chapter.sort_order,
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
              console.log('科目: 数学 (初中2年级)');
              db.close();
            }
          }
        );
      });
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