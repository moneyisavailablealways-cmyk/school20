import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CheckCircle2, AlertTriangle, Clock, Shield } from 'lucide-react';

interface AttendanceLogsProps {
  schoolId?: string;
}

const AttendanceLogs = ({ schoolId }: AttendanceLogsProps) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['signature-attendance-logs', schoolId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_attendance_logs')
        .select(`
          id, date, check_in_time, status, verification_status, similarity_score, parent_notified,
          students:student_id (
            student_id,
            profiles:profile_id (first_name, last_name)
          )
        `)
        .eq('school_id', schoolId)
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'mismatch':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />Mismatch</Badge>;
      case 'no_reference':
        return <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />New</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Signature Attendance</CardTitle>
        <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')} — {logs?.length || 0} students checked in</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.map((log: any) => {
              const student = log.students;
              const profile = student?.profiles;
              return (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID: {student?.student_id} • {format(new Date(log.check_in_time), 'hh:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getVerificationBadge(log.verification_status)}
                    {log.parent_notified && (
                      <Badge variant="outline" className="text-xs">📩</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students have checked in today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceLogs;
