import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout/Layout';
import Login from '@/components/Auth/Login';
import Register from '@/components/Auth/Register';
import Dashboard from '@/components/Dashboard/Dashboard';
import VideoList from '@/components/Videos/VideoList';
import VideoPlayer from '@/components/Videos/VideoPlayer';
import LoadingSpinner from '@/components/LoadingSpinner';
import './App.css';
import VideoManagement from '@/components/Admin/VideoManagement';
import UserManagement from '@/components/Admin/UserManagement';
import MyNotes from '@/components/Notes/MyNotes';
import LearningProgress from '@/components/Progress/LearningProgress';
import api from '@/lib/api';
import SubjectManagement from '@/components/Admin/SubjectManagement';
import ChapterManagement from '@/components/Admin/ChapterManagement';

const defaultQueryFn = async ({ queryKey }) => {
  // 处理数组形式的queryKey
  const endpoint = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  
  // 如果queryKey是数组且包含多个元素，可能需要构建查询参数
  let url = endpoint;
  let params = {};
  
  if (Array.isArray(queryKey) && queryKey.length > 1) {
    // 对于特定的查询模式添加处理逻辑
    if (endpoint === '/api/chapters' && queryKey.length > 1) {
      // 处理章节查询的参数
      if (queryKey[1] !== 'all') params.subject_id = queryKey[1];
      if (queryKey[2] !== 'all') params.grade_level = queryKey[2];
    }
    
    // 对于视频查询添加参数处理
    if (endpoint === '/api/videos' && queryKey.length > 1) {
      if (queryKey[1]) params.search = queryKey[1];
      if (queryKey[2] && queryKey[2] !== 'all') params.subject_id = queryKey[2];
      if (queryKey[3] && queryKey[3] !== 'all') params.grade_level = queryKey[3];
      if (queryKey[4]) params.page = queryKey[4];
    }
  }
  
  const { data } = await api.get(url, { params });
  return data;
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="videos" element={<VideoList />} />
        <Route path="videos/:id" element={<VideoPlayer />} />
        {/* Additional routes can be added here */}
        <Route path="progress" element={<LearningProgress />} />
        <Route path="notes" element={<MyNotes />} />
        <Route path="settings" element={<div className="p-8 text-center text-gray-500">设置页面开发中...</div>} />
        
        {/* Admin Routes */}
        <Route path="admin/user" element={<UserManagement />} />
        <Route path="admin/videos" element={<VideoManagement />} />
        <Route path="admin/subjects" element={<SubjectManagement />} />
        <Route path="admin/chapters" element={<ChapterManagement />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="App">
            <AppRoutes />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;