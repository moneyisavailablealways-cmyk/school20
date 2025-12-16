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
  enrollment_status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  student_enrollments: {
    class_name: string;
    stream_name: string | null;
    status: string;
  }[];
  medical_info?: {
    medical_conditions?: string;
    allergies?: string;
    medications?: string;
    dietary_requirements?: string;
    special_needs?: string;
  };
  emergency_contacts?: {
    contact_name: string;
    contact_phone: string;
    contact_relationship?: string;
    is_primary_contact: boolean;
  }[];
}

const MyChildren = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();

    // Set up real-time subscriptions
    const parentRelationshipsChannel = supabase
      .channel('parent-student-relationships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_student_relationships',
          filter: `parent_id=eq.${profile?.id}`
        },
        () => {
          console.log('Parent-student relationships changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    const studentsChannel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        () => {
          console.log('Students data changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Profiles changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    const medicalChannel = supabase
      .channel('medical-info-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_medical_info'
        },
        () => {
          console.log('Medical info changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    const emergencyContactsChannel = supabase
      .channel('emergency-contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_emergency_contacts'
        },
        () => {
          console.log('Emergency contacts changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    const enrollmentsChannel = supabase
      .channel('enrollments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_enrollments'
        },
        () => {
          console.log('Enrollments changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(parentRelationshipsChannel);
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(medicalChannel);
      supabase.removeChannel(emergencyContactsChannel);
      supabase.removeChannel(enrollmentsChannel);
    };
  }, [profile]);

  const fetchChildren = async () => {
    if (!profile?.id) {
      console.log('No profile ID found');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Fetching children for parent profile ID:', profile.id);
      
      // Get the student relationships - use profile.id directly as parent_id
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('parent_student_relationships')
        .select('student_id, relationship_type, is_primary_contact')
        .eq('parent_id', profile.id);

      if (relationshipsError) {
        console.error('Error fetching relationships:', relationshipsError);
        throw relationshipsError;
      }

      console.log('Found relationships:', relationshipsData);
      console.log('Number of children found:', relationshipsData?.length || 0);

      if (!relationshipsData || relationshipsData.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // Fetch detailed student information for each relationship
      const enrichedChildren = await Promise.all(
        relationshipsData.map(async (rel) => {
          // Fetch student basic info
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('id', rel.student_id)
            .single();

          if (studentError || !studentData) {
            console.error('Error fetching student:', studentError);
            return null;
          }

          // Fetch student profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone')
            .eq('id', studentData.profile_id)
            .maybeSingle();

          // Fetch enrollments with class and stream info
          const { data: enrollmentData } = await supabase
            .from('student_enrollments')
            .select(`
              status,
              class_id,
              stream_id
            `)
            .eq('student_id', studentData.id)
            .eq('status', 'active');

          // Fetch class names for enrollments
          let classMap: Record<string, string> = {};
          let streamMap: Record<string, string> = {};
          
          if (enrollmentData && enrollmentData.length > 0) {
            const classIds = enrollmentData.map(e => e.class_id).filter(Boolean);
            const streamIds = enrollmentData.map(e => e.stream_id).filter(Boolean);
            
            if (classIds.length > 0) {
              const { data: classesData } = await supabase
                .from('classes')
                .select('id, name')
                .in('id', classIds);
              
              if (classesData) {
                classesData.forEach(c => { classMap[c.id] = c.name; });
              }
            }
            
            if (streamIds.length > 0) {
              const { data: streamsData } = await supabase
                .from('streams')
                .select('id, name')
                .in('id', streamIds);
              
              if (streamsData) {
                streamsData.forEach(s => { streamMap[s.id] = s.name; });
              }
            }
          }

          // Fetch medical info
          const { data: medicalData } = await supabase
            .from('student_medical_info')
            .select('*')
            .eq('student_id', studentData.id)
            .maybeSingle();

          // Fetch emergency contacts  
          const { data: emergencyData } = await supabase
            .from('student_emergency_contacts')
            .select('*')
            .eq('student_id', studentData.id)
            .order('is_primary_contact', { ascending: false });

          return {
            ...studentData,
            profiles: profileData || { first_name: 'Name', last_name: 'Not Available', email: '', phone: '' },
            student_enrollments: enrollmentData?.map(enrollment => ({
              class_name: enrollment.class_id ? classMap[enrollment.class_id] || 'Unknown Class' : 'Not Assigned',
              stream_name: enrollment.stream_id ? streamMap[enrollment.stream_id] || null : null,
              status: enrollment.status
            })) || [],
            medical_info: medicalData || undefined,
            emergency_contacts: emergencyData || []
          };
        })
      );

      const validChildren = enrichedChildren.filter(Boolean);
      console.log('Final enriched children:', validChildren.length);
      setChildren(validChildren as Student[]);
      
      if (validChildren.length > 0) {
        toast.success(`Successfully loaded ${validChildren.length} child${validChildren.length > 1 ? 'ren' : ''}`);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children information');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string | null | undefined): string => {
    if (!birthDate) return 'Age not available';
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      if (isNaN(birth.getTime())) return 'Age not available';
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} years`;
    } catch {
      return 'Age not available';
    }
  };

  const getClassDisplay = (child: Student): string => {
    const enrollment = child.student_enrollments?.[0];
    if (!enrollment) return 'Not enrolled';
    const className = enrollment.class_name || 'Unknown Class';
    const streamName = enrollment.stream_name;
    return streamName ? `${className} – ${streamName}` : className;
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
                    <CardDescription className="mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="font-medium">Class: {getClassDisplay(child)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Age: {calculateAge(child.date_of_birth)}</span>
                      </div>
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
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Student ID: {child.student_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Gender: {child.gender || 'Not specified'}</span>
                  </div>
                  {child.date_of_birth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Born: {new Date(child.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}
                  {child.profiles.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{child.profiles.email}</span>
                    </div>
                  )}
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

                {child.medical_info && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900 dark:text-orange-100">Medical Information</span>
                    </div>
                    <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                      {child.medical_info.medical_conditions && (
                        <p><strong>Conditions:</strong> {child.medical_info.medical_conditions}</p>
                      )}
                      {child.medical_info.allergies && (
                        <p><strong>Allergies:</strong> {child.medical_info.allergies}</p>
                      )}
                      {child.medical_info.medications && (
                        <p><strong>Medications:</strong> {child.medical_info.medications}</p>
                      )}
                    </div>
                  </div>
                )}

                {child.emergency_contacts && child.emergency_contacts.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Emergency Contacts</span>
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {child.emergency_contacts.map((contact, index) => (
                        <p key={index}>
                          <strong>{contact.contact_name}</strong>
                          {contact.contact_relationship && ` (${contact.contact_relationship})`}
                          : {contact.contact_phone}
                          {contact.is_primary_contact && (
                            <span className="ml-2 text-xs bg-blue-200 dark:bg-blue-800 px-1 rounded">Primary</span>
                          )}
                        </p>
                      ))}
                    </div>
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