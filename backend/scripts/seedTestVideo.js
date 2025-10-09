const { getDatabase } = require('../database/connection');

async function seedTestVideo() {
  const supabase = getDatabase();

  const testVideo = {
    title: 'Test Video',
    title_chinese: '测试视频',
    description: 'Test description',
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtube_id: 'dQw4w9WgXcQ',
    subject_id: 1,
    grade_level: '初中1',
    difficulty_level: 'medium',
    is_active: true
  };

  const { data, error } = await supabase.from('videos').insert([testVideo]).select();

  if (error) {
    console.error('Error inserting test video:', error);
  } else {
    console.log('Test video inserted:', data);
  }
}

if (require.main === module) {
  seedTestVideo();
}