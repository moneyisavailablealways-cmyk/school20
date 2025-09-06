import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import StudentDashboard from '@/pages/student/StudentDashboard';
import HeadTeacherDashboard from '@/pages/head-teacher/HeadTeacherDashboard';
import LibrarianDashboard from '@/pages/librarian/LibrarianDashboard';
import BursarDashboard from '@/pages/bursar/BursarDashboard';
import ParentDashboard from '@/pages/parent/ParentDashboard';
import LibraryDashboard from '@/pages/library/LibraryDashboard';

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render role-specific dashboard
  switch (profile.role) {
    case 'admin':
    case 'principal':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    case 'head_teacher':
      return <HeadTeacherDashboard />;
    case 'librarian':
      return <LibrarianDashboard />;
    case 'bursar':
      return <BursarDashboard />;
    case 'parent':
      return <ParentDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">
              Invalid role detected. Please contact your administrator.
            </p>
          </div>
        </div>
      );
  }
};

export default Dashboard;