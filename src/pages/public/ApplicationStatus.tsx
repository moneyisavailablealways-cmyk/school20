import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ApplicationStatus: React.FC = () => {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [appNo, setAppNo] = useState('');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('check-application-status', {
        body: { application_number: appNo || undefined, phone: phone || undefined, school_slug: schoolSlug },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResults((data as any).results || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader><CardTitle>Check Application Status</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={search} className="space-y-3">
            <div><Label>Application Number</Label><Input value={appNo} onChange={(e) => setAppNo(e.target.value)} placeholder="APP-2026-000001" /></div>
            <p className="text-center text-xs text-muted-foreground">or</p>
            <div><Label>Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Searching…' : 'Search'}</Button>
          </form>
          {err && <p className="text-red-600 mt-3 text-sm">{err}</p>}
          {results && (
            <div className="mt-4 space-y-3">
              {results.length === 0 && <p className="text-sm text-muted-foreground">No matching application.</p>}
              {results.map((r) => (
                <div key={r.application_number} className="border rounded p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono">{r.application_number}</span>
                    <Badge>{r.stage?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-muted-foreground">{r.student_name} — {r.class_applying_for}</div>
                  {r.interview_at && <div className="text-xs mt-1">Interview: {new Date(r.interview_at).toLocaleString()}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationStatus;
