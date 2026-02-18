import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { School, Users, Activity, TrendingUp, Plus, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const { data: schools = [] } = useQuery({
    queryKey: ['super-admin-schools'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeSchools = schools.filter(s => s.status === 'active').length;
  const suspendedSchools = schools.filter(s => s.status === 'suspended').length;

  const stats = [
    { label: 'Total Schools', value: schools.length, icon: School, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Schools', value: activeSchools, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Suspended', value: suspendedSchools, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Platform Users', value: '—', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all schools on the School20 SaaS platform</p>
        </div>
        <Button
          onClick={() => navigate('/super-admin/schools')}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Add School
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schools List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-violet-600" />
            Registered Schools
          </CardTitle>
          <CardDescription>All schools registered on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {schools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No schools registered yet</p>
              <Button variant="outline" className="mt-3" onClick={() => navigate('/super-admin/schools')}>
                Add First School
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {schools.map((school) => (
                <div
                  key={school.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {school.school_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{school.school_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Code: <span className="font-mono">{school.school_code}</span> · {school.country}
                        {school.created_at && ` · Joined ${format(new Date(school.created_at), 'MMM yyyy')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={school.status === 'active' ? 'default' : 'destructive'}
                      className={school.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                    >
                      {school.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/super-admin/schools')}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
