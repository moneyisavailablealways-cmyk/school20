import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Check, Eye, Layout } from 'lucide-react';

const templatePreviews = {
  classic: {
    name: 'Classic Template',
    description: 'Traditional report card layout with clean, professional design. Best for formal schools.',
    features: ['Header with school logo', 'Structured performance table', 'Clean typography', 'Formal layout'],
    color: 'bg-slate-100 border-slate-300',
  },
  modern: {
    name: 'Modern Template',
    description: 'Contemporary design with charts and visual elements. Great for progressive schools.',
    features: ['Performance charts', 'Visual grade indicators', 'Modern typography', 'Color-coded sections'],
    color: 'bg-blue-50 border-blue-200',
  },
  minimal: {
    name: 'Minimal Template',
    description: 'Simple and clean minimalist design. Perfect for schools preferring simplicity.',
    features: ['Clean white space', 'Essential info only', 'Simple typography', 'Quick to scan'],
    color: 'bg-gray-50 border-gray-200',
  },
  colorful: {
    name: 'Colorful Template',
    description: 'Vibrant colors and engaging design. Ideal for primary schools.',
    features: ['Vibrant colors', 'Fun illustrations', 'Engaging layout', 'Kid-friendly'],
    color: 'bg-purple-50 border-purple-200',
  },
};

const ReportTemplates = () => {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      
      // Find currently selected template
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
      
      return data;
    },
  });

  // Set default template mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // First, unset all defaults
      await supabase
        .from('report_templates')
        .update({ is_default: false })
        .neq('id', '');

      // Then set the new default
      const { error } = await supabase
        .from('report_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Default template updated');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleSetDefault = () => {
    if (selectedTemplate) {
      setDefaultMutation.mutate(selectedTemplate);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Report Card Templates
              </CardTitle>
              <CardDescription>
                Choose a template for generating report cards
              </CardDescription>
            </div>
            <Button 
              onClick={handleSetDefault}
              disabled={!selectedTemplate || setDefaultMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Set as Default
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {templates?.map(template => {
              const preview = templatePreviews[template.template_type as keyof typeof templatePreviews];
              const isDefault = template.is_default;

              return (
                <div
                  key={template.id}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTemplate === template.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  } ${preview?.color || ''}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={template.id} className="text-lg font-semibold cursor-pointer">
                          {template.name}
                        </Label>
                        {isDefault && (
                          <Badge className="bg-green-500">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {preview?.description || template.description}
                      </p>
                      {preview?.features && (
                        <ul className="mt-3 space-y-1">
                          {preview.features.map((feature, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <Check className="h-3 w-3 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Template Preview */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-8 bg-white">
              {/* Mock Report Card Preview */}
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b pb-4">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-2 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">School Name</h2>
                  <p className="text-sm text-muted-foreground">School Motto</p>
                  <p className="text-lg font-semibold mt-2">STUDENT REPORT CARD</p>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Student Name:</strong> John Doe</p>
                    <p><strong>Admission No:</strong> STU001</p>
                  </div>
                  <div>
                    <p><strong>Class:</strong> Form 4</p>
                    <p><strong>Term:</strong> Term 1, 2024</p>
                  </div>
                </div>

                {/* Performance Table */}
                <div className="border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Subject</th>
                        <th className="p-2 text-center">Marks</th>
                        <th className="p-2 text-center">Grade</th>
                        <th className="p-2 text-left">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2">Mathematics</td>
                        <td className="p-2 text-center">85</td>
                        <td className="p-2 text-center"><Badge>D2</Badge></td>
                        <td className="p-2">Very Good</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2">English</td>
                        <td className="p-2 text-center">78</td>
                        <td className="p-2 text-center"><Badge>C3</Badge></td>
                        <td className="p-2">Good</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2">Physics</td>
                        <td className="p-2 text-center">92</td>
                        <td className="p-2 text-center"><Badge className="bg-green-500">D1</Badge></td>
                        <td className="p-2">Excellent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded">
                    <p className="text-2xl font-bold">85.0</p>
                    <p className="text-xs text-muted-foreground">Average</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p className="text-2xl font-bold">D2</p>
                    <p className="text-xs text-muted-foreground">Grade</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p className="text-2xl font-bold">I</p>
                    <p className="text-xs text-muted-foreground">Division</p>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-muted rounded">
                    <p><strong>Class Teacher:</strong> Keep up the excellent work!</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p><strong>Head Teacher:</strong> Outstanding performance.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportTemplates;
