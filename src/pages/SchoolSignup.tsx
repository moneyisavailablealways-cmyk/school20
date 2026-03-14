import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, School, CheckCircle, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

const schema = z.object({
  school_name: z.string().min(3, 'School name must be at least 3 characters').max(100),
  school_code: z.string().min(2, 'School code required (e.g. KHS001)').max(10),
  motto: z.string().max(200).optional(),
  country: z.string().min(2, 'Country required'),
  school_level: z.enum(['primary', 'secondary', 'higher_institution']),
  region: z.string().optional(),
  email: z.string().email('Valid school email required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  po_box: z.string().max(50).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  admin_first_name: z.string().min(2, 'Admin first name required').max(50),
  admin_last_name: z.string().min(2, 'Admin last name required').max(50),
  admin_email: z.string().email('Valid admin email required'),
  admin_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.admin_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type SchoolSignupForm = z.infer<typeof schema>;

const SchoolSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<SchoolSignupForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      school_name: '',
      school_code: '',
      motto: '',
      country: 'Uganda',
      school_level: 'secondary',
      region: '',
      email: '',
      phone: '',
      address: '',
      po_box: '',
      website: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_email: '',
      admin_password: '',
      confirm_password: '',
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG or JPG files are allowed');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogo = async (schoolId: string): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split('.').pop();
    const path = `${schoolId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('school-logos').upload(path, logoFile, { upsert: true });
    if (error) {
      console.error('Logo upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('school-logos').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const onSubmit = async (data: SchoolSignupForm) => {
    setIsSubmitting(true);
    try {
      // Use fetch directly to avoid issues with expired auth sessions on the Supabase client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/register-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          school_name: data.school_name,
          school_code: data.school_code,
          motto: data.motto || null,
          country: data.country,
          school_level: data.school_level,
          region: data.region,
          email: data.email,
          phone: data.phone,
          address: data.address,
          po_box: data.po_box || null,
          website: data.website || null,
          admin_first_name: data.admin_first_name,
          admin_last_name: data.admin_last_name,
          admin_email: data.admin_email,
          admin_password: data.admin_password,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result?.error || `Registration failed (status ${response.status})`);
      }
      if (result?.error) throw new Error(result.error);

      // Upload logo if provided
      if (logoFile && result?.school_id) {
        const logoUrl = await uploadLogo(result.school_id);
        if (logoUrl) {
          // Update the school record with logo URL
          await supabase.from('schools').update({ logo_url: logoUrl } as any).eq('id', result.school_id);
        }
      }

      // Auto-login the newly registered admin
      setRegisteredEmail(data.admin_email);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.admin_email,
        password: data.admin_password,
      });

      if (signInError) {
        console.warn('Auto-login failed after registration:', signInError.message);
        setStep('success');
      } else {
        toast.success('School registered successfully! Redirecting to your dashboard...');
        navigate('/admin');
      }
    } catch (error: any) {
      const msg = error.message || 'Registration failed. Please try again.';
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('already')) {
        toast.error('This email is already registered. Please use a different admin email or sign in with your existing account.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">School Registered!</h2>
            <p className="text-muted-foreground">
              Your school has been registered successfully. Sign in below with your admin credentials to access your dashboard.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left text-sm space-y-2">
              <p className="font-medium">Your login credentials:</p>
              <p className="text-muted-foreground">Email: <span className="font-mono text-foreground">{registeredEmail || form.getValues('admin_email')}</span></p>
              <p className="text-muted-foreground">Password: <span className="font-mono text-foreground">The password you entered during registration</span></p>
            </div>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">School20</h1>
          <p className="text-muted-foreground mt-1">Register your school on the platform</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              School Registration
            </CardTitle>
            <CardDescription>
              Register your school to get started. You'll be the first admin of your school.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* School Details */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">School Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="school_name" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>School Name *</FormLabel>
                        <FormControl><Input placeholder="e.g. Kampala High School" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Logo Upload */}
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">School Logo</label>
                      <div className="mt-1.5 flex items-center gap-4">
                        {logoPreview ? (
                          <div className="relative">
                            <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-contain border" />
                            <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                        <div>
                          <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                            <Upload className="h-4 w-4" />
                            {logoFile ? 'Change Logo' : 'Upload Logo'}
                          </label>
                          <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleLogoChange} />
                          <p className="text-xs text-muted-foreground mt-0.5">PNG or JPG, max 2MB</p>
                        </div>
                      </div>
                    </div>

                    <FormField control={form.control} name="motto" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>School Motto</FormLabel>
                        <FormControl><Input placeholder="e.g. Education for Excellence" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="school_code" render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Code *</FormLabel>
                        <FormControl><Input placeholder="e.g. KHS001" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="school_level" render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Level *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="primary">Primary School</SelectItem>
                            <SelectItem value="secondary">Secondary School</SelectItem>
                            <SelectItem value="higher_institution">Higher Institution (Beta)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl><Input placeholder="Uganda" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="region" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl><Input placeholder="e.g. Central" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Email *</FormLabel>
                        <FormControl><Input type="email" placeholder="school@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telephone Number</FormLabel>
                        <FormControl><Input placeholder="+256 700 000 000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>School Location / Address</FormLabel>
                        <FormControl><Input placeholder="School physical address" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="po_box" render={({ field }) => (
                      <FormItem>
                        <FormLabel>P.O. Box</FormLabel>
                        <FormControl><Input placeholder="e.g. P.O. Box 12345, Kampala" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl><Input placeholder="https://www.school.com" {...field} /></FormControl>
                        <FormDescription className="text-xs">Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Admin Account */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Admin Account</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="admin_first_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl><Input placeholder="John" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="admin_last_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="admin_email" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Admin Email *</FormLabel>
                        <FormControl><Input type="email" placeholder="admin@school.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="admin_password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="confirm_password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl><Input type="password" placeholder="Repeat password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering School...</>
                  ) : (
                    'Register School'
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/auth" className="text-primary font-medium hover:underline">Sign In</Link>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Sample credentials box */}
        <Card className="mt-4 border-dashed">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sample School — School20 Academy</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>School Code: <span className="font-mono font-medium text-foreground">SCH20</span></p>
              <p>Admin Email: <span className="font-mono font-medium text-foreground">admin@school20.ac.ug</span></p>
              <p>Contact: <span className="font-medium text-foreground">+256705466283</span> (Skyline Tech Solutions)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolSignup;
