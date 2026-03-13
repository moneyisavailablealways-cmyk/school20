import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Building2, Upload, X, Image } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const SchoolSettings = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    school_name: '',
    motto: '',
    email: '',
    website: '',
    phone: '',
    address: '',
    logo_url: '',
  });

  // Fetch school_settings, falling back to the schools table for registration data
  const { data: settings, isLoading } = useQuery({
    queryKey: ['school-settings', profile?.school_id],
    queryFn: async () => {
      const { data: settingsData, error } = await supabase
        .from('school_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;

      // If school_settings has data, return it
      if (settingsData && (settingsData.school_name || settingsData.address || settingsData.phone || settingsData.email)) {
        return settingsData;
      }

      // Otherwise, fetch from the schools table (registration data) as fallback
      if (profile?.school_id) {
        const { data: schoolRecord } = await supabase
          .from('schools')
          .select('school_name, address, phone, email, website, logo_url')
          .eq('id', profile.school_id)
          .single();

        if (schoolRecord) {
          return {
            ...settingsData,
            school_name: settingsData?.school_name || schoolRecord.school_name || '',
            address: settingsData?.address || schoolRecord.address || '',
            phone: settingsData?.phone || schoolRecord.phone || '',
            email: settingsData?.email || schoolRecord.email || '',
            website: settingsData?.website || schoolRecord.website || '',
            logo_url: settingsData?.logo_url || schoolRecord.logo_url || '',
          };
        }
      }

      return settingsData;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        school_name: settings.school_name || '',
        motto: settings.motto || '',
        email: settings.email || '',
        website: settings.website || '',
        phone: settings.phone || '',
        address: settings.address || '',
        logo_url: settings.logo_url || '',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `school-logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('school-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('school-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (settings?.id) {
        const { error } = await supabase
          .from('school_settings')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_settings')
          .insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('School settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Information
          </CardTitle>
          <CardDescription>
            Configure school details that will appear on report cards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="school_name">School Name *</Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) => handleChange('school_name', e.target.value)}
                placeholder="Enter school name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motto">School Motto</Label>
              <Input
                id="motto"
                value={formData.motto}
                onChange={(e) => handleChange('motto', e.target.value)}
                placeholder="Enter school motto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="school@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="www.school.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+256 700 000 000"
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>School Logo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {formData.logo_url ? (
                <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                  <img
                    src={formData.logo_url}
                    alt="School logo"
                    className="h-12 w-12 object-contain rounded"
                    onError={(e) => { e.currentTarget.src = ''; }}
                  />
                  <span className="text-sm text-muted-foreground truncate flex-1">Logo uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed flex flex-col gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  ) : (
                    <>
                      <Image className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload logo</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG up to 2MB</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter school address"
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-6 bg-muted/30">
            <p className="text-sm text-muted-foreground mb-3">Preview (as it will appear on report cards):</p>
            <div className="text-center space-y-1">
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="School logo"
                  className="h-16 w-16 mx-auto object-contain mb-2"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <h3 className="text-xl font-bold">{formData.school_name || 'School Name'}</h3>
              {formData.motto && <p className="text-sm italic text-muted-foreground">"{formData.motto}"</p>}
              <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                {formData.address && <p>{formData.address}</p>}
                <div className="flex justify-center gap-4">
                  {formData.phone && <span>Tel: {formData.phone}</span>}
                  {formData.email && <span>Email: {formData.email}</span>}
                </div>
                {formData.website && <p>Website: {formData.website}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolSettings;
