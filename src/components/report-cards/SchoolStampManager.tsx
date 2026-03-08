import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Stamp, Upload, Trash2, CheckCircle } from 'lucide-react';

const SchoolStampManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: stamp, isLoading } = useQuery({
    queryKey: ['school-stamp'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.school_id) return null;

      const { data, error } = await supabase
        .from('school_stamps' as any)
        .select('*')
        .eq('school_id', profile.school_id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.school_id) throw new Error('School not found');

      const ext = file.name.split('.').pop();
      const filePath = `stamps/${profile.school_id}/stamp.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath);

      const stampUrl = urlData.publicUrl;

      const payload = {
        school_id: profile.school_id,
        stamp_url: stampUrl,
        uploaded_by: profile.id,
        is_active: true,
      };

      if (stamp?.id) {
        const { error } = await supabase
          .from('school_stamps' as any)
          .update({ stamp_url: stampUrl, uploaded_by: profile.id })
          .eq('id', stamp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_stamps' as any)
          .insert([payload]);
        if (error) throw error;
      }

      toast.success('School stamp uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['school-stamp'] });
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!stamp?.id) return;
      const { error } = await supabase
        .from('school_stamps' as any)
        .delete()
        .eq('id', stamp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('School stamp removed');
      queryClient.invalidateQueries({ queryKey: ['school-stamp'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to remove stamp: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stamp className="h-5 w-5" />
          School Stamp
        </CardTitle>
        <CardDescription>
          Upload your school's official stamp. It will automatically appear on all generated report cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stamp?.stamp_url && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span>Current stamp</span>
            </div>
            <div className="border rounded-lg p-6 bg-card flex items-center justify-between">
              <img
                src={stamp.stamp_url}
                alt="School stamp"
                className="max-h-24 object-contain"
              />
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            className="hidden"
          />
          <Stamp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">
            {stamp ? 'Replace school stamp' : 'Upload school stamp'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">PNG or JPG, max 2MB. Transparent background recommended.</p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolStampManager;
