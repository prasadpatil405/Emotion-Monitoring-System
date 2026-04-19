import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface EmotionData {
  joy: number;
  energy: number;
  calm: number;
  focus: number;
}

interface EmotionRadarProps {
  emotions?: EmotionData;
}

export function EmotionRadar({ emotions = { joy: 85, energy: 72, calm: 68, focus: 79 } }: EmotionRadarProps) {
  const emotionColors = {
    joy: "bg-accent",
    energy: "bg-primary", 
    calm: "bg-warning",
    focus: "bg-secondary"
  };

  const emotionPositions = {
    joy: { top: "8px", left: "50%", transform: "translateX(-50%)" },
    energy: { top: "50%", right: "8px", transform: "translateY(-50%)" },
    calm: { bottom: "32px", left: "50%", transform: "translateX(-50%)" },
    focus: { top: "50%", left: "24px", transform: "translateY(-50%)" }
  };

  return (
    <Card className="glassmorphism border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-5 h-5 text-accent mr-3" />
          Emotion Radar
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Radar Chart */}
        <div className="relative w-full h-64 flex items-center justify-center mb-6">
          <div className="relative w-48 h-48">
            {/* Radar background circles */}
            <div className="absolute inset-0 border border-muted-foreground/30 rounded-full"></div>
            <div className="absolute inset-4 border border-muted-foreground/20 rounded-full"></div>
            <div className="absolute inset-8 border border-muted-foreground/10 rounded-full"></div>
            
            {/* Emotion points */}
            {Object.entries(emotions).map(([emotion, value], index) => {
              const position = emotionPositions[emotion as keyof typeof emotionPositions];
              const intensity = value / 100;
              const size = 8 + intensity * 8; // Size based on intensity
              
              return (
                <div
                  key={emotion}
                  className={`absolute w-3 h-3 ${emotionColors[emotion as keyof typeof emotionColors]} rounded-full emotion-bubble shadow-lg`}
                  style={{
                    ...position,
                    width: `${size}px`,
                    height: `${size}px`,
                    boxShadow: `0 0 ${intensity * 20}px ${
                      emotion === 'joy' ? '#10B981' :
                      emotion === 'energy' ? '#6366F1' :
                      emotion === 'calm' ? '#F59E0B' : '#EC4899'
                    }40`
                  }}
                  title={`${emotion}: ${value}%`}
                />
              );
            })}
            
            {/* Center point */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-primary shadow-lg"></div>
            
            {/* Radar lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              <line x1="50%" y1="50%" x2="50%" y2="0%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="0%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            </svg>
          </div>
        </div>
        
        {/* Emotion Labels */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(emotions).map(([emotion, value]) => (
            <div key={emotion} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 ${emotionColors[emotion as keyof typeof emotionColors]} rounded-full mr-2`}></div>
                <span className="capitalize">{emotion}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {value}%
              </Badge>
            </div>
          ))}
        </div>
        
        {/* Overall Score */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Balance</span>
            <Badge className="bg-gradient-to-r from-primary to-accent text-white">
              {Math.round(Object.values(emotions).reduce((a, b) => a + b, 0) / Object.values(emotions).length)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
