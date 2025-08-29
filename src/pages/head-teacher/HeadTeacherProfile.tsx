import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Building, GraduationCap, Calendar, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeacherDetails {
  id: string;
  employee_id: string;
  department: string;
  qualification: string;
  specialization: string;
  experience_years: number;
  salary: number;
  joining_date: string;
  is_class_teacher: boolean;
}

const HeadTeacherProfile = () => {
  const { profile, updateProfile } = useAuth();
  const [teacherDetails, setTeacherDetails] = useState<TeacherDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    qualification: '',
    specialization: '',
    experience_years: 0,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        department: '',
        qualification: '',
        specialization: '',
        experience_years: 0,
      });
      fetchTeacherDetails();
    }
  }, [profile]);

  const fetchTeacherDetails = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching teacher details:', error);
        return;
      }

      if (data) {
        setTeacherDetails(data);
        setFormData(prev => ({
          ...prev,
          department: data.department || '',
          qualification: data.qualification || '',
          specialization: data.specialization || '',
          experience_years: data.experience_years || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching teacher details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      if (profileError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update profile"
        });
        return;
      }

      // Update or create teacher details
      const teacherData = {
        profile_id: profile.id,
        department: formData.department,
        qualification: formData.qualification,
        specialization: formData.specialization,
        experience_years: formData.experience_years,
      };

      if (teacherDetails) {
        const { error } = await supabase
          .from('teachers')
          .update(teacherData)
          .eq('id', teacherDetails.id);

        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update teacher details"
          });
          return;
        }
      } else {
        const { error } = await supabase
          .from('teachers')
          .insert([teacherData]);

        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create teacher details"
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });

      await fetchTeacherDetails();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-lg">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {profile?.first_name} {profile?.last_name}
                </h3>
                <Badge variant="default" className="mt-1">
                  Head Teacher
                </Badge>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
              {teacherDetails?.employee_id && (
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>ID: {teacherDetails.employee_id}</span>
                </div>
              )}
              {teacherDetails?.joining_date && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined: {new Date(teacherDetails.joining_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_years">Years of Experience</Label>
                <Input
                  id="experience_years"
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                value={formData.qualification}
                onChange={(e) => handleInputChange('qualification', e.target.value)}
                placeholder="e.g., Master's in Education"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Textarea
                id="specialization"
                value={formData.specialization}
                onChange={(e) => handleInputChange('specialization', e.target.value)}
                placeholder="Describe your areas of specialization..."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeadTeacherProfile;