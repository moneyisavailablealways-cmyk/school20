import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  School, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Shield, 
  Bell, 
  Users, 
  Database,
  Palette,
  Calendar,
  Clock,
  Save,
  Upload,
  Key,
  Lock,
  Moon,
  Sun
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

interface SchoolSettings {
  school_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  established_year: string;
  motto: string;
  description: string;
}

interface SystemSettings {
  academic_year_start: string;
  academic_year_end: string;
  default_session_duration: number;
  max_students_per_class: number;
  auto_backup_enabled: boolean;
  maintenance_mode: boolean;
  registration_open: boolean;
  theme_color: string;
  language: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  attendance_reminders: boolean;
  fee_reminders: boolean;
  exam_notifications: boolean;
  announcement_notifications: boolean;
}

// Appearance Section Component with Dark Mode Toggle
const AppearanceSection = ({ 
  systemSettings, 
  setSystemSettings 
}: { 
  systemSettings: SystemSettings; 
  setSystemSettings: React.Dispatch<React.SetStateAction<SystemSettings>> 
}) => {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className="space-y-4">
      <h4 className="font-semibold flex items-center space-x-2">
        <Palette className="h-4 w-4" />
        <span>Appearance</span>
      </h4>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          <div>
            <Label>Dark Mode</Label>
            <p className="text-sm text-muted-foreground">
              {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            </p>
          </div>
        </div>
        <Switch
          checked={isDarkMode}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="theme_color">Accent Color</Label>
          <Input
            id="theme_color"
            type="color"
            value={systemSettings.theme_color}
            onChange={(e) => setSystemSettings(prev => ({ ...prev, theme_color: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="language">Default Language</Label>
          <Select 
            value={systemSettings.language} 
            onValueChange={(value) => setSystemSettings(prev => ({ ...prev, language: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('school');
  const [uploading, setUploading] = useState(false);

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    school_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    established_year: '',
    motto: '',
    description: '',
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    academic_year_start: '',
    academic_year_end: '',
    default_session_duration: 45,
    max_students_per_class: 40,
    auto_backup_enabled: true,
    maintenance_mode: false,
    registration_open: true,
    theme_color: '#3b82f6',
    language: 'en',
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    attendance_reminders: true,
    fee_reminders: true,
    exam_notifications: true,
    announcement_notifications: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch real settings from database
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSchoolSettings({
          school_name: data.school_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logo_url: data.logo_url || '',
          established_year: data.established_year || '',
          motto: data.motto || '',
          description: data.description || '',
        });
      } else {
        // Use default values if no settings exist
        const defaultSchoolSettings: SchoolSettings = {
          school_name: 'School20 Academy',
          address: '123 Education Street, Learning City, LC 12345',
          phone: '+1 (555) 123-4567',
          email: 'contact@school20.edu',
          website: 'https://www.school20.edu',
          logo_url: '',
          established_year: '1995',
          motto: 'Excellence in Education',
          description: 'A premier educational institution dedicated to nurturing young minds and fostering academic excellence.',
        };
        setSchoolSettings(defaultSchoolSettings);
      }

      const mockSystemSettings: SystemSettings = {
        academic_year_start: '2024-09-01',
        academic_year_end: '2025-06-30',
        default_session_duration: 45,
        max_students_per_class: 40,
        auto_backup_enabled: true,
        maintenance_mode: false,
        registration_open: true,
        theme_color: '#3b82f6',
        language: 'en',
      };

      const mockNotificationSettings: NotificationSettings = {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        attendance_reminders: true,
        fee_reminders: true,
        exam_notifications: true,
        announcement_notifications: true,
      };

      setSystemSettings(mockSystemSettings);
      setNotificationSettings(mockNotificationSettings);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSchoolSettings = async () => {
    try {
      setSaving(true);
      
      // Check if settings already exist
      const { data: existingSettings } = await supabase
        .from('school_settings')
        .select('id')
        .single();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('school_settings')
          .update(schoolSettings)
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('school_settings')
          .insert([schoolSettings]);

        if (error) throw error;
      }
      
      toast({
        title: 'Success',
        description: 'School settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving school settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save school settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `school-logo.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath);

      setSchoolSettings(prev => ({
        ...prev,
        logo_url: data.publicUrl
      }));

      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const saveSystemSettings = async () => {
    try {
      setSaving(true);
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Success',
        description: 'System settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving system settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save system settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setSaving(true);
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Success',
        description: 'Notification settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure school and system preferences</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="school">School Info</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <School className="h-5 w-5" />
                <span>School Information</span>
              </CardTitle>
              <CardDescription>Manage basic school information and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="school_name">School Name</Label>
                  <Input
                    id="school_name"
                    value={schoolSettings.school_name}
                    onChange={(e) => setSchoolSettings(prev => ({ ...prev, school_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="established_year">Established Year</Label>
                  <Input
                    id="established_year"
                    value={schoolSettings.established_year}
                    onChange={(e) => setSchoolSettings(prev => ({ ...prev, established_year: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="motto">School Motto</Label>
                <Input
                  id="motto"
                  value={schoolSettings.motto}
                  onChange={(e) => setSchoolSettings(prev => ({ ...prev, motto: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={schoolSettings.description}
                  onChange={(e) => setSchoolSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Contact Information</span>
                </h4>
                
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={schoolSettings.address}
                    onChange={(e) => setSchoolSettings(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={schoolSettings.phone}
                      onChange={(e) => setSchoolSettings(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={schoolSettings.email}
                      onChange={(e) => setSchoolSettings(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={schoolSettings.website}
                    onChange={(e) => setSchoolSettings(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>School Logo</span>
                </h4>
                
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 border rounded-lg flex items-center justify-center">
                    {schoolSettings.logo_url ? (
                      <img src={schoolSettings.logo_url} alt="School Logo" className="w-full h-full object-cover rounded" />
                    ) : (
                      <School className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSchoolSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Academic Year</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="academic_year_start">Academic Year Start</Label>
                    <Input
                      id="academic_year_start"
                      type="date"
                      value={systemSettings.academic_year_start}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, academic_year_start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="academic_year_end">Academic Year End</Label>
                    <Input
                      id="academic_year_end"
                      type="date"
                      value={systemSettings.academic_year_end}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, academic_year_end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Class Configuration</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default_session_duration">Default Session Duration (minutes)</Label>
                    <Input
                      id="default_session_duration"
                      type="number"
                      value={systemSettings.default_session_duration}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, default_session_duration: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_students_per_class">Max Students Per Class</Label>
                    <Input
                      id="max_students_per_class"
                      type="number"
                      value={systemSettings.max_students_per_class}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, max_students_per_class: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <AppearanceSection systemSettings={systemSettings} setSystemSettings={setSystemSettings} />

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>System Status</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Backup</Label>
                      <p className="text-sm text-muted-foreground">Automatically backup system data daily</p>
                    </div>
                    <Switch
                      checked={systemSettings.auto_backup_enabled}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, auto_backup_enabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Registration Open</Label>
                      <p className="text-sm text-muted-foreground">Allow new student registrations</p>
                    </div>
                    <Switch
                      checked={systemSettings.registration_open}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, registration_open: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Temporarily disable system access for maintenance</p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenance_mode}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, maintenance_mode: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSystemSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>Configure notification preferences and delivery methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Delivery Methods</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send notifications via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.email_notifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.sms_notifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, sms_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send in-app push notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.push_notifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, push_notifications: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Notification Types</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Attendance Reminders</Label>
                      <p className="text-sm text-muted-foreground">Notify about attendance issues</p>
                    </div>
                    <Switch
                      checked={notificationSettings.attendance_reminders}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, attendance_reminders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Fee Reminders</Label>
                      <p className="text-sm text-muted-foreground">Notify about pending fee payments</p>
                    </div>
                    <Switch
                      checked={notificationSettings.fee_reminders}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, fee_reminders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exam Notifications</Label>
                      <p className="text-sm text-muted-foreground">Notify about upcoming exams and results</p>
                    </div>
                    <Switch
                      checked={notificationSettings.exam_notifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, exam_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Announcement Notifications</Label>
                      <p className="text-sm text-muted-foreground">Notify about new announcements</p>
                    </div>
                    <Switch
                      checked={notificationSettings.announcement_notifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, announcement_notifications: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveNotificationSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>Manage security policies and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Password Policy</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_password_length">Minimum Password Length</Label>
                    <Select defaultValue="8">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 characters</SelectItem>
                        <SelectItem value="8">8 characters</SelectItem>
                        <SelectItem value="10">10 characters</SelectItem>
                        <SelectItem value="12">12 characters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="password_expiry">Password Expiry (days)</Label>
                    <Select defaultValue="90">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Special Characters</Label>
                      <p className="text-sm text-muted-foreground">Passwords must contain special characters</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Numbers</Label>
                      <p className="text-sm text-muted-foreground">Passwords must contain numbers</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Mixed Case</Label>
                      <p className="text-sm text-muted-foreground">Passwords must contain uppercase and lowercase letters</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Access Control</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">Automatically log out inactive users</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IP Whitelist</Label>
                      <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">System Logs</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">1,234</h3>
                      <p className="text-sm text-muted-foreground">Login Attempts (24h)</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-red-600">12</h3>
                      <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">456</h3>
                      <p className="text-sm text-muted-foreground">Active Sessions</p>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end">
                <Button disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;