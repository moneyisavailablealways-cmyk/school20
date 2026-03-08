import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar, Plus, Edit, Trash2, CalendarDays, Clock, GraduationCap, PartyPopper } from 'lucide-react';
import { format, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import TermCountdownWidget from '@/components/academic-calendar/TermCountdownWidget';

const EVENT_TYPES = [
  { value: 'exam', label: 'Exam Week', color: 'bg-destructive' },
  { value: 'pta', label: 'PTA Meeting', color: 'bg-primary' },
  { value: 'sports', label: 'Sports Day', color: 'bg-accent' },
  { value: 'trip', label: 'School Trip', color: 'bg-[hsl(var(--school-orange))]' },
  { value: 'cultural', label: 'Cultural Event', color: 'bg-[hsl(var(--school-blue))]' },
  { value: 'visiting', label: 'Visiting Day', color: 'bg-[hsl(var(--school-green))]' },
  { value: 'holiday', label: 'Holiday', color: 'bg-muted' },
  { value: 'general', label: 'General', color: 'bg-secondary' },
];

const AcademicCalendar = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [termForm, setTermForm] = useState({
    academic_year_id: '', term_name: '', term_number: 1,
    start_date: '', end_date: '', holiday_start_date: '', holiday_end_date: '',
    opening_day: '', closing_day: '', is_current: false,
  });
  const [eventForm, setEventForm] = useState({
    academic_term_id: '', title: '', description: '', event_type: 'general',
    start_date: '', end_date: '', is_all_day: true, target_audience: ['all'],
  });

  const schoolId = profile?.school_id;

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_years').select('*').order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: terms = [], isLoading: termsLoading } = useQuery({
    queryKey: ['academic-terms', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*, academic_years(name)')
        .eq('school_id', schoolId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['school-events', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_events')
        .select('*, academic_terms(term_name)')
        .eq('school_id', schoolId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
  });

  const { data: schoolData } = useQuery({
    queryKey: ['school-name', schoolId],
    queryFn: async () => {
      const { data } = await supabase.from('schools').select('school_name').eq('id', schoolId!).single();
      return data;
    },
    enabled: !!schoolId,
  });

  const saveTerm = useMutation({
    mutationFn: async (form: typeof termForm & { id?: string }) => {
      const payload = {
        academic_year_id: form.academic_year_id,
        school_id: schoolId!,
        term_name: form.term_name,
        term_number: form.term_number,
        start_date: form.start_date,
        end_date: form.end_date,
        holiday_start_date: form.holiday_start_date || null,
        holiday_end_date: form.holiday_end_date || null,
        opening_day: form.opening_day || null,
        closing_day: form.closing_day || null,
        is_current: form.is_current,
        created_by: profile?.id,
      };
      if (form.id) {
        const { error } = await supabase.from('academic_terms').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('academic_terms').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Term saved successfully');
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
      queryClient.invalidateQueries({ queryKey: ['current-term'] });
      setTermDialogOpen(false);
      resetTermForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('academic_terms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Term deleted');
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEvent = useMutation({
    mutationFn: async (form: typeof eventForm & { id?: string }) => {
      const payload = {
        school_id: schoolId!,
        academic_term_id: form.academic_term_id || null,
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        is_all_day: form.is_all_day,
        target_audience: form.target_audience,
        created_by: profile?.id,
      };
      if (form.id) {
        const { error } = await supabase.from('school_events').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('school_events').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Event saved');
      queryClient.invalidateQueries({ queryKey: ['school-events'] });
      setEventDialogOpen(false);
      resetEventForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('school_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['school-events'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetTermForm = () => {
    setTermForm({ academic_year_id: '', term_name: '', term_number: 1, start_date: '', end_date: '', holiday_start_date: '', holiday_end_date: '', opening_day: '', closing_day: '', is_current: false });
    setEditingTerm(null);
  };

  const resetEventForm = () => {
    setEventForm({ academic_term_id: '', title: '', description: '', event_type: 'general', start_date: '', end_date: '', is_all_day: true, target_audience: ['all'] });
    setEditingEvent(null);
  };

  const openEditTerm = (term: any) => {
    setEditingTerm(term);
    setTermForm({
      academic_year_id: term.academic_year_id,
      term_name: term.term_name,
      term_number: term.term_number,
      start_date: term.start_date,
      end_date: term.end_date,
      holiday_start_date: term.holiday_start_date || '',
      holiday_end_date: term.holiday_end_date || '',
      opening_day: term.opening_day || '',
      closing_day: term.closing_day || '',
      is_current: term.is_current,
    });
    setTermDialogOpen(true);
  };

  const openEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      academic_term_id: event.academic_term_id || '',
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date || '',
      is_all_day: event.is_all_day,
      target_audience: event.target_audience || ['all'],
    });
    setEventDialogOpen(true);
  };

  const handleSaveTerm = () => {
    if (!termForm.academic_year_id || !termForm.term_name || !termForm.start_date || !termForm.end_date) {
      toast.error('Please fill required fields');
      return;
    }
    saveTerm.mutate(editingTerm ? { ...termForm, id: editingTerm.id } : termForm);
  };

  const handleSaveEvent = () => {
    if (!eventForm.title || !eventForm.start_date) {
      toast.error('Please fill required fields');
      return;
    }
    saveEvent.mutate(editingEvent ? { ...eventForm, id: editingEvent.id } : eventForm);
  };

  const currentTerm = terms.find(t => t.is_current);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Term Calendar</h1>
          <p className="text-muted-foreground">{schoolData?.school_name || 'School'} — Manage academic terms and events</p>
        </div>
      </div>

      {/* Term Countdown Widget */}
      {schoolId && <TermCountdownWidget schoolId={schoolId} schoolName={schoolData?.school_name} />}

      <Tabs defaultValue="terms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="terms"><CalendarDays className="h-4 w-4 mr-2" />Terms</TabsTrigger>
          <TabsTrigger value="events"><PartyPopper className="h-4 w-4 mr-2" />Events</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" />Calendar View</TabsTrigger>
        </TabsList>

        {/* Terms Tab */}
        <TabsContent value="terms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Academic Terms</CardTitle>
                <CardDescription>Create and manage terms for each academic year</CardDescription>
              </div>
              <Button onClick={() => { resetTermForm(); setTermDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Term
              </Button>
            </CardHeader>
            <CardContent>
              {termsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
              ) : terms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No terms configured yet. Add your first academic term.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Holiday Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terms.map((term: any) => {
                      const today = new Date();
                      const startDate = parseISO(term.start_date);
                      const endDate = parseISO(term.end_date);
                      const daysRemaining = Math.max(0, differenceInDays(endDate, today));
                      const isActive = isWithinInterval(today, { start: startDate, end: endDate });
                      
                      return (
                        <TableRow key={term.id}>
                          <TableCell>{term.academic_years?.name || '-'}</TableCell>
                          <TableCell className="font-medium">{term.term_name}</TableCell>
                          <TableCell>{format(startDate, 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(endDate, 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {term.holiday_start_date && term.holiday_end_date
                              ? `${format(parseISO(term.holiday_start_date), 'MMM d')} - ${format(parseISO(term.holiday_end_date), 'MMM d')}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {term.is_current ? (
                              <Badge className="bg-primary text-primary-foreground">Current</Badge>
                            ) : isActive ? (
                              <Badge variant="outline" className="border-primary text-primary">Active</Badge>
                            ) : today > endDate ? (
                              <Badge variant="secondary">Completed</Badge>
                            ) : (
                              <Badge variant="outline">Upcoming</Badge>
                            )}
                            {isActive && <span className="ml-2 text-xs text-muted-foreground">{daysRemaining}d left</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditTerm(term)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete this term?')) deleteTerm.mutate(term.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>School Events</CardTitle>
                <CardDescription>Add exams, PTA meetings, sports days, and more</CardDescription>
              </div>
              <Button onClick={() => { resetEventForm(); setEventDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Event
              </Button>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PartyPopper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events added. Start adding school events.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event: any) => {
                      const evType = EVENT_TYPES.find(t => t.value === event.event_type);
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{evType?.label || event.event_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(event.start_date), 'MMM d, yyyy')}
                            {event.end_date && event.end_date !== event.start_date && ` - ${format(parseISO(event.end_date), 'MMM d')}`}
                          </TableCell>
                          <TableCell>{event.academic_terms?.term_name || '-'}</TableCell>
                          <TableCell>
                            {event.target_audience?.map((a: string) => (
                              <Badge key={a} variant="secondary" className="mr-1 text-xs">{a}</Badge>
                            ))}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditEvent(event)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete this event?')) deleteEvent.mutate(event.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Overview</CardTitle>
              <CardDescription>Visual representation of terms and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {terms.map((term: any) => {
                  const startDate = parseISO(term.start_date);
                  const endDate = parseISO(term.end_date);
                  const totalDays = differenceInDays(endDate, startDate) + 1;
                  const daysPassed = Math.max(0, Math.min(differenceInDays(new Date(), startDate), totalDays));
                  const progress = Math.round((daysPassed / totalDays) * 100);
                  const termEvents = events.filter((e: any) => e.academic_term_id === term.id);

                  return (
                    <div key={term.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-primary" />
                          <span className="font-semibold">{term.term_name}</span>
                          <span className="text-sm text-muted-foreground">({term.academic_years?.name})</span>
                          {term.is_current && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(startDate, 'MMM d')} — {format(endDate, 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <div className="w-full bg-secondary rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{daysPassed} of {totalDays} days ({progress}%)</p>

                      {termEvents.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {termEvents.map((ev: any) => {
                            const evType = EVENT_TYPES.find(t => t.value === ev.event_type);
                            return (
                              <Badge key={ev.id} variant="outline" className="text-xs">
                                {ev.title} — {format(parseISO(ev.start_date), 'MMM d')}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {terms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No terms to display</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Term Dialog */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Edit Term' : 'Add Academic Term'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year *</Label>
                <Select value={termForm.academic_year_id} onValueChange={v => setTermForm(f => ({ ...f, academic_year_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((ay: any) => (
                      <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term Name *</Label>
                <Input value={termForm.term_name} onChange={e => setTermForm(f => ({ ...f, term_name: e.target.value }))} placeholder="e.g., Term 1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term Number</Label>
                <Input type="number" min={1} max={4} value={termForm.term_number} onChange={e => setTermForm(f => ({ ...f, term_number: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={termForm.is_current} onCheckedChange={v => setTermForm(f => ({ ...f, is_current: v }))} />
                <Label>Set as Current Term</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={termForm.start_date} onChange={e => setTermForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date *</Label><Input type="date" value={termForm.end_date} onChange={e => setTermForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Opening Day</Label><Input type="date" value={termForm.opening_day} onChange={e => setTermForm(f => ({ ...f, opening_day: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Closing Day</Label><Input type="date" value={termForm.closing_day} onChange={e => setTermForm(f => ({ ...f, closing_day: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Holiday Start Date</Label><Input type="date" value={termForm.holiday_start_date} onChange={e => setTermForm(f => ({ ...f, holiday_start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Holiday End Date</Label><Input type="date" value={termForm.holiday_end_date} onChange={e => setTermForm(f => ({ ...f, holiday_end_date: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setTermDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTerm} disabled={saveTerm.isPending}>{saveTerm.isPending ? 'Saving...' : 'Save Term'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add School Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title *</Label><Input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Sports Day" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={eventForm.event_type} onValueChange={v => setEventForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={eventForm.academic_term_id} onValueChange={v => setEventForm(f => ({ ...f, academic_term_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.term_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={eventForm.start_date} onChange={e => setEventForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={eventForm.end_date} onChange={e => setEventForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent} disabled={saveEvent.isPending}>{saveEvent.isPending ? 'Saving...' : 'Save Event'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademicCalendar;
