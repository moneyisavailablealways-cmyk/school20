import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Search, QrCode, PenTool, CheckCircle2, AlertTriangle, UserCheck, Users, CalendarDays, Shield } from 'lucide-react';
import SignatureCapture from '@/components/signature-attendance/SignatureCapture';
import AttendanceLogs from '@/components/signature-attendance/AttendanceLogs';

const SignatureAttendance = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'identify' | 'signature' | 'success'>('identify');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('mark');
  const [lastResult, setLastResult] = useState<any>(null);

  const schoolId = profile?.school_id;

  // Search for student by student_id
  const searchStudent = useMutation({
    mutationFn: async (searchValue: string) => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, student_id, school_id,
          profiles:profile_id (id, first_name, last_name, avatar_url),
          student_enrollments (
            class_id,
            classes:class_id (name)
          )
        `)
        .eq('school_id', schoolId)
        .or(`student_id.ilike.%${searchValue}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Student not found');
      return data;
    },
    onSuccess: (data) => {
      setSelectedStudent(data);
      setStep('signature');
    },
    onError: (error: any) => {
      toast({ title: 'Student Not Found', description: error.message, variant: 'destructive' });
    }
  });

  // Mark attendance via edge function
  const markAttendance = useMutation({
    mutationFn: async (signatureData: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('mark-signature-attendance', {
        body: {
          student_id: selectedStudent.id,
          signature_image: signatureData,
          school_id: schoolId,
        }
      });

      if (response.error) throw new Error(response.error.message || 'Failed to mark attendance');
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setLastResult(data.attendance);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['signature-attendance-logs'] });
      toast({ title: '✅ Attendance Recorded', description: `${data.attendance.student_name} marked present` });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleSearch = () => {
    if (!studentIdInput.trim()) {
      toast({ title: 'Enter Student ID', description: 'Please enter a student ID or scan QR code', variant: 'destructive' });
      return;
    }
    searchStudent.mutate(studentIdInput.trim());
  };

  const handleSignatureSubmit = (signatureData: string) => {
    markAttendance.mutate(signatureData);
  };

  const resetFlow = () => {
    setStep('identify');
    setStudentIdInput('');
    setSelectedStudent(null);
    setLastResult(null);
  };

  const studentProfile = selectedStudent?.profiles;
  const className = selectedStudent?.student_enrollments?.[0]?.classes?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signature Attendance</h1>
        <p className="text-muted-foreground">Mark attendance using student ID and signature verification</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mark" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today's Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="mt-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {['Identify Student', 'Capture Signature', 'Confirmed'].map((label, i) => {
              const stepMap = ['identify', 'signature', 'success'];
              const currentIdx = stepMap.indexOf(step);
              const isActive = i === currentIdx;
              const isDone = i < currentIdx;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isDone ? 'bg-primary text-primary-foreground' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm hidden sm:inline ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-border" />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Identify Student */}
          {step === 'identify' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Student Identification
                </CardTitle>
                <CardDescription>Enter student ID number or scan QR code</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Student ID (e.g., STU-001)"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="text-lg h-12"
                    autoFocus
                  />
                  <Button onClick={handleSearch} disabled={searchStudent.isPending} size="lg">
                    {searchStudent.isPending ? 'Searching...' : 'Find'}
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <QrCode className="h-4 w-4" />
                    QR scanner support coming soon
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Signature Capture */}
          {step === 'signature' && selectedStudent && (
            <div className="space-y-4">
              {/* Student Info Card */}
              <Card>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {studentProfile?.avatar_url ? (
                      <img src={studentProfile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <UserCheck className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {studentProfile?.first_name} {studentProfile?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {selectedStudent.student_id} • Class: {className || 'N/A'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetFlow}>
                    Change Student
                  </Button>
                </CardContent>
              </Card>

              {/* Signature Pad */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Capture Signature
                  </CardTitle>
                  <CardDescription>Student must sign below to confirm attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <SignatureCapture
                    onSubmit={handleSignatureSubmit}
                    isSubmitting={markAttendance.isPending}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && lastResult && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="py-8 text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Attendance Recorded Successfully</h2>
                <p className="text-muted-foreground text-lg">{lastResult.student_name}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Badge variant="outline" className="text-sm py-1">
                    ⏰ {lastResult.check_in_time}
                  </Badge>
                  <Badge
                    className={
                      lastResult.verification_status === 'verified'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : lastResult.verification_status === 'mismatch'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {lastResult.verification_status === 'verified' ? 'Signature Verified' :
                     lastResult.verification_status === 'mismatch' ? 'Signature Mismatch' : 'New Signature Stored'}
                  </Badge>
                  {lastResult.parent_notified && (
                    <Badge variant="secondary" className="text-sm py-1">
                      📩 Parents Notified
                    </Badge>
                  )}
                </div>
                <Button onClick={resetFlow} size="lg" className="mt-4">
                  Mark Next Student
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <AttendanceLogs schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignatureAttendance;
