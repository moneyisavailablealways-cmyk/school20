import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';

const Schedule = () => {
  // This would typically fetch schedule data from the database
  const scheduleData = [
    {
      day: 'Monday',
      classes: [
        { time: '08:00 - 09:00', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101' },
        { time: '09:00 - 10:00', subject: 'Mathematics', class: 'Class 10B', room: 'Room 101' },
        { time: '11:00 - 12:00', subject: 'Mathematics', class: 'Class 9A', room: 'Room 101' },
      ]
    },
    {
      day: 'Tuesday',
      classes: [
        { time: '08:00 - 09:00', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101' },
        { time: '10:00 - 11:00', subject: 'Mathematics', class: 'Class 9B', room: 'Room 101' },
        { time: '14:00 - 15:00', subject: 'Mathematics', class: 'Class 10B', room: 'Room 101' },
      ]
    },
    {
      day: 'Wednesday',
      classes: [
        { time: '09:00 - 10:00', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101' },
        { time: '11:00 - 12:00', subject: 'Mathematics', class: 'Class 9A', room: 'Room 101' },
        { time: '13:00 - 14:00', subject: 'Mathematics', class: 'Class 10B', room: 'Room 101' },
      ]
    },
    {
      day: 'Thursday',
      classes: [
        { time: '08:00 - 09:00', subject: 'Mathematics', class: 'Class 9B', room: 'Room 101' },
        { time: '10:00 - 11:00', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101' },
        { time: '15:00 - 16:00', subject: 'Mathematics', class: 'Class 9A', room: 'Room 101' },
      ]
    },
    {
      day: 'Friday',
      classes: [
        { time: '09:00 - 10:00', subject: 'Mathematics', class: 'Class 10B', room: 'Room 101' },
        { time: '11:00 - 12:00', subject: 'Mathematics', class: 'Class 9B', room: 'Room 101' },
        { time: '14:00 - 15:00', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">
          Your weekly teaching schedule
        </p>
      </div>

      {/* Schedule Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleData.reduce((total, day) => total + day.classes.length, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teaching Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleData.reduce((total, day) => total + day.classes.length, 0)} hrs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule */}
      <div className="grid gap-4">
        {scheduleData.map((daySchedule) => (
          <Card key={daySchedule.day}>
            <CardHeader>
              <CardTitle className="text-lg">{daySchedule.day}</CardTitle>
              <CardDescription>
                {daySchedule.classes.length} classes scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {daySchedule.classes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No classes scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {daySchedule.classes.map((classItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium text-primary">
                          {classItem.time}
                        </div>
                        <div>
                          <div className="font-medium">{classItem.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            {classItem.class}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {classItem.room}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Note */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              This is a sample schedule. In a real implementation, this would be
              connected to a timetable management system.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Schedule;