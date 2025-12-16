import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Lock, Unlock, Settings, Users, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface AttendanceManagementProps {
  title?: string;
  description?: string;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  title = "Attendance Management",
  description = "Manage attendance records, settings, and view reports"
}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Fetch all classes
  const { data: classes } = useQuery({
    queryKey: ['all-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name').order('name');
      return data || [];
    }
  });

  // Fetch attendance settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('attendance_settings').select('*').single();
      return data;
    }
  });

  // Fetch attendance records for date/class
  const { data: attendanceRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-attendance', selectedClass, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          students!inner (
            id,
            student_id,
            profiles!inner (first_name, last_name)
          )
        `)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'));

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
    enabled: true
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['attendance-audit-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);
      return data || [];
    }
  });

  // Fetch attendance stats
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', selectedClass, format(selectedDate, 'yyyy-MM')],
    queryFn: async () => {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      let query = supabase
        .from('attendance_records')
        .select('status')
        .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth, 'yyyy-MM-dd'));

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      const { data } = await query;
      
      if (!data) return { present: 0, absent: 0, late: 0, total: 0 };

      return {
        present: data.filter(r => r.status === 'present').length,
        absent: data.filter(r => r.status === 'absent').length,
        late: data.filter(r => r.status === 'late').length,
        total: data.length
      };
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const { error } = await supabase
        .from('attendance_settings')
        .update(updates)
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    }
  });

  // Lock/Unlock attendance mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ recordIds, lock }: { recordIds: string[]; lock: boolean }) => {
      const { error } = await supabase
        .from('attendance_records')
        .update({
          is_locked: lock,
          locked_at: lock ? new Date().toISOString() : null,
          locked_by: lock ? profile?.id : null,
          last_modified_by: profile?.id,
          last_modified_at: new Date().toISOString()
        })
        .in('id', recordIds);
      
      if (error) throw error;
    },
    onSuccess: (_, { lock }) => {
      toast.success(lock ? 'Attendance locked' : 'Attendance unlocked');
      queryClient.invalidateQueries({ queryKey: ['admin-attendance'] });
    }
  });

  // Override attendance mutation
  const overrideMutation = useMutation({
    mutationFn: async ({ recordId, newStatus, reason }: { recordId: string; newStatus: string; reason: string }) => {
      const { error } = await supabase
        .from('attendance_records')
        .update({
          status: newStatus,
          last_modified_by: profile?.id,
          last_modified_at: new Date().toISOString(),
          remarks: reason
        })
        .eq('id', recordId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attendance overridden');
      setOverrideReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-attendance'] });
    }
  });

  const getStatusBadge = (status: string, isLocked: boolean) => {
    const lockIcon = isLocked ? <Lock className="h-3 w-3 ml-1" /> : null;
    
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Present {lockIcon}</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent {lockIcon}</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Late {lockIcon}</Badge>;
      case 'excused':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Excused {lockIcon}</Badge>;
      default:
        return <Badge variant="secondary">{status} {lockIcon}</Badge>;
    }
  };

  const lockedRecords = attendanceRecords?.filter(r => r.is_locked) || [];
  const unlockedRecords = attendanceRecords?.filter(r => !r.is_locked) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Class Filter</label>
                  <Select value={selectedClass || "all"} onValueChange={(val) => setSelectedClass(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes?.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end gap-2">
                  {unlockedRecords.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => toggleLockMutation.mutate({ 
                        recordIds: unlockedRecords.map(r => r.id), 
                        lock: true 
                      })}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Lock All
                    </Button>
                  )}
                  {lockedRecords.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => toggleLockMutation.mutate({ 
                        recordIds: lockedRecords.map(r => r.id), 
                        lock: false 
                      })}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock All
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Records ({attendanceRecords?.length || 0})</CardTitle>
              <CardDescription>Records for {format(selectedDate, 'PPPP')}</CardDescription>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {attendanceRecords.map(record => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {record.students.profiles.first_name} {record.students.profiles.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.students.student_id} • {record.session}
                        </p>
                        {record.remarks && (
                          <p className="text-sm text-muted-foreground mt-1">{record.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(record.status, record.is_locked)}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                            >
                              Override
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Override Attendance</DialogTitle>
                              <DialogDescription>
                                Change attendance status for {record.students.profiles.first_name} {record.students.profiles.last_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <label className="text-sm font-medium">New Status</label>
                                <Select
                                  defaultValue={record.status}
                                  onValueChange={(val) => setSelectedRecord({ ...record, newStatus: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                    <SelectItem value="late">Late</SelectItem>
                                    <SelectItem value="excused">Excused</SelectItem>
                                    <SelectItem value="left_early">Left Early</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Reason for Override</label>
                                <Input
                                  value={overrideReason}
                                  onChange={(e) => setOverrideReason(e.target.value)}
                                  placeholder="Enter reason..."
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => overrideMutation.mutate({
                                  recordId: selectedRecord?.id,
                                  newStatus: selectedRecord?.newStatus || record.status,
                                  reason: overrideReason
                                })}
                                disabled={!overrideReason}
                              >
                                Confirm Override
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records for this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Attendance Settings
              </CardTitle>
              <CardDescription>Configure attendance marking rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Multiple Sessions</p>
                      <p className="text-sm text-muted-foreground">Allow morning/afternoon attendance</p>
                    </div>
                    <Switch
                      checked={settings?.enable_multiple_sessions || false}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ enable_multiple_sessions: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Lock Attendance</p>
                      <p className="text-sm text-muted-foreground">Automatically lock at configured time</p>
                    </div>
                    <Switch
                      checked={settings?.auto_lock_enabled || false}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ auto_lock_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Future Attendance</p>
                      <p className="text-sm text-muted-foreground">Allow marking attendance for future dates</p>
                    </div>
                    <Switch
                      checked={settings?.allow_future_attendance || false}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ allow_future_attendance: checked })}
                    />
                  </div>

                  <div>
                    <label className="font-medium">Lock Time</label>
                    <p className="text-sm text-muted-foreground mb-2">Time after which attendance locks</p>
                    <Input
                      type="time"
                      value={settings?.lock_time || '18:00:00'}
                      onChange={(e) => updateSettingsMutation.mutate({ lock_time: e.target.value })}
                      className="w-48"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">{format(selectedDate, 'MMMM yyyy')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{attendanceStats?.present || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceStats?.total ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{attendanceStats?.absent || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceStats?.total ? Math.round((attendanceStats.absent / attendanceStats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats?.late || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceStats?.total ? Math.round((attendanceStats.late / attendanceStats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Overview
              </CardTitle>
              <CardDescription>Attendance trends for {format(selectedDate, 'MMMM yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Detailed charts coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>Track all attendance changes</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">{log.action}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.changed_at).toLocaleString()}
                        </span>
                      </div>
                      {log.old_status && log.new_status && (
                        <p className="text-sm mt-2">
                          Status: <span className="text-muted-foreground">{log.old_status}</span>
                          {' → '}
                          <span className="font-medium">{log.new_status}</span>
                        </p>
                      )}
                      {log.reason && (
                        <p className="text-sm text-muted-foreground mt-1">Reason: {log.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit records yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceManagement;
