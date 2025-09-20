import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Home, 
  Video, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut,
  GraduationCap,
  Users,
  MessageCircle
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    {
      name: '主页',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard'
    },
    {
      name: '视频学习',
      href: '/videos',
      icon: Video,
      current: location.pathname.startsWith('/videos')
    },
    {
      name: '学习进度',
      href: '/progress',
      icon: BarChart3,
      current: location.pathname === '/progress'
    },
    {
      name: '我的笔记',
      href: '/notes',
      icon: FileText,
      current: location.pathname.startsWith('/notes')
    },
    {
      name: '学习助手',
      href: '/chatbot',
      icon: MessageCircle,
      current: location.pathname === '/chatbot'
    },
  ];

  const adminNavigation = [
    {
      name: '用户管理',
      href: '/admin/user',
      icon: Users,
      current: location.pathname === '/admin/user'
    },
    {
      name: '视频管理',
      href: '/admin/videos',
      icon: Video,
      current: location.pathname === '/admin/videos'
    },
    {
      name: '科目管理',
      href: '/admin/subjects',
      icon: BookOpen,
      current: location.pathname === '/admin/subjects'
    },
    {
      name: '章节管理',
      href: '/admin/chapters',
      icon: FileText,
      current: location.pathname === '/admin/chapters'
    },
  ];

  const allNavigation = user?.role === 'admin' 
    ? [...navigation, ...adminNavigation] 
    : navigation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
              </Sheet>
            )}
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">独中学习平台</h1>
                <p className="text-xs text-gray-500">视频学习系统</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="hidden sm:flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {user?.gradeLevel ?? ''}
                    </Badge>
                    {user?.role === 'admin' && (
                      <Badge variant="default" className="text-xs bg-purple-100 text-purple-800">
                        管理员
                      </Badge>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatarUrl} alt={user?.fullName ?? 'Guest'} />
                          <AvatarFallback>{user?.fullName?.charAt(0) ?? 'G'}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.fullName ?? 'Guest'}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email ?? 'Guest Mode'}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          设置
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="h-full bg-white shadow-sm overflow-y-auto"
          >
            <div className="p-4">
              <div className="space-y-1">
                {allNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </SheetContent>
      </Sheet>
      <div className="flex">
        {!isMobile && (
          <motion.nav
            className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)] overflow-y-auto"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4">
              <div className="space-y-1">
                {allNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        )}
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;