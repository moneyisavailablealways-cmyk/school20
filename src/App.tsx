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
import LibrarianLayout from "@/components/LibrarianLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import AcademicStructure from "./pages/admin/AcademicStructure";
import Admissions from "./pages/admin/Admissions";
import Timetable from "./pages/admin/Timetable";
import Reports from "./pages/admin/Reports";
import Communications from "./pages/admin/Communications";
import Settings from "./pages/admin/Settings";
import StudentForm from "./pages/admin/StudentForm";
import AddTeacher from "./pages/admin/AddTeacher";
import AddParent from "./pages/admin/AddParent";
import TeacherManagement from "./pages/admin/TeacherManagement";
import ParentManagement from "./pages/admin/ParentManagement";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyClasses from "./pages/teacher/MyClasses";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import Schedule from "./pages/teacher/Schedule";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentSubjects from "./pages/student/StudentSubjects";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentGrades from "./pages/student/StudentGrades";
import StudentLibrary from "./pages/student/StudentLibrary";
import StudentProfile from "./pages/student/StudentProfile";
import PrincipalDashboard from "./pages/principal/PrincipalDashboard";
import PerformanceAnalytics from "./pages/principal/PerformanceAnalytics";
import ApprovalsCenter from "./pages/principal/ApprovalsCenter";
import HeadTeacherDashboard from "./pages/head-teacher/HeadTeacherDashboard";
import TeacherSupervision from "./pages/head-teacher/TeacherSupervision";
import MarksApproval from "./pages/head-teacher/MarksApproval";
import DisciplineRecords from "./pages/head-teacher/DisciplineRecords";
import TimetableManagement from "./pages/head-teacher/TimetableManagement";
import AcademicReports from "./pages/head-teacher/AcademicReports";
import HeadTeacherProfile from "./pages/head-teacher/HeadTeacherProfile";
import BursarDashboard from "./pages/bursar/BursarDashboard";
import FeeStructures from "./pages/bursar/FeeStructures";
import Invoices from "./pages/bursar/Invoices";
import Payments from "./pages/bursar/Payments";
import Scholarships from "./pages/bursar/Scholarships";
import BursarReports from "./pages/bursar/Reports";
import BursarProfile from "./pages/bursar/BursarProfile";
import ParentDashboard from './pages/parent/ParentDashboard';
import MyChildren from './pages/parent/MyChildren';
import Attendance from './pages/parent/Attendance';
import ReportsGrades from './pages/parent/ReportsGrades';
import FeesPayments from './pages/parent/FeesPayments';
import Appointments from './pages/parent/Appointments';
import Announcements from './pages/parent/Announcements';
import ParentProfile from './pages/parent/ParentProfile';
import LibrarianDashboard from "./pages/librarian/LibrarianDashboard";
import LibraryCatalog from "./pages/librarian/LibraryCatalog";
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
              <Route path="teachers" element={<TeacherManagement />} />
              <Route path="add-teacher" element={<AddTeacher />} />
              <Route path="parents" element={<ParentManagement />} />
              <Route path="add-parent" element={<AddParent />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="academic" element={<AcademicStructure />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="timetable" element={<Timetable />} />
              <Route path="reports" element={<Reports />} />
              <Route path="communications" element={<Communications />} />
              <Route path="settings" element={<Settings />} />
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
              <Route path="discipline" element={<DisciplineRecords />} />
              <Route path="timetable" element={<TimetableManagement />} />
              <Route path="reports" element={<AcademicReports />} />
              <Route path="profile" element={<HeadTeacherProfile />} />
            </Route>
            
            {/* Student Routes */}
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRoles={['student', 'admin', 'principal']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
              <Route path="subjects" element={<StudentSubjects />} />
              <Route path="schedule" element={<StudentSchedule />} />
              <Route path="grades" element={<StudentGrades />} />
              <Route path="library" element={<StudentLibrary />} />
              <Route path="profile" element={<StudentProfile />} />
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
              <Route path="invoices" element={<Invoices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="scholarships" element={<Scholarships />} />
              <Route path="reports" element={<BursarReports />} />
              <Route path="profile" element={<BursarProfile />} />
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
              <Route path="children" element={<MyChildren />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="reports" element={<ReportsGrades />} />
              <Route path="payments" element={<FeesPayments />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="profile" element={<ParentProfile />} />
            </Route>

            {/* Librarian Routes */}
            <Route 
              path="/librarian" 
              element={
                <ProtectedRoute allowedRoles={['librarian', 'admin', 'principal']}>
                  <LibrarianLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<LibrarianDashboard />} />
              <Route path="catalog" element={<LibraryCatalog />} />
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
