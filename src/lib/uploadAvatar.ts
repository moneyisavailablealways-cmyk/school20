import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads an avatar image to the `avatars` bucket under the given profile id,
 * then persists the public URL to `profiles.avatar_url`.
 * Returns the public URL, or null when no file was provided.
 */
export async function uploadAvatarForProfile(
  profileId: string,
  file: File | null | undefined,
): Promise<string | null> {
  if (!file) return null;

  const ext = file.name.split('.').pop() || 'png';
  const path = `${profileId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error('Avatar upload failed:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', profileId);

  if (updateError) {
    console.error('Profile avatar_url update failed:', updateError);
    throw updateError;
  }

  return publicUrl;
}
