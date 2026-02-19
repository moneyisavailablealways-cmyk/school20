import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, School, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  school_name: z.string().min(3, 'School name must be at least 3 characters'),
  school_code: z.string().min(2, 'School code required (e.g. KHS001)').max(10),
  country: z.string().min(2, 'Country required'),
  region: z.string().optional(),
  email: z.string().email('Valid school email required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  admin_first_name: z.string().min(2, 'Admin first name required'),
  admin_last_name: z.string().min(2, 'Admin last name required'),
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

  const form = useForm<SchoolSignupForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      school_name: '',
      school_code: '',
      country: 'Uganda',
      region: '',
      email: '',
      phone: '',
      address: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_email: '',
      admin_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: SchoolSignupForm) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('register-school', {
        body: {
          school_name: data.school_name,
          school_code: data.school_code,
          country: data.country,
          region: data.region,
          email: data.email,
          phone: data.phone,
          address: data.address,
          admin_first_name: data.admin_first_name,
          admin_last_name: data.admin_last_name,
          admin_email: data.admin_email,
          admin_password: data.admin_password,
        },
      });

      if (error) throw new Error(error.message || 'Registration failed');
      if (result?.error) throw new Error(result.error);

      setStep('success');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
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
              Your school has been registered successfully. Check your admin email to verify your account, then sign in to access your dashboard.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left text-sm space-y-2">
              <p className="font-medium">Sample login credentials:</p>
              <p className="text-muted-foreground">Email: <span className="font-mono text-foreground">{form.getValues('admin_email')}</span></p>
              <p className="text-muted-foreground">Password: <span className="font-mono text-foreground">Your chosen password</span></p>
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
                    <FormField control={form.control} name="school_code" render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Code *</FormLabel>
                        <FormControl><Input placeholder="e.g. KHS001" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
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
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Email *</FormLabel>
                        <FormControl><Input type="email" placeholder="school@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="+256 700 000 000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input placeholder="School physical address" {...field} /></FormControl>
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
