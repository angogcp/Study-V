import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ChapterService } from '@/services/chapter.service';
import { VideoService } from '@/services/video.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';

const ChapterDetail: React.FC = () => {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();

  const { data: chapter, isLoading: chapterLoading, error: chapterError } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => ChapterService.getChapter(parseInt(chapterId || '0')), // Assuming getChapter method exists
  });

  const { data: videos, isLoading: videosLoading, error: videosError } = useQuery({
    queryKey: ['videos', chapterId],
    queryFn: () => VideoService.getAllVideos({ chapter_id: parseInt(chapterId || '0') }),
  });

  if (chapterLoading || videosLoading) return <LoadingSpinner />;
  if (chapterError) return <div>Error loading chapter: {chapterError.message}</div>;
  if (videosError) return <div>Error loading videos: {videosError.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{chapter?.title_chinese} ({chapter?.title_english})</h1>
      <p className="mb-2">Grade Level: {chapter?.grade_level}</p>
      <p className="mb-6">{chapter?.description}</p>
      <h2 className="text-xl font-semibold mb-4">Videos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos?.videos?.map((video) => ( // Assuming response has {videos, total}
          <Link key={video.id} to={`/subjects/${subjectId}/chapters/${chapterId}/videos/${video.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Duration: {video.duration} minutes</p>
                <p>{video.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChapterDetail;