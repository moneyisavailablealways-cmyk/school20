import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, School, Users, TrendingUp } from 'lucide-react';

const PlatformAnalytics = () => {
  const { data: schools = [] } = useQuery({
    queryKey: ['super-admin-schools'],
    queryFn: async () => {
      const { data } = await supabase.from('schools').select('*');
      return data || [];
    },
  });

  const activeSchools = schools.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground text-sm">Overview of the School20 SaaS platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <School className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{schools.length}</p>
                <p className="text-sm text-muted-foreground">Total Schools</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{activeSchools}</p>
                <p className="text-sm text-muted-foreground">Active Schools</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">SaaS</p>
                <p className="text-sm text-muted-foreground">Platform Mode</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Breakdown by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['active', 'suspended', 'pending'].map(status => {
              const count = schools.filter(s => s.status === status).length;
              const pct = schools.length ? Math.round((count / schools.length) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-20 text-sm capitalize text-muted-foreground">{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${status === 'active' ? 'bg-green-500' : status === 'suspended' ? 'bg-red-500' : 'bg-yellow-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAnalytics;
