import { TeacherAttendanceManagement } from '@/components/teacher-attendance';

const TeacherMyAttendance = () => {
  return (
    <TeacherAttendanceManagement 
      title="My Attendance"
      description="View your attendance history and submit leave requests"
      isTeacherView={true}
    />
  );
};

export default TeacherMyAttendance;
