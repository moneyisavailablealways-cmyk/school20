import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, MapPin, Briefcase, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ParentData {
  id: string;
  occupation: string;
  workplace: string;
  national_id: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  preferred_contact_method: string;
  profile_id: string;
}

const ParentProfile = () => {
  const { profile, updateProfile } = useAuth();
  const [parentData, setParentData] = useState<ParentData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    occupation: '',
    workplace: '',
    national_id: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    preferred_contact_method: 'email'
  });

  useEffect(() => {
    fetchParentData();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      }));
    }
  }, [profile]);

  const fetchParentData = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setParentData(data);
        setFormData(prev => ({
          ...prev,
          occupation: data.occupation || '',
          workplace: data.workplace || '',
          national_id: data.national_id || '',
          address: data.address || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relationship: data.emergency_contact_relationship || '',
          preferred_contact_method: data.preferred_contact_method || 'email'
        }));
      }
    } catch (error) {
      console.error('Error fetching parent data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    try {
      // Update profile data
      const profileUpdate = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      };

      const { error: profileError } = await updateProfile(profileUpdate);
      if (profileError) throw profileError;

      // Update or insert parent data
      const parentUpdate = {
        occupation: formData.occupation,
        workplace: formData.workplace,
        national_id: formData.national_id,
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        preferred_contact_method: formData.preferred_contact_method,
        profile_id: profile.id
      };

      if (parentData) {
        const { error } = await supabase
          .from('parents')
          .update(parentUpdate)
          .eq('id', parentData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('parents')
          .insert(parentUpdate);
        if (error) throw error;
      }

      await fetchParentData();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        occupation: parentData?.occupation || '',
        workplace: parentData?.workplace || '',
        national_id: parentData?.national_id || '',
        address: parentData?.address || '',
        emergency_contact_name: parentData?.emergency_contact_name || '',
        emergency_contact_phone: parentData?.emergency_contact_phone || '',
        emergency_contact_relationship: parentData?.emergency_contact_relationship || '',
        preferred_contact_method: parentData?.preferred_contact_method || 'email'
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal information and preferences</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                {isEditing ? (
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.first_name || 'Not provided'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.last_name || 'Not provided'}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm p-2 bg-muted rounded flex-1">{formData.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact admin if needed.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm p-2 bg-muted rounded">{formData.phone || 'Not provided'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              {isEditing ? (
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm p-2 bg-muted rounded flex-1">{formData.address || 'Not provided'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Information
            </CardTitle>
            <CardDescription>
              Your occupation and workplace details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                {isEditing ? (
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.occupation || 'Not provided'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workplace">Workplace</Label>
                {isEditing ? (
                  <Input
                    id="workplace"
                    value={formData.workplace}
                    onChange={(e) => handleInputChange('workplace', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.workplace || 'Not provided'}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="national_id">National ID</Label>
              {isEditing ? (
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => handleInputChange('national_id', e.target.value)}
                />
              ) : (
                <p className="text-sm p-2 bg-muted rounded">{formData.national_id || 'Not provided'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact & Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contact & Preferences
            </CardTitle>
            <CardDescription>
              Emergency contact information and communication preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                {isEditing ? (
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.emergency_contact_name || 'Not provided'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                {isEditing ? (
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.emergency_contact_phone || 'Not provided'}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                {isEditing ? (
                  <Input
                    id="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                    placeholder="e.g., Spouse, Sibling, Friend"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{formData.emergency_contact_relationship || 'Not provided'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
                {isEditing ? (
                  <Select
                    value={formData.preferred_contact_method}
                    onValueChange={(value) => handleInputChange('preferred_contact_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm p-2 bg-muted rounded capitalize">
                    {formData.preferred_contact_method || 'Email'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentProfile;