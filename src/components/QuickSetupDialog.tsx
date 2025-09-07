import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building,
  GraduationCap,
  Users,
  BookOpen,
  Settings,
  Calendar,
  Heart,
  UserPlus,
} from 'lucide-react';

interface QuickSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickSetupDialog = ({ open, onOpenChange }: QuickSetupDialogProps) => {
  const setupOptions = [
    {
      title: 'Academic Structure',
      description: 'Set up classes, sections, and academic years',
      icon: Building,
      action: () => {
        onOpenChange(false);
        window.location.href = '/admin/academic';
      },
      color: 'text-purple-600',
    },
    {
      title: 'Add Teachers',
      description: 'Enroll teaching staff into the system',
      icon: GraduationCap,
      action: () => {
        onOpenChange(false);
        window.location.href = '/admin/add-teacher';
      },
      color: 'text-blue-600',
    },
    {
      title: 'Add Parents',
      description: 'Register parent accounts',
      icon: Heart,
      action: () => {
        onOpenChange(false);
        window.location.href = '/admin/add-parent';
      },
      color: 'text-pink-600',
    },
    {
      title: 'Enroll Students',
      description: 'Add students to the system',
      icon: Users,
      action: () => {
        onOpenChange(false);
        window.location.href = '/admin/students';
      },
      color: 'text-green-600',
    },
    {
      title: 'Library Setup',
      description: 'Configure library catalog and items',
      icon: BookOpen,
      action: () => {
        onOpenChange(false);
        window.location.href = '/admin/library';
      },
      color: 'text-orange-600',
    },
    {
      title: 'System Settings',
      description: 'Configure school information and preferences',
      icon: Settings,
      action: () => {
        onOpenChange(false);
        window.location.href = '/admin/settings';
      },
      color: 'text-gray-600',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Setup Guide
          </DialogTitle>
          <DialogDescription>
            Set up essential components of your school management system quickly
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {setupOptions.map((option, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={option.action}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <option.icon className={`h-6 w-6 ${option.color}`} />
                  <h3 className="font-semibold text-sm">{option.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSetupDialog;