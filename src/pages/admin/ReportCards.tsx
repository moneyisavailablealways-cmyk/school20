import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, Settings, BarChart3, Layout, Building2 } from 'lucide-react';
import SubmissionsApproval from '@/components/report-cards/SubmissionsApproval';
import ReportGeneration from '@/components/report-cards/ReportGeneration';
import GradingConfig from '@/components/report-cards/GradingConfig';
import ReportTemplates from '@/components/report-cards/ReportTemplates';
import ReportAnalytics from '@/components/report-cards/ReportAnalytics';
import SchoolSettings from '@/components/report-cards/SchoolSettings';

const ReportCards = () => {
  const [activeTab, setActiveTab] = useState('approvals');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Report Card Management</h1>
        <p className="text-muted-foreground">
          Manage marks submissions, approve reports, and generate report cards
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Approvals</span>
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Generate</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Grading</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="school" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">School</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <SubmissionsApproval />
        </TabsContent>

        <TabsContent value="generate">
          <ReportGeneration />
        </TabsContent>

        <TabsContent value="analytics">
          <ReportAnalytics />
        </TabsContent>

        <TabsContent value="grading">
          <GradingConfig />
        </TabsContent>

        <TabsContent value="templates">
          <ReportTemplates />
        </TabsContent>

        <TabsContent value="school">
          <SchoolSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportCards;
