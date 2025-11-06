import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRightLeft, Clock, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">SlotSwapper</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="flex min-h-[80vh] flex-col items-center justify-center text-center py-20">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Swap Time Slots with
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> Your Team</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              SlotSwapper makes it easy to exchange calendar slots with teammates. 
              Mark your busy times as swappable and find better schedules together.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  <Calendar className="h-5 w-5" />
                  Start Swapping
                </Button>
              </Link>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Simple peer-to-peer time slot scheduling</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-2">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle>Create Your Events</CardTitle>
                <CardDescription>
                  Add your meetings and commitments to your personal calendar
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Mark as Swappable</CardTitle>
                <CardDescription>
                  Tag events you're willing to exchange with teammates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
                <CardTitle>Request & Swap</CardTitle>
                <CardDescription>
                  Browse the marketplace and exchange slots that work better for everyone
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="py-20">
          <Card className="border-2 bg-gradient-to-br from-card to-accent/10">
            <CardContent className="p-12">
              <div className="grid gap-8 md:grid-cols-2 items-center">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold">Built for Teams</h3>
                  <p className="text-muted-foreground text-lg">
                    SlotSwapper helps teams find scheduling flexibility through collaboration. 
                    No more rigid calendars—adapt your schedule with your teammates.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'JWT-based secure authentication',
                      'Real-time swap notifications',
                      'Accept or reject incoming requests',
                      'Track all your swap history'
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth">
                    <Button size="lg" className="mt-4">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
                    <Clock className="h-48 w-48 text-primary relative" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="font-semibold">SlotSwapper</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 SlotSwapper. Built for ServiceHive Technical Challenge.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
