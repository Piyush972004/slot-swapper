import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Check, X, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';

type SwapRequest = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  requester_event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  owner_event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  requester: {
    name: string;
  };
  owner: {
    name: string;
  };
};

const Requests = () => {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      // Fetch incoming requests (where user is the owner)
      const { data: incoming, error: incomingError } = await supabase
        .from('swap_requests')
        .select(`
          *,
          requester_event:events!swap_requests_requester_event_id_fkey (
            id,
            title,
            start_time,
            end_time
          ),
          owner_event:events!swap_requests_owner_event_id_fkey (
            id,
            title,
            start_time,
            end_time
          ),
          requester:profiles!swap_requests_requester_id_fkey (
            name
          ),
          owner:profiles!swap_requests_owner_id_fkey (
            name
          )
        `)
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      // Fetch outgoing requests (where user is the requester)
      const { data: outgoing, error: outgoingError } = await supabase
        .from('swap_requests')
        .select(`
          *,
          requester_event:events!swap_requests_requester_event_id_fkey (
            id,
            title,
            start_time,
            end_time
          ),
          owner_event:events!swap_requests_owner_event_id_fkey (
            id,
            title,
            start_time,
            end_time
          ),
          requester:profiles!swap_requests_requester_id_fkey (
            name
          ),
          owner:profiles!swap_requests_owner_id_fkey (
            name
          )
        `)
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      setIncomingRequests(incoming || []);
      setOutgoingRequests(outgoing || []);
    } catch (error: any) {
      toast.error('Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('swap_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'swap_requests',
            filter: `owner_id=eq.${user.id},requester_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleResponse = async (request: SwapRequest, accept: boolean) => {
    try {
      if (accept) {
        // Accept the swap - exchange event ownership
        const { error: swap1Error } = await supabase
          .from('events')
          .update({ 
            user_id: request.requester_event.id,
            status: 'BUSY'
          })
          .eq('id', request.owner_event.id);

        if (swap1Error) throw swap1Error;

        const { error: swap2Error } = await supabase
          .from('events')
          .update({ 
            user_id: request.owner_event.id,
            status: 'BUSY'
          })
          .eq('id', request.requester_event.id);

        if (swap2Error) throw swap2Error;

        // Update swap request status
        const { error: updateError } = await supabase
          .from('swap_requests')
          .update({ status: 'ACCEPTED' })
          .eq('id', request.id);

        if (updateError) throw updateError;

        toast.success('Swap accepted! Events have been exchanged.');
      } else {
        // Reject the swap - set events back to SWAPPABLE
        const { error: revert1Error } = await supabase
          .from('events')
          .update({ status: 'SWAPPABLE' })
          .eq('id', request.owner_event.id);

        if (revert1Error) throw revert1Error;

        const { error: revert2Error } = await supabase
          .from('events')
          .update({ status: 'SWAPPABLE' })
          .eq('id', request.requester_event.id);

        if (revert2Error) throw revert2Error;

        // Update swap request status
        const { error: updateError } = await supabase
          .from('swap_requests')
          .update({ status: 'REJECTED' })
          .eq('id', request.id);

        if (updateError) throw updateError;

        toast.info('Swap request rejected.');
      }

      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process swap request');
    }
  };

  const getStatusBadge = (status: SwapRequest['status']) => {
    const variants = {
      PENDING: { variant: 'outline' as const, label: 'Pending' },
      ACCEPTED: { variant: 'default' as const, label: 'Accepted' },
      REJECTED: { variant: 'secondary' as const, label: 'Rejected' },
    };
    
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const renderRequest = (request: SwapRequest, isIncoming: boolean) => (
    <Card key={request.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            {isIncoming ? request.requester.name : request.owner.name}
          </CardTitle>
          {getStatusBadge(request.status)}
        </div>
        <CardDescription>
          {format(new Date(request.created_at), 'PPp')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {isIncoming ? 'They Offer' : 'You Offer'}
            </p>
            <p className="font-semibold">{request.requester_event.title}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(request.requester_event.start_time), 'PPp')}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {isIncoming ? 'For Your' : 'For Their'}
            </p>
            <p className="font-semibold">{request.owner_event.title}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(request.owner_event.start_time), 'PPp')}
            </p>
          </div>
        </div>

        {isIncoming && request.status === 'PENDING' && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => handleResponse(request, true)}
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleResponse(request, false)}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Swap Requests</h1>
          <p className="text-muted-foreground">Manage incoming and outgoing swap requests</p>
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="incoming">
              Incoming ({incomingRequests.filter(r => r.status === 'PENDING').length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Outgoing ({outgoingRequests.filter(r => r.status === 'PENDING').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading requests...</div>
            ) : incomingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No incoming requests</p>
                  <p className="text-sm text-muted-foreground">
                    You'll see swap requests from other users here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {incomingRequests.map((request) => renderRequest(request, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading requests...</div>
            ) : outgoingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No outgoing requests</p>
                  <p className="text-sm text-muted-foreground">
                    Request a swap from the marketplace to see it here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {outgoingRequests.map((request) => renderRequest(request, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Requests;
