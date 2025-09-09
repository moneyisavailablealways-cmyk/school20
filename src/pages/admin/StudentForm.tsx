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
import { CalendarIcon, Save, X, User, GraduationCap, Contact, AlertTriangle, Users, BookOpen } from 'lucide-react';
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
  role: string;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [parents, setParents] = useState<Profile[]>([]);
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
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
    emergency_contact_name: student?.emergency_contact_name || '',
    emergency_contact_phone: student?.emergency_contact_phone || '',
    medical_conditions: student?.medical_conditions || '',
    enrollment_status: student?.enrollment_status || 'active',
  });

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
    }
  }, [student]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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
        .select('*')
        .order('level', { ascending: true });

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

  const fetchSections = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('class_id', classId)
        .order('name', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sections',
        variant: 'destructive',
      });
    }
  };

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `STU${year}${randomNum}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProfile) {
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
        profile_id: selectedProfile,
        date_of_birth: format(dateOfBirth, 'yyyy-MM-dd'),
        admission_date: format(admissionDate, 'yyyy-MM-dd'),
        student_id: formData.student_id || generateStudentId(),
      };

      if (student) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', student.id);

        if (error) throw error;

        // Update or create parent-student relationship
        if (selectedParent && relationshipType) {
          // First, delete existing relationship
          await supabase
            .from('parent_student_relationships')
            .delete()
            .eq('student_id', student.id);

          // Then create new relationship
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

        toast({
          title: 'Success',
          description: 'Student updated successfully',
        });
      } else {
        // Create new student
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert([studentData])
          .select()
          .single();

        if (error) throw error;

        // Create student enrollment if class is selected
        if (selectedClass && newStudent) {
          const { error: enrollmentError } = await supabase
            .from('student_enrollments')
            .insert([{
              student_id: newStudent.id,
              class_id: selectedClass,
              section_id: selectedSection || null,
              enrollment_date: format(admissionDate, 'yyyy-MM-dd'),
              status: 'active'
            }]);

          if (enrollmentError) {
            console.error('Error creating enrollment:', enrollmentError);
            // Don't fail the whole process for enrollment error
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
            // Don't fail the whole process for relationship error
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select
                    value={selectedClass}
                    onValueChange={(value) => {
                      setSelectedClass(value);
                      setSections([]);
                      setSelectedSection('');
                      if (value) {
                        fetchSections(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} (Level {classItem.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedClass ? "Select section" : "Select class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          Section {section.name}
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    placeholder="Enter contact name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    placeholder="Enter phone number"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  />
                </div>
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
              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions / Allergies</Label>
                <Textarea
                  id="medical_conditions"
                  placeholder="Enter any medical conditions, allergies, or special requirements..."
                  value={formData.medical_conditions}
                  onChange={(e) => handleInputChange('medical_conditions', e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Include any medical conditions, allergies, medications, or special care requirements
                </p>
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
        <Button type="submit" disabled={loading}>
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {student ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;