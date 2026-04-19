import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause, X, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface SuggestionTimerProps {
    activity: string;
    durationMinutes: number;
    onClose: () => void;
    onComplete?: () => void;
}

export function SuggestionTimer({ activity, durationMinutes, onClose, onComplete }: SuggestionTimerProps) {
    const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
    const [isActive, setIsActive] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((time) => {
                    if (time <= 1) {
                        clearInterval(interval);
                        handleComplete();
                        return 0;
                    }
                    return time - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const handleComplete = () => {
        setIsActive(false);
        setIsCompleted(true);
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        if (onComplete) onComplete();
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setIsCompleted(false);
        setTimeLeft(durationMinutes * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((durationMinutes * 60 - timeLeft) / (durationMinutes * 60)) * 100;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-background border-primary/20 shadow-2xl animate-in fade-in zoom-in duration-200">
                <CardHeader className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-2xl text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        {isCompleted ? "Great Job! 🎉" : "Wellness Break"}
                    </CardTitle>
                    <CardDescription className="text-center text-lg font-medium text-foreground/80">
                        {activity}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center space-y-8 pb-8">
                    {/* Timer Display */}
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        {/* Background Circle */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                className="stroke-muted-foreground/10"
                                strokeWidth="8"
                                fill="none"
                            />
                            {/* Progress Circle */}
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                className={cn(
                                    "transition-all duration-1000 ease-linear",
                                    isCompleted ? "stroke-green-500" : "stroke-primary"
                                )}
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={2 * Math.PI * 88}
                                strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                                strokeLinecap="round"
                            />
                        </svg>

                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className={cn(
                                "text-4xl font-mono font-bold tabular-nums",
                                isActive ? "animate-pulse" : "",
                                isCompleted ? "text-green-500" : "text-foreground"
                            )}>
                                {formatTime(timeLeft)}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
                                {isCompleted ? "Completed" : isActive ? "Running" : "Paused"}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-4">
                        {!isCompleted ? (
                            <>
                                <Button
                                    size="lg"
                                    className={cn(
                                        "w-32 transition-all",
                                        isActive ? "bg-secondary hover:bg-secondary/90" : "bg-primary hover:bg-primary/90"
                                    )}
                                    onClick={toggleTimer}
                                >
                                    {isActive ? (
                                        <>
                                            <Pause className="w-5 h-5 mr-2" /> Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5 mr-2" /> Start
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" size="icon" onClick={resetTimer}>
                                    <RotateCcw className="w-5 h-5" />
                                </Button>
                            </>
                        ) : (
                            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={onClose}>
                                <CheckCircle2 className="w-5 h-5 mr-2" /> Done
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
