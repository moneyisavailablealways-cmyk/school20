import React, { useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import CreateAppointmentDialog from '@/components/CreateAppointmentDialog';
import AppointmentsList from '@/components/AppointmentsList';

const AppointmentsPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const appointmentsListRef = useRef<{ refetch: () => void }>(null);

  const handleAppointmentCreated = () => {
    appointmentsListRef.current?.refetch();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? 'View and monitor all appointment requests' 
                : 'Manage your meeting requests with staff and other users'}
            </p>
          </div>
          {!isAdmin && <CreateAppointmentDialog onSuccess={handleAppointmentCreated} />}
        </div>
      </div>

      <AppointmentsList ref={appointmentsListRef} />
    </div>
  );
};

export default AppointmentsPage;
