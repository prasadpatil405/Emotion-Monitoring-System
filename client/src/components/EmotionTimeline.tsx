import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

export function EmotionTimeline() {
  const { data: todaySessions } = useQuery({
    queryKey: ["/api/emotions/sessions/today"],
    refetchInterval: 2000,
  });

  // Transform data for Recharts
  const chartData = todaySessions?.map((session: any) => ({
    time: new Date(session.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    fullTime: new Date(session.timestamp),
    confidence: session.fusedConfidence,
    emotion: session.fusedEmotion,
    // Map emotion to a numeric score for "Mood" visualization if needed
    // But user asked for "Journey", so raw confidence + emotion tooltip is good.
  })) || [];

  // Filter to last 20 points to avoid overcrowding
  const displayData = chartData.slice(-20);

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      happy: "#10b981", // green
      sad: "#3b82f6",   // blue
      angry: "#ef4444", // red
      neutral: "#94a3b8", // slate
      surprised: "#f59e0b", // amber
      fearful: "#8b5cf6", // violet
      disgusted: "#84cc16", // lime
    };
    return colors[emotion?.toLowerCase()] || "#8884d8";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-panel p-3 border border-white/10 rounded-lg shadow-xl backdrop-blur-md bg-black/80">
          <p className="text-sm font-medium text-white mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getEmotionColor(data.emotion) }}
            />
            <p className="text-sm text-primary font-bold capitalize">
              {data.emotion}
            </p>
            <span className="text-xs text-muted-foreground">({data.confidence}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-panel border-white/10 h-[350px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-primary mr-2" />
            Today's Emotion Graph
          </div>
          {displayData.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Updates
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 pt-2">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#888', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorConfidence)"
                strokeWidth={2}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {displayData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            Waiting for session data to populate graph...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
