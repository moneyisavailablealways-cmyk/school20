import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolSection } from '@/hooks/useSchoolSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Baby, GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ClassRow {
  id: string;
  name: string;
  level_type: 'nursery' | 'primary';
}

const NurserySettings = () => {
  const { profile } = useAuth();
  const { isPrimarySchool, nurseryEnabled, refresh, loading } = useSchoolSection();
  const qc = useQueryClient();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<'nursery' | 'primary'>('nursery');
  const [busy, setBusy] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const fetchClasses = async () => {
    if (!profile?.school_id) return;
    setLoadingClasses(true);
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, level_type')
      .eq('school_id', profile.school_id)
      .order('name');
    setLoadingClasses(false);
    if (error) { toast.error(error.message); return; }
    setClasses((data as any) || []);
  };

  useEffect(() => { fetchClasses(); }, [profile?.school_id]);

  const toggleNursery = async (enabled: boolean) => {
    if (!profile?.school_id) return;
    setSavingFlag(true);
    const { error } = await supabase
      .from('schools')
      .update({ has_nursery_section: enabled } as any)
      .eq('id', profile.school_id);
    setSavingFlag(false);
    if (error) { toast.error(error.message); return; }
    toast.success(enabled ? 'Nursery section enabled' : 'Nursery section disabled');
    await refresh();
  };

  const toggleSel = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleReclassify = async () => {
    if (!profile?.school_id || selected.size === 0) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('reclassify_classes_level' as any, {
      p_school_id: profile.school_id,
      p_class_ids: Array.from(selected),
      p_level: target,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r: any = data || {};
    toast.success(`Moved to ${target}`, {
      description: `Classes: ${r.classes ?? 0} · Students: ${r.students ?? 0} · Invoices: ${r.invoices ?? 0} · Attendance: ${r.attendance ?? 0} · Reports: ${r.report_cards ?? 0}`,
    });
    setSelected(new Set());
    await fetchClasses();
    qc.invalidateQueries();
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!isPrimarySchool) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nursery Section</CardTitle>
          <CardDescription>
            The Nursery section is only available for Primary schools.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Baby className="h-7 w-7 text-pink-500" /> Nursery Section Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Enable a Nursery section inside your Primary school and classify which classes belong to it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enable Nursery Section</CardTitle>
          <CardDescription>
            When enabled, a Nursery / Primary toggle appears in every portal so users can switch the data view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="nursery-toggle"
              checked={nurseryEnabled}
              onCheckedChange={toggleNursery}
              disabled={savingFlag}
            />
            <Label htmlFor="nursery-toggle">
              {nurseryEnabled ? 'Nursery section is active' : 'Nursery section is off'}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reclassify Classes</CardTitle>
          <CardDescription>
            Select existing classes and move them (with their students, attendance, fees, invoices, payments,
            timetables and report cards) to either Nursery or Primary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label>Move selected to:</Label>
            <div className="inline-flex rounded-md border p-0.5">
              <Button
                size="sm"
                variant={target === 'nursery' ? 'default' : 'ghost'}
                onClick={() => setTarget('nursery')}
              >
                <Baby className="h-3.5 w-3.5 mr-1.5" /> Nursery
              </Button>
              <Button
                size="sm"
                variant={target === 'primary' ? 'default' : 'ghost'}
                onClick={() => setTarget('primary')}
              >
                <GraduationCap className="h-3.5 w-3.5 mr-1.5" /> Primary
              </Button>
            </div>
            <Button
              onClick={handleReclassify}
              disabled={selected.size === 0 || busy}
              className="ml-auto"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reclassify {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>

          <div className="border rounded-md divide-y">
            {loadingClasses ? (
              <div className="p-4 text-sm text-muted-foreground">Loading classes…</div>
            ) : classes.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No classes yet.</div>
            ) : (
              classes.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleSel(c.id)}
                  />
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      c.level_type === 'nursery'
                        ? 'bg-pink-100 text-pink-800 border-0'
                        : 'bg-blue-100 text-blue-800 border-0'
                    }
                  >
                    {c.level_type === 'nursery' ? 'Nursery' : 'Primary'}
                  </Badge>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NurserySettings;
