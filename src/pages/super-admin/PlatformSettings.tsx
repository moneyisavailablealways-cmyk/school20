import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Globe, Shield, Server } from 'lucide-react';

const PlatformSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Configure global School20 platform settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-violet-600" />
              Platform Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Name</span>
              <span className="font-medium">School20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <Badge className="bg-violet-100 text-violet-800">SaaS Multi-tenant</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Default Timezone</span>
              <span className="font-medium">Africa/Kampala</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-green-600" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auth Provider</span>
              <Badge className="bg-green-100 text-green-800">Supabase Auth</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Isolation</span>
              <Badge className="bg-green-100 text-green-800">school_id RLS</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cross-school Access</span>
              <Badge className="bg-red-100 text-red-800">Blocked</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="w-4 h-4 text-blue-600" />
              Contact — Platform Owner
            </CardTitle>
            <CardDescription>Skyline Tech Solutions</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>📞 +256705466283</p>
            <p>🌐 https://school20.lovable.app</p>
            <p className="text-muted-foreground text-xs mt-3">For platform-level support, feature requests, and enterprise inquiries, contact Skyline Tech Solutions.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformSettings;
