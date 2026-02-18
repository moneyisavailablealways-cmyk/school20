import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users } from 'lucide-react';

const PlatformUsers = () => {
  const [search, setSearch] = useState('');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, schools(school_name, school_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = profiles.filter(p =>
    `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-blue-100 text-blue-800',
    principal: 'bg-indigo-100 text-indigo-800',
    head_teacher: 'bg-purple-100 text-purple-800',
    teacher: 'bg-green-100 text-green-800',
    student: 'bg-yellow-100 text-yellow-800',
    parent: 'bg-orange-100 text-orange-800',
    bursar: 'bg-cyan-100 text-cyan-800',
    librarian: 'bg-teal-100 text-teal-800',
    super_admin: 'bg-violet-100 text-violet-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Users</h1>
        <p className="text-muted-foreground text-sm">All users across all schools</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Users ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{profile.first_name} {profile.last_name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(profile as any).schools && (
                      <span className="text-xs text-muted-foreground">{(profile as any).schools.school_name}</span>
                    )}
                    <Badge className={`text-xs ${roleColors[profile.role] || 'bg-gray-100 text-gray-800'}`}>
                      {profile.role?.replace('_', ' ')}
                    </Badge>
                    <Badge variant={profile.is_active ? 'default' : 'destructive'} className="text-xs">
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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

export default PlatformUsers;
