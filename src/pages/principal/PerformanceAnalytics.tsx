import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  Calendar, 
  DollarSign,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

const PerformanceAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const overallMetrics = [
    {
      title: 'Student Enrollment',
      current: 1247,
      previous: 1183,
      change: 5.4,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Average Attendance',
      current: 94.5,
      previous: 92.3,
      change: 2.4,
      icon: Calendar,
      color: 'text-green-600',
      unit: '%',
    },
    {
      title: 'Academic Performance',
      current: 87.3,
      previous: 85.1,
      change: 2.6,
      icon: GraduationCap,
      color: 'text-purple-600',
      unit: '%',
    },
    {
      title: 'Budget Efficiency',
      current: 78.2,
      previous: 75.8,
      change: 3.2,
      icon: DollarSign,
      color: 'text-orange-600',
      unit: '%',
    },
  ];

  const departmentPerformance = [
    { department: 'Mathematics', performance: 89.5, trend: 'up', students: 245 },
    { department: 'English', performance: 87.2, trend: 'up', students: 267 },
    { department: 'Science', performance: 85.8, trend: 'down', students: 223 },
    { department: 'Social Studies', performance: 88.1, trend: 'up', students: 201 },
    { department: 'Arts', performance: 92.3, trend: 'up', students: 156 },
    { department: 'Physical Education', performance: 94.7, trend: 'stable', students: 289 },
  ];

  const gradePerformance = [
    { grade: 'Grade 9', enrollment: 156, attendance: 95.2, performance: 86.4 },
    { grade: 'Grade 10', enrollment: 148, attendance: 94.8, performance: 87.1 },
    { grade: 'Grade 11', enrollment: 142, attendance: 93.9, performance: 88.3 },
    { grade: 'Grade 12', enrollment: 138, attendance: 94.1, performance: 89.7 },
  ];

  const financialMetrics = [
    { category: 'Teacher Salaries', budget: 2500000, spent: 1950000, percentage: 78 },
    { category: 'Infrastructure', budget: 800000, spent: 620000, percentage: 77.5 },
    { category: 'Learning Materials', budget: 300000, spent: 245000, percentage: 81.7 },
    { category: 'Technology', budget: 450000, spent: 390000, percentage: 86.7 },
    { category: 'Maintenance', budget: 200000, spent: 156000, percentage: 78 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default: return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive school performance metrics and insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Overall School Performance</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {overallMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.current}{metric.unit || ''}
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{metric.change}%</span>
                  <span>vs last period</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="academic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="academic">Academic Performance</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment & Attendance</TabsTrigger>
          <TabsTrigger value="financial">Financial Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Academic performance by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentPerformance.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTrendIcon(dept.trend)}
                        <div>
                          <div className="font-medium">{dept.department}</div>
                          <div className="text-sm text-muted-foreground">{dept.students} students</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{dept.performance}%</div>
                        <Badge variant={dept.performance > 85 ? 'default' : 'secondary'}>
                          {dept.performance > 90 ? 'Excellent' : dept.performance > 85 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Grade Level Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Level Performance</CardTitle>
                <CardDescription>Performance metrics by grade level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gradePerformance.map((grade) => (
                    <div key={grade.grade} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{grade.grade}</h4>
                        <Badge variant="outline">{grade.enrollment} students</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Attendance:</span>
                          <span className="ml-2 font-medium">{grade.attendance}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Performance:</span>
                          <span className="ml-2 font-medium">{grade.performance}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Trends</CardTitle>
                <CardDescription>Student enrollment over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enrollment trend chart would be displayed here</p>
                  <p className="text-sm">Connect to a charting library for visualization</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Patterns</CardTitle>
                <CardDescription>Daily and monthly attendance trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Attendance pattern chart would be displayed here</p>
                  <p className="text-sm">Shows daily, weekly, and monthly attendance trends</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization</CardTitle>
              <CardDescription>Current fiscal year budget allocation and spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialMetrics.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.percentage > 85 ? 'bg-red-500' : 
                          item.percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.percentage}% utilized</span>
                      <Badge variant={item.percentage > 85 ? 'destructive' : 'default'}>
                        {item.percentage > 85 ? 'High Usage' : 'On Track'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceAnalytics;