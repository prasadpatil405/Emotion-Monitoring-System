import { Navigation } from "@/components/Navigation";
import { ThreeJSBackground } from "@/components/ThreeJSBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, TrendingUp, Download, Filter } from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const { data: emotionHistory } = useQuery({
    queryKey: ["/api/emotions/history"],
  });

  const { data: recentSessions } = useQuery({
    queryKey: ["/api/emotions/sessions", { limit: 20 }],
  });

  return (
    <div className="min-h-screen relative">
      <ThreeJSBackground />
      <Navigation />
      
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Emotion History</h1>
              <p className="text-muted-foreground text-lg">Track your emotional journey over time</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="glassmorphism border-white/20">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" className="glassmorphism border-white/20">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glassmorphism border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78</div>
                <p className="text-xs text-muted-foreground">Average Mood Score</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-accent mr-1" />
                  <span className="text-sm text-accent">+5% from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-primary mr-1" />
                  <span className="text-sm text-primary">+12% increase</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dominant Emotion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">😊 Happy</div>
                <p className="text-xs text-muted-foreground">65% of sessions</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-accent">Most consistent week</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historical Chart */}
          <Card className="glassmorphism border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 text-primary mr-3" />
                Mood Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <p>Mood trend chart will be displayed here</p>
                  <p className="text-sm mt-2">Showing emotion patterns over the last 30 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card className="glassmorphism border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="w-5 h-5 text-accent mr-3" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-4" />
                    <p>No emotion sessions recorded yet</p>
                    <p className="text-sm mt-2">Start using the dashboard to track your emotions</p>
                  </div>
                ) : (
                  recentSessions?.slice(0, 10).map((session: any, index: number) => (
                    <div key={session.id || index} className="flex items-center justify-between p-4 bg-surface/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                          <span className="text-xl">😊</span>
                        </div>
                        <div>
                          <p className="font-medium">{session.fusedEmotion || 'Happy'}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.timestamp ? format(new Date(session.timestamp), 'PPpp') : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{session.fusedConfidence || 85}%</p>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                      </div>
                    </div>
                  )) || []
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
