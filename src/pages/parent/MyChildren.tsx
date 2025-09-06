import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Phone, Mail, MapPin, Heart, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Student {
  id: string;
  student_id: string;
  date_of_birth: string;
  gender: string;
  address: string;
  medical_conditions: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  enrollment_status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  student_enrollments: {
    class: string;
    status: string;
  }[];
}

const MyChildren = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, [profile]);

  const fetchChildren = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('parent_student_relationships')
        .select(`
          student_id,
          relationship_type,
          is_primary_contact,
          students!inner (
            id,
            student_id,
            date_of_birth,
            gender,
            address,
            medical_conditions,
            emergency_contact_name,
            emergency_contact_phone,
            enrollment_status,
            profiles!inner (
              first_name,
              last_name,
              email,
              phone
            ),
            student_enrollments (
              class,
              status
            )
          )
        `)
        .eq('parent_id', profile.id);

      if (error) throw error;

      const childrenData = data?.map(rel => rel.students).filter(Boolean) || [];
      setChildren(childrenData as Student[]);
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children information');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Children</h1>
        <p className="text-muted-foreground">View and manage your children's information</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No Children Found</p>
            <p className="text-muted-foreground text-center">
              No children are currently associated with your account. Please contact the school administration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {child.profiles.first_name} {child.profiles.last_name}
                    </CardTitle>
                    <CardDescription>
                      Student ID: {child.student_id} • Age: {calculateAge(child.date_of_birth)}
                    </CardDescription>
                  </div>
                  <Badge variant={child.enrollment_status === 'active' ? 'default' : 'secondary'}>
                    {child.enrollment_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Born: {new Date(child.date_of_birth).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Gender: {child.gender}</span>
                  </div>
                  {child.student_enrollments?.[0] && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Class: {child.student_enrollments[0].class}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{child.profiles.email}</span>
                  </div>
                  {child.profiles.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{child.profiles.phone}</span>
                    </div>
                  )}
                  {child.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{child.address}</span>
                    </div>
                  )}
                </div>

                {child.medical_conditions && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900 dark:text-orange-100">Medical Conditions</span>
                    </div>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      {child.medical_conditions}
                    </p>
                  </div>
                )}

                {child.emergency_contact_name && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Emergency Contact</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {child.emergency_contact_name} - {child.emergency_contact_phone}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Academic Record
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyChildren;