import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, Save, X, User, GraduationCap, Contact, AlertTriangle, Users, BookOpen, Upload, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudentFormProps {
  student?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [parents, setParents] = useState<Profile[]>([]);
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    student?.date_of_birth ? new Date(student.date_of_birth) : undefined
  );
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(
    student?.admission_date ? new Date(student.admission_date) : new Date()
  );
  
  const [formData, setFormData] = useState({
    student_id: student?.student_id || '',
    admission_number: student?.admission_number || '',
    gender: student?.gender || '',
    address: student?.address || '',
    enrollment_status: student?.enrollment_status || 'active',
    phone: student?.profile?.phone || '',
  });

  // Medical information form data
  const [medicalData, setMedicalData] = useState({
    medical_conditions: '',
    allergies: '',
    medications: '',
    dietary_requirements: '',
    special_needs: '',
  });

  // Emergency contact form data  
  const [emergencyContacts, setEmergencyContacts] = useState([{
    contact_name: '',
    contact_phone: '',
    contact_relationship: '',
    is_primary_contact: true,
    can_pickup: true,
  }]);

  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
    fetchClasses();
    fetchParents();
    fetchSubjects();
    if (student?.profile_id) {
      setSelectedProfile(student.profile_id);
    }
    if (student?.id) {
      fetchStudentRelationships();
      fetchStudentMedicalInfo();
      fetchStudentEmergencyContacts();
      fetchStudentEnrollment();
    }
  }, [student]);

  const fetchStudentEnrollment = async () => {
    if (!student?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('class_id, stream_id, academic_year_id')
        .eq('student_id', student.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSelectedClass(data.class_id || '');
        if (data.class_id) {
          await fetchStreams(data.class_id);
          setSelectedStream(data.stream_id || '');
        }
      }
    } catch (error) {
      console.error('Error fetching student enrollment:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, avatar_url')
        .eq('role', 'student')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch student profiles',
        variant: 'destructive',
      });
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, levels(name)')
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch classes',
        variant: 'destructive',
      });
    }
  };

  const fetchStreams = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('class_id', classId)
        .order('name', { ascending: true });

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch streams',
        variant: 'destructive',
      });
    }
  };

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, avatar_url')
        .eq('role', 'parent')
        .order('first_name');

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch parent profiles',
        variant: 'destructive',
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects',
        variant: 'destructive',
      });
    }
  };

  const fetchStudentRelationships = async () => {
    if (!student?.id) return;
    
    try {
      // Fetch parent relationship
      const { data: parentRel, error: parentError } = await supabase
        .from('parent_student_relationships')
        .select('parent_id, relationship_type')
        .eq('student_id', student.id)
        .maybeSingle();

      if (parentError) throw parentError;
      
      if (parentRel) {
        setSelectedParent(parentRel.parent_id);
        setRelationshipType(parentRel.relationship_type);
      }
    } catch (error) {
      console.error('Error fetching student relationships:', error);
    }
  };

  const fetchStudentMedicalInfo = async () => {
    if (!student?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('student_medical_info')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setMedicalData({
          medical_conditions: data.medical_conditions || '',
          allergies: data.allergies || '',
          medications: data.medications || '',
          dietary_requirements: data.dietary_requirements || '',
          special_needs: data.special_needs || '',
        });
      }
    } catch (error) {
      console.error('Error fetching medical info:', error);
    }
  };

  const fetchStudentEmergencyContacts = async () => {
    if (!student?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('student_emergency_contacts')
        .select('*')
        .eq('student_id', student.id)
        .order('is_primary_contact', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setEmergencyContacts(data.map(contact => ({
          contact_name: contact.contact_name,
          contact_phone: contact.contact_phone,
          contact_relationship: contact.contact_relationship || '',
          is_primary_contact: contact.is_primary_contact,
          can_pickup: contact.can_pickup,
        })));
      }
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  };

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `STU${year}${randomNum}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, profileId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require profile selection for new students
    if (!student && !selectedProfile) {
      toast({
        title: 'Validation Error',
        description: 'Please select a profile for this student',
        variant: 'destructive',
      });
      return;
    }

    if (!dateOfBirth) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date of birth',
        variant: 'destructive',
      });
      return;
    }

    if (!admissionDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select an admission date',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const studentData = {
        ...formData,
        profile_id: selectedProfile || student?.profile_id,
        date_of_birth: format(dateOfBirth, 'yyyy-MM-dd'),
        admission_date: format(admissionDate, 'yyyy-MM-dd'),
        student_id: formData.student_id || generateStudentId(),
      };
      
      // Remove phone from student data as it belongs to profile
      const { phone, ...studentDataWithoutPhone } = studentData;

        // Handle image upload if a new image was selected
        let avatarUrl = null;
        const profileId = selectedProfile || student?.profile_id;
        if (imageFile && profileId) {
          setUploadingImage(true);
          avatarUrl = await uploadImage(imageFile, profileId);
          if (avatarUrl) {
            // Update the profile's avatar_url
            const { error: avatarError } = await supabase
              .from('profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', profileId);

            if (avatarError) {
              console.error('Error updating avatar:', avatarError);
            }
          }
          setUploadingImage(false);
        }

        // Update profile phone number if changed
        if (profileId && formData.phone !== (student?.profile?.phone || '')) {
          const { error: phoneError } = await supabase
            .from('profiles')
            .update({ phone: formData.phone })
            .eq('id', profileId);

          if (phoneError) {
            console.error('Error updating phone:', phoneError);
          }
        }

      if (student) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update(studentDataWithoutPhone)
          .eq('id', student.id);

        if (error) throw error;

        // Update medical information
        const hasMedicalInfo = Object.values(medicalData).some(value => value.trim() !== '');
        if (hasMedicalInfo) {
          const { error: medicalError } = await supabase
            .from('student_medical_info')
            .upsert({
              student_id: student.id,
              ...medicalData
            }, { 
              onConflict: 'student_id' 
            });

          if (medicalError) {
            console.error('Error updating medical info:', medicalError);
          }
        }

        // Update emergency contacts
        // First delete existing contacts
        await supabase
          .from('student_emergency_contacts')
          .delete()
          .eq('student_id', student.id);

        // Insert new contacts
        const validContacts = emergencyContacts.filter(contact => 
          contact.contact_name.trim() && contact.contact_phone.trim()
        );
        if (validContacts.length > 0) {
          const contactsToInsert = validContacts.map(contact => ({
            student_id: student.id,
            ...contact
          }));

          const { error: contactsError } = await supabase
            .from('student_emergency_contacts')
            .insert(contactsToInsert);

          if (contactsError) {
            console.error('Error updating emergency contacts:', contactsError);
          }
        }

        // Update or create parent-student relationship
        if (selectedParent && relationshipType) {
          await supabase
            .from('parent_student_relationships')
            .delete()
            .eq('student_id', student.id);

          const { error: relationshipError } = await supabase
            .from('parent_student_relationships')
            .insert([{
              parent_id: selectedParent,
              student_id: student.id,
              relationship_type: relationshipType,
              is_primary_contact: true
            }]);

          if (relationshipError) {
            console.error('Error updating parent relationship:', relationshipError);
          }
        }

        // Update or create student enrollment
        if (selectedClass) {
          // Get current academic year
          const { data: currentYear } = await supabase
            .from('academic_years')
            .select('id')
            .eq('is_current', true)
            .maybeSingle();

          // Check if enrollment exists
          const { data: existingEnrollment } = await supabase
            .from('student_enrollments')
            .select('id')
            .eq('student_id', student.id)
            .eq('status', 'active')
            .maybeSingle();

          if (existingEnrollment) {
            // Update existing enrollment
            const { error: enrollmentError } = await supabase
              .from('student_enrollments')
              .update({
                class_id: selectedClass,
                stream_id: selectedStream || null,
                academic_year_id: currentYear?.id || null,
              })
              .eq('id', existingEnrollment.id);

            if (enrollmentError) {
              console.error('Error updating enrollment:', enrollmentError);
            }
          } else {
            // Create new enrollment
            const { error: enrollmentError } = await supabase
              .from('student_enrollments')
              .insert([{
                student_id: student.id,
                class_id: selectedClass,
                stream_id: selectedStream || null,
                academic_year_id: currentYear?.id || null,
                enrollment_date: format(admissionDate, 'yyyy-MM-dd'),
                status: 'active'
              }]);

            if (enrollmentError) {
              console.error('Error creating enrollment:', enrollmentError);
            }
          }
        }

        toast({
          title: 'Success',
          description: 'Student updated successfully',
        });
      } else {
        // Create new student
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert([studentDataWithoutPhone])
          .select()
          .single();

        if (error) throw error;

        // Save medical information if provided
        const hasMedicalInfo = Object.values(medicalData).some(value => value.trim() !== '');
        if (hasMedicalInfo && newStudent) {
          const { error: medicalError } = await supabase
            .from('student_medical_info')
            .insert([{
              student_id: newStudent.id,
              ...medicalData
            }]);

          if (medicalError) {
            console.error('Error saving medical info:', medicalError);
          }
        }

        // Save emergency contacts if provided
        const validContacts = emergencyContacts.filter(contact => 
          contact.contact_name.trim() && contact.contact_phone.trim()
        );
        if (validContacts.length > 0 && newStudent) {
          const contactsToInsert = validContacts.map(contact => ({
            student_id: newStudent.id,
            ...contact
          }));

          const { error: contactsError } = await supabase
            .from('student_emergency_contacts')
            .insert(contactsToInsert);

          if (contactsError) {
            console.error('Error saving emergency contacts:', contactsError);
          }
        }

        // Create student enrollment if class is selected
        if (selectedClass && newStudent) {
          const { error: enrollmentError } = await supabase
            .from('student_enrollments')
            .insert([{
              student_id: newStudent.id,
              class_id: selectedClass,
              stream_id: selectedStream || null,
              enrollment_date: format(admissionDate, 'yyyy-MM-dd'),
              status: 'active'
            }]);

          if (enrollmentError) {
            console.error('Error creating enrollment:', enrollmentError);
          }
        }

        // Create parent-student relationship if parent is selected
        if (selectedParent && relationshipType && newStudent) {
          const { error: relationshipError } = await supabase
            .from('parent_student_relationships')
            .insert([{
              parent_id: selectedParent,
              student_id: newStudent.id,
              relationship_type: relationshipType,
              is_primary_contact: true
            }]);

          if (relationshipError) {
            console.error('Error creating parent relationship:', relationshipError);
          }
        }

        toast({
          title: 'Success',
          description: 'Student added successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save student',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProfileData = profiles.find(p => p.id === selectedProfile);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="contact">Contact & Medical</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!student && (
                <div className="space-y-2">
                  <Label htmlFor="profile">Link to Profile *</Label>
                  <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student profile..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name} - {profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProfileData && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      Selected: {selectedProfileData.first_name} {selectedProfileData.last_name}
                      <br />
                      Email: {selectedProfileData.email}
                      {selectedProfileData.phone && (
                        <>
                          <br />
                          Phone: {selectedProfileData.phone}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {student && (
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  Editing: {student.profile?.first_name} {student.profile?.last_name}
                  <br />
                  Email: {student.profile?.email}
                </div>
              )}

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="studentImage">Student Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={imagePreview || selectedProfileData?.avatar_url} />
                      <AvatarFallback>
                        <ImageIcon className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Input
                        id="studentImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a photo for the student profile
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : "Select date of birth"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter contact phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="enrollment_status">Enrollment Status</Label>
                  <Select
                    value={formData.enrollment_status}
                    onValueChange={(value) => handleInputChange('enrollment_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter student's address..."
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Parent/Guardian Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parent">Parent/Guardian</Label>
                  <Select value={selectedParent} onValueChange={setSelectedParent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a parent/guardian..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.first_name} {parent.last_name} - {parent.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select value={relationshipType} onValueChange={setRelationshipType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="grandfather">Grandfather</SelectItem>
                      <SelectItem value="grandmother">Grandmother</SelectItem>
                      <SelectItem value="uncle">Uncle</SelectItem>
                      <SelectItem value="aunt">Aunt</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedParent && (
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  Selected Parent: {parents.find(p => p.id === selectedParent)?.first_name} {parents.find(p => p.id === selectedParent)?.last_name}
                  {relationshipType && (
                    <>
                      <br />
                      Relationship: {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input
                    id="student_id"
                    placeholder="Auto-generated if empty"
                    value={formData.student_id}
                    onChange={(e) => handleInputChange('student_id', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admission_number">Admission Number</Label>
                  <Input
                    id="admission_number"
                    placeholder="Enter admission number"
                    value={formData.admission_number}
                    onChange={(e) => handleInputChange('admission_number', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admissionDate">Admission Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !admissionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {admissionDate ? format(admissionDate, "PPP") : "Select admission date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={admissionDate}
                        onSelect={setAdmissionDate}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select
                    value={selectedClass}
                     onValueChange={(value) => {
                       setSelectedClass(value);
                       setStreams([]);
                       setSelectedStream('');
                       if (value) {
                         fetchStreams(value);
                       }
                     }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                       {classes.map((classItem) => (
                         <SelectItem key={classItem.id} value={classItem.id}>
                           {classItem.name}
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>

                 <div className="space-y-2">
                  <Label htmlFor="stream">Stream</Label>
                  <Select
                    value={selectedStream}
                    onValueChange={setSelectedStream}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedClass ? "Select stream" : "Select class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {streams.map((stream) => (
                        <SelectItem key={stream.id} value={stream.id}>
                          Stream {stream.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a section within the selected class
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects</Label>
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subjects.map((subject) => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={subject.id}
                          checked={selectedSubjects.includes(subject.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSubjects(prev => [...prev, subject.id]);
                            } else {
                              setSelectedSubjects(prev => prev.filter(id => id !== subject.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={subject.id}
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4" />
                          {subject.name}
                          {subject.code && (
                            <span className="text-muted-foreground">({subject.code})</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {subjects.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No subjects available. Please contact administrator to add subjects.
                    </p>
                  )}
                  {selectedSubjects.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </Card>
                <p className="text-xs text-muted-foreground">
                  Select the subjects this student will be enrolled in
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Contact className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Emergency Contacts</h3>
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Contact {index + 1}</span>
                      {emergencyContacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newContacts = emergencyContacts.filter((_, i) => i !== index);
                            setEmergencyContacts(newContacts);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Name *</Label>
                        <Input
                          placeholder="Enter contact name"
                          value={contact.contact_name}
                          onChange={(e) => {
                            const newContacts = [...emergencyContacts];
                            newContacts[index].contact_name = e.target.value;
                            setEmergencyContacts(newContacts);
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Contact Phone *</Label>
                        <Input
                          placeholder="Enter phone number"
                          value={contact.contact_phone}
                          onChange={(e) => {
                            const newContacts = [...emergencyContacts];
                            newContacts[index].contact_phone = e.target.value;
                            setEmergencyContacts(newContacts);
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Input
                          placeholder="e.g., Parent, Guardian, Uncle"
                          value={contact.contact_relationship}
                          onChange={(e) => {
                            const newContacts = [...emergencyContacts];
                            newContacts[index].contact_relationship = e.target.value;
                            setEmergencyContacts(newContacts);
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`primary-${index}`}
                            checked={contact.is_primary_contact}
                            onCheckedChange={(checked) => {
                              const newContacts = emergencyContacts.map((c, i) => ({
                                ...c,
                                is_primary_contact: i === index ? !!checked : false
                              }));
                              setEmergencyContacts(newContacts);
                            }}
                          />
                          <Label htmlFor={`primary-${index}`}>Primary contact</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmergencyContacts([...emergencyContacts, {
                      contact_name: '',
                      contact_phone: '',
                      contact_relationship: '',
                      is_primary_contact: false,
                      can_pickup: true,
                    }]);
                  }}
                  className="w-full"
                >
                  Add Another Contact
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Medical Conditions</Label>
                  <Textarea
                    placeholder="Enter any medical conditions..."
                    value={medicalData.medical_conditions}
                    onChange={(e) => setMedicalData({...medicalData, medical_conditions: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <Textarea
                    placeholder="Enter any allergies..."
                    value={medicalData.allergies}
                    onChange={(e) => setMedicalData({...medicalData, allergies: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Current Medications</Label>
                  <Textarea
                    placeholder="Enter any current medications..."
                    value={medicalData.medications}
                    onChange={(e) => setMedicalData({...medicalData, medications: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dietary Requirements</Label>
                  <Textarea
                    placeholder="Enter any dietary requirements..."
                    value={medicalData.dietary_requirements}
                    onChange={(e) => setMedicalData({...medicalData, dietary_requirements: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Special Needs</Label>
                  <Textarea
                    placeholder="Enter any special needs or accommodations..."
                    value={medicalData.special_needs}
                    onChange={(e) => setMedicalData({...medicalData, special_needs: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploadingImage}>
          {loading || uploadingImage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {uploadingImage ? 'Uploading Image...' : loading ? 'Saving...' : (student ? 'Update Student' : 'Add Student')}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;