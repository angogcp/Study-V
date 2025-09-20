import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { SubjectService } from '@/services/subject.service';
import { ChapterService } from '@/services/chapter.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';

const SubjectDetail: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();

  const { data: subject, isLoading: subjectLoading, error: subjectError } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => SubjectService.getSubject(parseInt(subjectId || '0')),
  });

  const { data: chapters, isLoading: chaptersLoading, error: chaptersError } = useQuery({
    queryKey: ['chapters', subjectId],
    queryFn: () => ChapterService.getChapters({ subject_id: parseInt(subjectId || '0') }),
  });

  if (subjectLoading || chaptersLoading) return <LoadingSpinner />;
  if (subjectError) return <div>Error loading subject: {subjectError.message}</div>;
  if (chaptersError) return <div>Error loading chapters: {chaptersError.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{subject?.name_chinese} ({subject?.name_english})</h1>
      <p className="mb-6">{subject?.description}</p>
      <h2 className="text-xl font-semibold mb-4">Chapters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chapters?.map((chapter) => (
          <Link key={chapter.id} to={`/subjects/${subjectId}/chapters/${chapter.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{chapter.title_chinese} ({chapter.title_english})</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Grade Level: {chapter.grade_level}</p>
                <p>{chapter.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SubjectDetail;