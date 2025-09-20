import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  BarChart3, 
  Shield, 
  Calendar,
  DollarSign,
  Library,
  Smartphone,
  Globe,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Shield,
      title: 'Admin Portal',
      description: 'Complete system administration and user management',
      color: 'text-red-600',
    },
    {
      icon: Users,
      title: 'Principal Portal',
      description: 'School-wide oversight and performance analytics',
      color: 'text-blue-600',
    },
    {
      icon: GraduationCap,
      title: 'Teacher Portal',
      description: 'Classroom management and student assessment',
      color: 'text-green-600',
    },
    {
      icon: BookOpen,
      title: 'Student Portal',
      description: 'Access courses, grades, and learning resources',
      color: 'text-purple-600',
    },
    {
      icon: BarChart3,
      title: 'Parent Portal',
      description: 'Monitor child progress and handle payments',
      color: 'text-orange-600',
    },
    {
      icon: DollarSign,
      title: 'Bursar Portal',
      description: 'Financial management and fee collection',
      color: 'text-yellow-600',
    },
    {
      icon: Library,
      title: 'Library Portal',
      description: 'Catalog management and resource tracking',
      color: 'text-indigo-600',
    },
    {
      icon: Calendar,
      title: 'Head Teacher Portal',
      description: 'Academic supervision and curriculum planning',
      color: 'text-teal-600',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <GraduationCap className="h-16 w-16 text-primary" />
            <BookOpen className="h-12 w-12 text-accent" />
          </div>
          <h1 className="text-5xl font-bold text-primary mb-4">School20</h1>
          <p className="text-xl text-muted-foreground mb-2">
            Modern, Secure & Scalable School Management System
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <Badge variant="secondary" className="gap-1">
              <Globe className="h-3 w-3" />
              Web & Mobile Ready
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Role-Based Access
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Smartphone className="h-3 w-3" />
              Responsive Design
            </Badge>
          </div>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-primary mb-4">
            8 Specialized Portals
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
            Each role gets a tailored experience with features designed specifically for their needs.
            From comprehensive admin controls to student-friendly interfaces.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <feature.icon className={`h-8 w-8 ${feature.color} mb-2`} />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-blue-900">Secure & Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• JWT-based authentication</li>
                <li>• Role-based access control</li>
                <li>• Data encryption at rest</li>
                <li>• Audit logs and compliance</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-green-900">Smart Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-green-800 space-y-2">
                <li>• Real-time dashboards</li>
                <li>• Performance metrics</li>
                <li>• Automated reports</li>
                <li>• Predictive insights</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <Smartphone className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-purple-900">Mobile First</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-purple-800 space-y-2">
                <li>• Responsive design</li>
                <li>• Offline capabilities</li>
                <li>• Push notifications</li>
                <li>• Progressive Web App</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Ready to Transform Your School?</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of schools worldwide using School20 for better education management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
                Start Your Journey
                <GraduationCap className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
        <div classname="text-center">
          <P>
            For more systems, apps, websites, or need more information contact developer,Skyline Tech Solution +256705466283
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
