import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import TeacherLayout from "@/components/TeacherLayout";
import StudentLayout from "@/components/StudentLayout";
import PrincipalLayout from "@/components/PrincipalLayout";
import HeadTeacherLayout from "@/components/HeadTeacherLayout";
import BursarLayout from "@/components/BursarLayout";
import ParentLayout from "@/components/ParentLayout";
import LibraryLayout from "@/components/LibraryLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import AcademicStructure from "./pages/admin/AcademicStructure";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyClasses from "./pages/teacher/MyClasses";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import Schedule from "./pages/teacher/Schedule";
import StudentDashboard from "./pages/student/StudentDashboard";
import PrincipalDashboard from "./pages/principal/PrincipalDashboard";
import PerformanceAnalytics from "./pages/principal/PerformanceAnalytics";
import ApprovalsCenter from "./pages/principal/ApprovalsCenter";
import HeadTeacherDashboard from "./pages/head-teacher/HeadTeacherDashboard";
import TeacherSupervision from "./pages/head-teacher/TeacherSupervision";
import MarksApproval from "./pages/head-teacher/MarksApproval";
import BursarDashboard from "./pages/bursar/BursarDashboard";
import FeeStructures from "./pages/bursar/FeeStructures";
import ParentDashboard from "./pages/parent/ParentDashboard";
import LibraryDashboard from "./pages/library/LibraryDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'principal']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="academic" element={<AcademicStructure />} />
            </Route>
            
            {/* Teacher Routes */}
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin', 'principal']}>
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<MyClasses />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="profile" element={<TeacherProfile />} />
            </Route>
            
            {/* Head Teacher Routes */}
            <Route 
              path="/head-teacher" 
              element={
                <ProtectedRoute allowedRoles={['head_teacher', 'admin', 'principal']}>
                  <HeadTeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HeadTeacherDashboard />} />
              <Route path="supervision" element={<TeacherSupervision />} />
              <Route path="marks" element={<MarksApproval />} />
            </Route>
            
            {/* Student Routes */}
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
            </Route>
            
            {/* Bursar Routes */}
            <Route 
              path="/bursar" 
              element={
                <ProtectedRoute allowedRoles={['bursar', 'admin', 'principal']}>
                  <BursarLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<BursarDashboard />} />
              <Route path="fee-structures" element={<FeeStructures />} />
            </Route>

            {/* Parent Routes */}
            <Route 
              path="/parent" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ParentDashboard />} />
            </Route>

            {/* Library Routes */}
            <Route 
              path="/library" 
              element={
                <ProtectedRoute allowedRoles={['librarian', 'admin', 'principal']}>
                  <LibraryLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<LibraryDashboard />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
