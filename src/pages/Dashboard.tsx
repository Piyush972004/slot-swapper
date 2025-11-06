import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const eventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type EventFormData = z.infer<typeof eventSchema>;

type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
};

const Dashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      startTime: '',
      endTime: '',
    },
  });

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const onSubmit = async (data: EventFormData) => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          user_id: user?.id,
          title: data.title,
          start_time: new Date(data.startTime).toISOString(),
          end_time: new Date(data.endTime).toISOString(),
          status: 'BUSY',
        });

      if (error) throw error;
      
      toast.success('Event created successfully');
      setDialogOpen(false);
      form.reset();
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    }
  };

  const toggleSwappable = async (event: Event) => {
    if (event.status === 'SWAP_PENDING') {
      toast.error('Cannot modify event during pending swap');
      return;
    }

    const newStatus = event.status === 'BUSY' ? 'SWAPPABLE' : 'BUSY';
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (error) throw error;
      
      toast.success(`Event marked as ${newStatus.toLowerCase()}`);
      fetchEvents();
    } catch (error: any) {
      toast.error('Failed to update event');
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success('Event deleted');
      fetchEvents();
    } catch (error: any) {
      toast.error('Failed to delete event');
    }
  };

  const getStatusBadge = (status: Event['status']) => {
    const variants = {
      BUSY: { variant: 'secondary' as const, label: 'Busy' },
      SWAPPABLE: { variant: 'default' as const, label: 'Swappable' },
      SWAP_PENDING: { variant: 'outline' as const, label: 'Swap Pending' },
    };
    
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Calendar</h1>
            <p className="text-muted-foreground">Manage your time slots</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Add a new time slot to your calendar
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    placeholder="Team Meeting"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    {...form.register('startTime')}
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    {...form.register('endTime')}
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full">Create Event</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading events...</div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No events yet</p>
              <p className="text-sm text-muted-foreground">Create your first event to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    {getStatusBadge(event.status)}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(event.start_time), 'PPp')}
                  </CardDescription>
                  <CardDescription>
                    to {format(new Date(event.end_time), 'p')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleSwappable(event)}
                      disabled={event.status === 'SWAP_PENDING'}
                    >
                      {event.status === 'BUSY' ? 'Make Swappable' : 'Mark as Busy'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEvent(event.id)}
                      disabled={event.status === 'SWAP_PENDING'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
