import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Edit3, 
  Save, 
  X,
  GraduationCap,
  Users
} from 'lucide-react';

const StudentProfile = () => {
  const { profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-profile', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profiles:profile_id (
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          ),
          student_enrollments (
            *,
            classes:class_id (
              name,
              level
            ),
            sections:section_id (
              name
            ),
            academic_years:academic_year_id (
              name,
              is_current
            )
          )
        `)
        .eq('profile_id', profile?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id
  });

  const { data: parentRelationships } = useQuery({
    queryKey: ['student-parents', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return [];
      
      const { data, error } = await supabase
        .from('parent_student_relationships')
        .select('*')
        .eq('student_id', studentData.id);

      if (error) throw error;
      
      // Get parent details separately 
      const parentPromises = (data || []).map(async (relationship) => {
        const { data: parentData } = await supabase
          .from('parents')
          .select(`
            *,
            profiles:profile_id (
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('id', relationship.parent_id)
          .single();

        return {
          ...relationship,
          parents: parentData
        };
      });

      const enrichedData = await Promise.all(parentPromises);
      return enrichedData;
    },
    enabled: !!studentData?.id
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await updateProfile(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const handleEdit = () => {
    setEditForm({
      first_name: studentData?.profiles?.first_name || '',
      last_name: studentData?.profiles?.last_name || '',
      email: studentData?.profiles?.email || '',
      phone: studentData?.profiles?.phone || ''
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            View and update your personal information
          </p>
        </div>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentEnrollment = studentData?.student_enrollments?.find(
    (enrollment) => enrollment.academic_years?.is_current
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            View and update your personal information
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={handleEdit} variant="outline">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="space-x-2">
            <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleCancel} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={studentData?.profiles?.avatar_url} />
              <AvatarFallback className="text-lg">
                {studentData?.profiles?.first_name?.[0]}{studentData?.profiles?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">
                {studentData?.profiles?.first_name} {studentData?.profiles?.last_name}
              </h3>
              <p className="text-muted-foreground">Student ID: {studentData?.student_id}</p>
              {studentData?.admission_number && (
                <p className="text-muted-foreground">Admission No: {studentData.admission_number}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              {isEditing ? (
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{studentData?.profiles?.first_name || 'Not set'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              {isEditing ? (
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{studentData?.profiles?.last_name || 'Not set'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{studentData?.profiles?.email || 'Not set'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{studentData?.profiles?.phone || 'Not set'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {studentData?.date_of_birth 
                    ? new Date(studentData.date_of_birth).toLocaleDateString()
                    : 'Not set'
                  }
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{studentData?.gender || 'Not set'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/50">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{studentData?.address || 'Not set'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enrollment Status</Label>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <Badge variant={studentData?.enrollment_status === 'active' ? 'default' : 'secondary'}>
                  {studentData?.enrollment_status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      {currentEnrollment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Current Class</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span>{currentEnrollment.classes?.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Class Level</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span>Level {currentEnrollment.classes?.level}</span>
                </div>
              </div>

              {currentEnrollment.sections && (
                <div className="space-y-2">
                  <Label>Section</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <span>{currentEnrollment.sections.name}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Academic Year</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span>{currentEnrollment.academic_years?.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Enrollment Date</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(currentEnrollment.enrollment_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admission Date</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(studentData?.admission_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent/Guardian Information */}
      {parentRelationships && parentRelationships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent/Guardian Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parentRelationships.map((relationship) => (
                <div key={relationship.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">
                      {relationship.parents?.profiles?.first_name} {relationship.parents?.profiles?.last_name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{relationship.relationship_type}</Badge>
                      {relationship.is_primary_contact && (
                        <Badge variant="default">Primary Contact</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{relationship.parents?.profiles?.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{relationship.parents?.profiles?.phone || 'Not set'}</span>
                    </div>
                    {relationship.parents?.occupation && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{relationship.parents.occupation}</span>
                      </div>
                    )}
                    {relationship.parents?.workplace && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{relationship.parents.workplace}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact */}
      {studentData?.emergency_contact_name && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{studentData.emergency_contact_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{studentData.emergency_contact_phone}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Information */}
      {studentData?.medical_conditions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <div className="p-3 border rounded-md bg-muted/50">
                <span>{studentData.medical_conditions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentProfile;