import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SubjectService } from '@/services/subject.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';

const Subjects: React.FC = () => {
  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: SubjectService.getSubjects,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading subjects: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Subjects</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects?.map((subject) => (
          <Link key={subject.id} to={`/subjects/${subject.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{subject.name_chinese} ({subject.name_english})</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{subject.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Subjects;