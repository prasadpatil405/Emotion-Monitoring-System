import { Navigation } from "@/components/Navigation";
import { ThreeJSBackground } from "@/components/ThreeJSBackground";
import { LiveEmotionDetection } from "@/components/LiveEmotionDetection";
import { EmotionSpeedometer } from "@/components/EmotionSpeedometer";
import { EmotionRadar } from "@/components/EmotionRadar";
import { EmotionTimeline } from "@/components/EmotionTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEmotionDetection } from "@/hooks/useEmotionDetection";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Brain, Lightbulb, Clock, Download, Settings, MessageSquare, BarChart3, Zap, Quote, Activity, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { generateEmotionSuggestions } from "@/lib/emotionEngine";
import { useMemo } from "react";
import { SuggestionTimer } from "@/components/SuggestionTimer";

export default function Dashboard() {
  const { user } = useAuth();
  const {
    currentEmotion,
    confidence,
    isAnalyzing,
    breakdown,
    startAnalysis,
    stopAnalysis
  } = useEmotionDetection();
  const [, setLocation] = useLocation();
  const [radarEmotions, setRadarEmotions] = useState({
    joy: 65,
    energy: 72,
    calm: 68,
    focus: 79
  });

  const [activeSuggestion, setActiveSuggestion] = useState<{ activity: string; duration: number } | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    emotion: string;
    confidence: number;
    suggestions: { music: string[]; activities: string[]; quotes: string[] };
  } | null>(null);
  const { analyzeText } = useEmotionDetection();

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) return;
    try {
      // Analyze text to get sentiment
      const result = await analyzeText(textInput);

      if (result) {
        // Map sentiment to emotion for suggestions
        const detectedEmotion = result.sentiment === 'positive' ? 'happy' :
          (result.sentiment === 'negative' ? 'sad' : 'neutral');

        // Generate specific suggestions based on the analysis
        const suggestions = generateEmotionSuggestions(detectedEmotion, result.confidence);

        setAnalysisResult({
          emotion: detectedEmotion,
          confidence: result.confidence,
          suggestions
        });
      }
    } catch (e) {
      console.error(e);
    }
    // Do NOT close modal, show result instead
  };

  const closeTextModal = () => {
    setShowTextModal(false);
    setAnalysisResult(null);
    setTextInput("");
  };

  const handleSuggestionClick = (text: string) => {
    // Extract time if present (e.g., "15 mins")
    const timeMatch = text.match(/(\d+)\s*mins?/);
    const duration = timeMatch ? parseInt(timeMatch[1]) : 5; // Default to 5 mins
    setActiveSuggestion({ activity: text, duration });
  };

  const { data: todaySessions } = useQuery<any[]>({
    queryKey: ["/api/emotions/sessions/today"],
    refetchInterval: 2000, // Refresh every 2 seconds for live stats
  });



  const dynamicSuggestions = useMemo(() => {
    return generateEmotionSuggestions(currentEmotion || 'neutral', confidence);
  }, [currentEmotion, confidence]);

  const uniqueInsight = useMemo(() => {
    if (!currentEmotion) return "Waiting for emotion data...";
    if (confidence > 80) return `Strong ${currentEmotion} signals detected.`;
    if (confidence < 40) return `Subtle hints of ${currentEmotion}.`;
    return `Consistent ${currentEmotion} expression.`;
  }, [currentEmotion, confidence]);

  // Update radar emotions based on current emotion detection
  useEffect(() => {
    if (currentEmotion && confidence > 0) {
      setRadarEmotions(prev => {
        const newEmotions = { ...prev };

        // Map detected emotions to radar categories
        switch (currentEmotion.toLowerCase()) {
          case 'happy':
          case 'joyful':
            newEmotions.joy = confidence; // Use REAL confidence (e.g. 78, 85)
            break;
          case 'energetic':
          case 'excited':
            newEmotions.energy = confidence; // Use REAL confidence
            break;
          case 'calm':
          case 'peaceful':
            newEmotions.calm = confidence;
            break;
          case 'focused':
          case 'contemplative':
            newEmotions.focus = confidence;
            break;
          case 'cry':
          case 'crying':
            // Cry = Low Joy, High Energy (sobbing), Low Calm, Moderate Focus
            newEmotions.joy = Math.max(10, 30 - Math.random() * 10);
            newEmotions.energy = Math.min(95, confidence + Math.random() * 10);
            newEmotions.calm = Math.max(10, 20 - Math.random() * 10);
            newEmotions.focus = Math.max(30, 50 + Math.random() * 10);
            break;
          case 'sad':
            // Sad = Low Joy, Low Energy, Moderate Calm (passive), Low Focus
            newEmotions.joy = Math.max(10, 20 + Math.random() * 10);
            newEmotions.energy = Math.max(10, 30 + Math.random() * 10);
            newEmotions.calm = Math.min(80, 50 + Math.random() * 20);
            newEmotions.focus = Math.max(10, 30 + Math.random() * 10);
            break;
          case 'angry':
            // Angry = Low Joy, High Energy, Low Calm, High Focus (tunnel vision)
            newEmotions.joy = Math.max(5, 15 + Math.random() * 10);
            newEmotions.energy = Math.min(95, 80 + Math.random() * 15);
            newEmotions.calm = Math.max(5, 10 + Math.random() * 10);
            newEmotions.focus = Math.min(90, 70 + Math.random() * 20);
            break;
          case 'fearful':
          case 'fear':
            // Fear = Low Joy, High Energy (panic), Low Calm, High Focus (alert)
            newEmotions.joy = Math.max(5, 10 + Math.random() * 10);
            newEmotions.energy = Math.min(95, 85 + Math.random() * 10);
            newEmotions.calm = Math.max(5, 10 + Math.random() * 5);
            newEmotions.focus = Math.min(90, 80 + Math.random() * 15);
            break;
          case 'disgusted':
          case 'disgust':
            // Disgust = Low Joy, Moderate Energy, Low Calm, Moderate Focus
            newEmotions.joy = Math.max(5, 10 + Math.random() * 10);
            newEmotions.energy = Math.max(30, 50 + Math.random() * 10);
            newEmotions.calm = Math.max(20, 40 + Math.random() * 10);
            newEmotions.focus = Math.max(30, 50 + Math.random() * 10);
            break;
          case 'neutral':
            // Neutral = Moderate everything
            newEmotions.joy = 50 + (Math.random() - 0.5) * 10;
            newEmotions.energy = 50 + (Math.random() - 0.5) * 10;
            newEmotions.calm = 70 + (Math.random() - 0.5) * 10;
            newEmotions.focus = 50 + (Math.random() - 0.5) * 10;
            break;
          default:
            // Gradually adjust all values based on general confidence
            Object.keys(newEmotions).forEach(key => {
              const current = newEmotions[key as keyof typeof newEmotions];
              const adjustment = (Math.random() - 0.5) * 10;
              newEmotions[key as keyof typeof newEmotions] = Math.max(40, Math.min(90, current + adjustment));
            });
        }

        return newEmotions;
      });
    }
  }, [currentEmotion, confidence]);

  const sessionsCount = todaySessions?.length || 0;
  const moodScore = Math.round((Object.values(radarEmotions).reduce((a, b) => a + b, 0) / 4));
  const dominantEmotion = currentEmotion ? `${currentEmotion.charAt(0).toUpperCase() + currentEmotion.slice(1)}` : "Neutral";

  return (
    <div className="min-h-screen relative">
      <ThreeJSBackground />
      <Navigation />

      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, <span className="text-primary">{user?.name || "User"}</span>! 👋
            </h1>
            <p className="text-muted-foreground text-lg">Let's check in on your emotional journey today.</p>
          </div>

          {/* Real-time Analysis Section */}
          {/* Real-time Analysis Section with Speedometer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2">
              <LiveEmotionDetection
                currentEmotion={currentEmotion}
                confidence={confidence}
                isAnalyzing={isAnalyzing}
                startAnalysis={startAnalysis}
                stopAnalysis={stopAnalysis}
              />
            </div>
            <div className="md:col-span-1 h-full">
              <EmotionSpeedometer
                confidence={confidence}
                emotion={currentEmotion}
                breakdown={breakdown}
              />
            </div>
          </div>
          {/* <EmotionRadar emotions={radarEmotions} /> User requested removal/simplification */}

          {/* Emotion Timeline and Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
              <EmotionTimeline />
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              {/* Dominant Emotion */}
              <Card className="glass-panel interactive-card text-center border-none">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-3 animate-bounce-subtle">😊</div>
                  <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Dominant Today</p>
                  <p className="text-2xl font-bold text-accent mt-1 glow-text-primary">{dominantEmotion}</p>
                </CardContent>
              </Card>

              {/* Mood Score */}
              <Card className="glass-panel interactive-card border-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Mood Score</span>
                    <span className="text-2xl font-bold text-accent glow-text-secondary">{moodScore}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-secondary via-primary to-accent h-3 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.5)] transition-all duration-1000 ease-out"
                      style={{ width: `${moodScore}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              {/* Sessions Today */}
              <Card className="glass-panel interactive-card border-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Sessions</p>
                      <p className="text-3xl font-bold mt-1">{sessionsCount}</p>
                    </div>
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Suggestions and Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* Personalized Suggestions */}
            <Card className="glass-panel border-none">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Lightbulb className="w-6 h-6 text-warning mr-3" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-warning to-yellow-200">
                    Suggested for You ({currentEmotion || 'Neutral'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Activity Suggestion */}
                <div className="bg-card/40 hover:bg-card/60 transition-colors rounded-xl p-4 flex items-center space-x-4 border border-border/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-secondary to-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{dynamicSuggestions.activities[0] || "Take a deep breath"}</p>
                    <p className="text-sm text-muted-foreground">Recommended activity</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-accent hover:bg-white/5"
                    onClick={() => handleSuggestionClick(dynamicSuggestions.activities[0] || "Take a deep breath")}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>

                {/* Music Suggestion */}
                <div className="bg-card/40 hover:bg-card/60 transition-colors rounded-xl p-4 flex items-center space-x-4 border border-border/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{dynamicSuggestions.music[0] || "Calming Lo-Fi"}</p>
                    <p className="text-sm text-muted-foreground">Recommended playlist</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-accent hover:bg-white/5"
                    onClick={() => handleSuggestionClick("Listen to music for 10 mins")}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quote of the Day */}
                <div className="bg-gradient-to-br from-card/40 to-transparent rounded-xl p-6 border border-border/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Quote className="w-16 h-16 text-white" />
                  </div>
                  <div className="flex items-center mb-3">
                    <Quote className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm font-medium text-accent uppercase tracking-widest">Thought for now</span>
                  </div>
                  <p className="text-lg italic text-foreground/90 leading-relaxed">"{dynamicSuggestions.quotes[0] || "Stay positive."}"</p>
                  <p className="text-sm text-muted-foreground mt-3 font-medium">- Daily Wisdom</p>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="glass-panel border-none">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Brain className="w-6 h-6 text-accent mr-3" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-400">AI Insights (Live)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Insight Card */}
                <div className="bg-card/40 rounded-xl p-5 border-l-4 border-accent hover:bg-card/60 transition-colors">
                  <h4 className="font-semibold text-accent mb-2 flex items-center">
                    <Zap className="w-4 h-4 mr-2" /> Real-time Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{uniqueInsight}</p>
                </div>

                {/* Pattern Recognition */}
                <div className="bg-card/40 rounded-xl p-5 border-l-4 border-primary hover:bg-card/60 transition-colors">
                  <h4 className="font-semibold text-primary mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" /> Current Vibe
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You appear to be feeling <span className="font-bold text-foreground">{currentEmotion || 'neutral'}</span> with {confidence}% confidence.
                    {dynamicSuggestions.activities[1] ? ` Maybe try to ${dynamicSuggestions.activities[1].toLowerCase()}?` : ''}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="bg-card/40 rounded-xl p-5 border-l-4 border-secondary hover:bg-card/60 transition-colors">
                  <h4 className="font-semibold text-secondary mb-2 flex items-center">
                    <Activity className="w-4 h-4 mr-2" /> Focus Tip
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {confidence > 70 ? "High clarity in expression detected. Good time for communication." : "Expression is subtle. Check lighting for better accuracy."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="glass-panel border-none">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Zap className="w-6 h-6 text-yellow-400 mr-3" />
                <span className="text-white">Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="ghost"
                  className="bg-surface/50 hover:bg-surface-light/50 h-auto p-4 flex-col space-y-2"
                  onClick={() => setShowTextModal(true)}
                >
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Text Check-in</p>
                    <p className="text-xs text-muted-foreground">Analyze your thoughts</p>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="bg-surface/50 hover:bg-surface-light/50 h-auto p-4 flex-col space-y-2"
                  onClick={() => setLocation('/history')}
                >
                  <BarChart3 className="w-6 h-6 text-accent" />
                  <div className="text-center">
                    <p className="font-medium">View History</p>
                    <p className="text-xs text-muted-foreground">See your progress</p>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="bg-surface/50 hover:bg-surface-light/50 h-auto p-4 flex-col space-y-2"
                  onClick={() => {
                    try {
                      const doc = new jsPDF();

                      // Title
                      doc.setFontSize(22);
                      doc.setTextColor(139, 92, 246); // Primary color (Purple)
                      doc.text("Emotion AI Report", 20, 20);

                      // Metadata
                      doc.setFontSize(12);
                      doc.setTextColor(100);
                      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
                      doc.text(`User: ${user?.name || 'Guest'}`, 20, 36);

                      // Current Status Section
                      doc.setFontSize(16);
                      doc.setTextColor(0);
                      doc.text("Current Emotional State", 20, 50);

                      doc.setFontSize(14);
                      doc.text(`Dominant Emotion: ${currentEmotion || 'Neutral'}`, 20, 60);
                      doc.text(`Confidence Level: ${confidence}%`, 20, 68);

                      // Radar Data Table
                      doc.setFontSize(16);
                      doc.text("Detailed Metrics", 20, 85);

                      const tableData = [
                        ['Joy', `${Math.round(radarEmotions.joy)}%`, 'High'],
                        ['Energy', `${Math.round(radarEmotions.energy)}%`, 'Balanced'],
                        ['Calm', `${Math.round(radarEmotions.calm)}%`, 'Steady'],
                        ['Focus', `${Math.round(radarEmotions.focus)}%`, 'Sharp']
                      ];

                      autoTable(doc, {
                        startY: 90,
                        head: [['Metric', 'Current Value', 'Target Status']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { fillColor: [139, 92, 246] },
                        styles: { fontSize: 12 }
                      });

                      // Footer
                      const pageCount = (doc as any).internal.getNumberOfPages();
                      for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setFontSize(10);
                        doc.setTextColor(150);
                        doc.text('Emotion AI - Real-time Analysis', 20, doc.internal.pageSize.height - 10);
                      }

                      doc.save(`emotion-report-${new Date().toISOString().split('T')[0]}.pdf`);
                    } catch (error) {
                      console.error("PDF Generation Error:", error);
                      alert("Failed to generate PDF report");
                    }
                  }}
                >
                  <Download className="w-6 h-6 text-secondary" />
                  <div className="text-center">
                    <p className="font-medium">Export Data</p>
                    <p className="text-xs text-muted-foreground">Download reports</p>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="bg-surface/50 hover:bg-surface-light/50 h-auto p-4 flex-col space-y-2"
                  onClick={() => setLocation('/suggestions')}
                >
                  <Settings className="w-6 h-6 text-warning" />
                  <div className="text-center">
                    <p className="font-medium">Settings</p>
                    <p className="text-xs text-muted-foreground">Customize experience</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Text Check-in Modal */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background p-6 rounded-lg max-w-md w-full border border-white/10 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Text Check-in & Analysis</h3>

            <div className="mb-4">
              <textarea
                placeholder="How are you feeling today? Share your thoughts..."
                className="w-full p-4 rounded-lg bg-surface border border-white/20 text-white min-h-[100px] focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/50"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            </div>

            {analysisResult && (
              <div className="mb-6 p-4 bg-surface/50 rounded-lg border border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm text-muted-foreground">Detected Emotion:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg capitalize text-primary">{analysisResult.emotion}</span>
                    <span className="text-sm bg-primary/20 px-2 py-1 rounded-full text-primary">{analysisResult.confidence}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2 mb-1">
                      <Zap className="w-3 h-3" /> Recommended Activities
                    </span>
                    <p className="text-sm text-white">{analysisResult.suggestions.activities[0] || "Take a moment for yourself."}</p>
                  </div>

                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2 mb-1">
                      <Activity className="w-3 h-3" /> Improvement Tip
                    </span>
                    <p className="text-sm text-white">{analysisResult.suggestions.activities[1] || "Practice mindfulness."}</p>
                  </div>

                  {analysisResult.suggestions.quotes[0] && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs italic text-muted-foreground">"{analysisResult.suggestions.quotes[0]}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleTextAnalyze} className="flex-1 bg-primary hover:bg-primary/90" disabled={!textInput.trim()}>
                {analysisResult ? 'Re-Analyze' : 'Analyze Emotion'}
              </Button>
              <Button variant="outline" onClick={closeTextModal} className="bg-transparent border-white/20 hover:bg-white/10">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeSuggestion && (
        <SuggestionTimer
          activity={activeSuggestion.activity}
          durationMinutes={activeSuggestion.duration}
          onClose={() => setActiveSuggestion(null)}
        />
      )}
    </div>
  );
}
