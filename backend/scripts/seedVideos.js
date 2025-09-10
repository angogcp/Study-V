const { getDatabase } = require('../database/connection');

// Initial video data for 初中二数学不等式
const initialVideos = [
  {
    title: '不等式基础概念',
    titleChinese: '不等式基础概念',
    description: '介绍不等式的基本概念和性质',
    youtubeUrl: 'https://www.youtube.com/watch?v=88uYkIrDEDc',
    youtubeId: '88uYkIrDEDc',
    chapter: '第一章：不等式基础',
    topic: '基础概念',
    sortOrder: 1
  },
  {
    title: '不等式的性质',
    titleChinese: '不等式的性质',
    description: '学习不等式的基本性质和运算规则',
    youtubeUrl: 'https://www.youtube.com/watch?v=_j7M_oEVsG8',
    youtubeId: '_j7M_oEVsG8',
    chapter: '第一章：不等式基础',
    topic: '不等式性质',
    sortOrder: 2
  },
  {
    title: '一元一次不等式',
    titleChinese: '一元一次不等式',
    description: '掌握一元一次不等式的解法',
    youtubeUrl: 'https://www.youtube.com/watch?v=pZWnKDjpYxU',
    youtubeId: 'pZWnKDjpYxU',
    chapter: '第二章：一元不等式',
    topic: '一元一次不等式',
    sortOrder: 3
  },
  {
    title: '一元一次不等式组',
    titleChinese: '一元一次不等式组',
    description: '学习一元一次不等式组的解法',
    youtubeUrl: 'https://www.youtube.com/watch?v=oHr-WDkRO6w',
    youtubeId: 'oHr-WDkRO6w',
    chapter: '第二章：一元不等式',
    topic: '一元一次不等式组',
    sortOrder: 4
  },
  {
    title: '不等式的图形表示',
    titleChinese: '不等式的图形表示',
    description: '用数轴和图形表示不等式的解集',
    youtubeUrl: 'https://www.youtube.com/watch?v=odq72eqlQVc',
    youtubeId: 'odq72eqlQVc',
    chapter: '第三章：不等式图解',
    topic: '图形表示',
    sortOrder: 5
  },
  {
    title: '绝对值不等式',
    titleChinese: '绝对值不等式',
    description: '解决包含绝对值的不等式问题',
    youtubeUrl: 'https://www.youtube.com/watch?v=cJaGFHNnwPU',
    youtubeId: 'cJaGFHNnwPU',
    chapter: '第四章：特殊不等式',
    topic: '绝对值不等式',
    sortOrder: 6
  },
  {
    title: '分式不等式',
    titleChinese: '分式不等式',
    description: '学习分式不等式的解法和注意事项',
    youtubeUrl: 'https://www.youtube.com/watch?v=b7NvKn60xBM',
    youtubeId: 'b7NvKn60xBM',
    chapter: '第四章：特殊不等式',
    topic: '分式不等式',
    sortOrder: 7
  },
  {
    title: '不等式的应用',
    titleChinese: '不等式的应用',
    description: '不等式在实际问题中的应用',
    youtubeUrl: 'https://www.youtube.com/watch?v=AhwT-NdTOPM',
    youtubeId: 'AhwT-NdTOPM',
    chapter: '第五章：实际应用',
    topic: '应用题',
    sortOrder: 8
  },
  {
    title: '不等式综合练习',
    titleChinese: '不等式综合练习',
    description: '综合练习各种类型的不等式问题',
    youtubeUrl: 'https://www.youtube.com/watch?v=OPRCDafbAjc',
    youtubeId: 'OPRCDafbAjc',
    chapter: '第六章：综合练习',
    topic: '综合练习',
    sortOrder: 9
  },
  {
    title: '不等式复习总结',
    titleChinese: '不等式复习总结',
    description: '复习总结不等式的所有知识点',
    youtubeUrl: 'https://www.youtube.com/watch?v=jJjRw2ieyvQ',
    youtubeId: 'jJjRw2ieyvQ',
    chapter: '第七章：复习总结',
    topic: '总复习',
    sortOrder: 10
  }
];

async function seedVideos() {
  console.log('开始添加初始视频数据...');
  
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
      
      // Insert videos
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO videos (
          title, title_chinese, description, youtube_url, youtube_id,
          thumbnail_url, subject_id, grade_level, chapter, topic,
          difficulty_level, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      let insertedCount = 0;
      
      initialVideos.forEach((video, index) => {
        const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
        
        insertStmt.run(
          video.title,
          video.titleChinese,
          video.description,
          video.youtubeUrl,
          video.youtubeId,
          thumbnailUrl,
          subjectId,
          gradeLevel,
          video.chapter,
          video.topic,
          'medium',
          video.sortOrder,
          (err) => {
            if (err && !err.message.includes('UNIQUE constraint failed')) {
              console.error(`插入视频 ${video.title} 失败:`, err.message);
            } else if (!err) {
              insertedCount++;
              console.log(`✓ 添加视频: ${video.titleChinese}`);
            }
            
            // Check if this is the last video
            if (index === initialVideos.length - 1) {
              insertStmt.finalize();
              console.log(`\n🎉 完成! 共添加了 ${insertedCount} 个视频`);
              console.log('科目: 数学 (初中2年级)');
              console.log('主题: 不等式');
              db.close();
            }
          }
        );
      });
    });
    
  } catch (error) {
    console.error('添加视频数据时发生错误:', error);
    db.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedVideos();
}

module.exports = { seedVideos };