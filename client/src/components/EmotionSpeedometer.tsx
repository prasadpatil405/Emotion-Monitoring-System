
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";

interface EmotionSpeedometerProps {
    confidence: number;
    emotion: string | null;
    breakdown: Record<string, number> | null;
}

export function EmotionSpeedometer({ confidence, emotion, breakdown }: EmotionSpeedometerProps) {
    const validConfidence = isNaN(confidence) ? 0 : Math.max(0, Math.min(100, confidence));

    // Data for the semi-circle gauge
    const gaugeData = [
        { name: "Confidence", value: validConfidence, color: "hsl(var(--primary))" },
        { name: "Remaining", value: 100 - validConfidence, color: "rgba(255,255,255,0.1)" },
    ];

    // Helper to get color based on value
    const getProgressColor = (value: number) => {
        if (value >= 70) return "bg-green-500";
        if (value >= 40) return "bg-yellow-500";
        return "bg-slate-500";
    };

    // Sort breakdown by value descending
    const sortedBreakdown = breakdown
        ? Object.entries(breakdown)
            .sort(([, a], [, b]) => b - a)
            .filter(([, val]) => val > 0)
            .slice(0, 5) // Top 5
        : [];

    return (
        <Card className="glass-panel border-none h-full bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg font-bold text-white">
                    <Gauge className="w-5 h-5 mr-2 text-primary" />
                    Live Accuracy
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Speedometer Gauge */}
                <div className="relative h-[180px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={gaugeData}
                                cx="50%"
                                cy="70%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {gaugeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-4xl font-bold text-white">{validConfidence}%</div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                            {emotion || "Neutral"}
                        </p>
                    </div>
                </div>

                {/* Emotion Breakdown List */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Emotion Breakdown
                    </h4>

                    {sortedBreakdown.length > 0 ? (
                        sortedBreakdown.map(([emo, val]) => (
                            <div key={emo} className="group">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="capitalize text-white/90 group-hover:text-primary transition-colors">
                                        {emo === 'joy' ? 'Happy' : emo}
                                    </span>
                                    <span className="text-muted-foreground font-mono">{val}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(val)}`}
                                        style={{ width: `${val}%`, opacity: 0.8 }}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            Waiting for data...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
