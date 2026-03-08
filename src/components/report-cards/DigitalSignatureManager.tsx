import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PenTool, Type, Trash2, CheckCircle } from 'lucide-react';
import SignaturePad from './SignaturePad';
import TypeToSign from './TypeToSign';

const DigitalSignatureManager = () => {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<'draw' | 'type'>('draw');

  const { data: existingSignature, isLoading } = useQuery({
    queryKey: ['my-digital-signature'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile) return null;

      const { data, error } = await supabase
        .from('digital_signatures' as any)
        .select('*')
        .eq('user_id', profile.id)
        .eq('school_id', profile.school_id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ signatureData, signatureType, fontFamily }: {
      signatureData: string;
      signatureType: 'drawn' | 'typed';
      fontFamily?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile) throw new Error('Profile not found');

      const payload = {
        user_id: profile.id,
        school_id: profile.school_id,
        signature_type: signatureType,
        signature_data: signatureData,
        font_family: fontFamily || null,
        is_active: true,
      };

      if (existingSignature?.id) {
        const { error } = await supabase
          .from('digital_signatures' as any)
          .update(payload)
          .eq('id', existingSignature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('digital_signatures' as any)
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Signature saved successfully');
      queryClient.invalidateQueries({ queryKey: ['my-digital-signature'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to save signature: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingSignature?.id) return;
      const { error } = await supabase
        .from('digital_signatures' as any)
        .delete()
        .eq('id', existingSignature.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Signature removed');
      queryClient.invalidateQueries({ queryKey: ['my-digital-signature'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to remove signature: ${error.message}`);
    },
  });

  const handleDrawnSave = (data: string) => {
    saveMutation.mutate({ signatureData: data, signatureType: 'drawn' });
  };

  const handleTypedSave = (text: string, fontFamily: string, imageData: string) => {
    saveMutation.mutate({ signatureData: imageData, signatureType: 'typed', fontFamily });
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          My Digital Signature
        </CardTitle>
        <CardDescription>
          Your signature will automatically appear on report cards based on your role.
          Head Teachers sign all reports; Class Teachers sign only their class reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingSignature?.signature_data && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span>Current signature ({existingSignature.signature_type === 'drawn' ? 'Hand-drawn' : 'Typed'})</span>
            </div>
            <div className="border rounded-lg p-4 bg-card flex items-center justify-between">
              <img
                src={existingSignature.signature_data}
                alt="Current signature"
                className="max-h-16 object-contain"
              />
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">
            {existingSignature ? 'Update your signature' : 'Create your signature'}
          </p>
          <Tabs value={method} onValueChange={(v) => setMethod(v as 'draw' | 'type')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw" className="flex items-center gap-1.5">
                <PenTool className="h-3.5 w-3.5" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="type" className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Type
              </TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="mt-4">
              <SignaturePad
                onSave={handleDrawnSave}
                initialData={existingSignature?.signature_type === 'drawn' ? existingSignature.signature_data : undefined}
              />
            </TabsContent>
            <TabsContent value="type" className="mt-4">
              <TypeToSign
                onSave={handleTypedSave}
                initialText={existingSignature?.signature_type === 'typed' ? '' : ''}
                initialFont={existingSignature?.font_family || 'Dancing Script'}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default DigitalSignatureManager;
