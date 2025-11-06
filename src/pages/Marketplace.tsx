import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';

type MarketplaceEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
  profiles: {
    name: string;
    email: string;
  };
};

type MyEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
};

const Marketplace = () => {
  const { user } = useAuth();
  const [availableSlots, setAvailableSlots] = useState<MarketplaceEvent[]>([]);
  const [mySwappableSlots, setMySwappableSlots] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<MarketplaceEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAvailableSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq('status', 'SWAPPABLE')
        .neq('user_id', user?.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error: any) {
      toast.error('Failed to load available slots');
    }
  };

  const fetchMySwappableSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('user_id', user?.id)
        .eq('status', 'SWAPPABLE')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setMySwappableSlots(data || []);
    } catch (error: any) {
      toast.error('Failed to load your swappable slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAvailableSlots();
      fetchMySwappableSlots();
    }
  }, [user]);

  const requestSwap = async (myEventId: string) => {
    if (!selectedSlot) return;

    try {
      // Create swap request
      const { error: requestError } = await supabase
        .from('swap_requests')
        .insert({
          requester_id: user?.id,
          requester_event_id: myEventId,
          owner_id: selectedSlot.user_id,
          owner_event_id: selectedSlot.id,
          status: 'PENDING',
        });

      if (requestError) throw requestError;

      // Update both events to SWAP_PENDING
      const { error: updateError1 } = await supabase
        .from('events')
        .update({ status: 'SWAP_PENDING' })
        .eq('id', myEventId);

      if (updateError1) throw updateError1;

      const { error: updateError2 } = await supabase
        .from('events')
        .update({ status: 'SWAP_PENDING' })
        .eq('id', selectedSlot.id);

      if (updateError2) throw updateError2;

      toast.success('Swap request sent!');
      setDialogOpen(false);
      setSelectedSlot(null);
      fetchAvailableSlots();
      fetchMySwappableSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send swap request');
    }
  };

  const openSwapDialog = (slot: MarketplaceEvent) => {
    if (mySwappableSlots.length === 0) {
      toast.error('You need at least one swappable slot to request a swap');
      return;
    }
    setSelectedSlot(slot);
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Browse and request swappable time slots</p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading available slots...</div>
        ) : availableSlots.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No swappable slots available</p>
              <p className="text-sm text-muted-foreground">Check back later for new opportunities</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableSlots.map((slot) => (
              <Card key={slot.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{slot.title}</CardTitle>
                    <Badge>Available</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(slot.start_time), 'PPp')}
                  </CardDescription>
                  <CardDescription>
                    to {format(new Date(slot.end_time), 'p')}
                  </CardDescription>
                  <CardDescription className="flex items-center gap-1 pt-2">
                    <Users className="h-3 w-3" />
                    Offered by {slot.profiles.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full gap-2"
                    onClick={() => openSwapDialog(slot)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Request Swap
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Your Slot to Swap</DialogTitle>
              <DialogDescription>
                Choose one of your swappable slots to offer in exchange
              </DialogDescription>
            </DialogHeader>
            
            {selectedSlot && (
              <div className="mb-4 p-4 border rounded-lg bg-accent/50">
                <p className="text-sm font-medium mb-1">Requesting:</p>
                <p className="font-semibold">{selectedSlot.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSlot.start_time), 'PPp')} - {format(new Date(selectedSlot.end_time), 'p')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Your swappable slots:</p>
              {mySwappableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don't have any swappable slots. Mark a slot as swappable first.
                </p>
              ) : (
                mySwappableSlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => requestSwap(slot.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{slot.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(slot.start_time), 'PPp')} - {format(new Date(slot.end_time), 'p')}
                      </p>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Marketplace;
