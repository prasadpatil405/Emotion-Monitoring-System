import { Navigation } from "@/components/Navigation";
import { ThreeJSBackground } from "@/components/ThreeJSBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Lightbulb, Activity, Quote, Heart, CheckCircle } from "lucide-react";

export default function Suggestions() {
  const [startedActivities, setStartedActivities] = useState<Set<number>>(new Set());
  const [savedQuotes, setSavedQuotes] = useState<Set<number>>(new Set());

  const { data: suggestions } = useQuery({
    queryKey: ["/api/suggestions"],
  });

  const handleStartActivity = (index: number) => {
    setStartedActivities(prev => new Set(prev).add(index));
    // Here you could also track the activity start in the backend
  };

  const handleSaveQuote = (index: number) => {
    setSavedQuotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const activitySuggestions = [
    {
      title: "Take a Nature Walk",
      description: "Fresh air will enhance your positive mood",
      duration: "15-30 min",
      difficulty: "Easy",
      icon: "🚶‍♀️"
    },
    {
      title: "Creative Journaling",
      description: "Express your thoughts and feelings",
      duration: "10-20 min", 
      difficulty: "Easy",
      icon: "📝"
    },
    {
      title: "Breathing Exercise",
      description: "Maintain your calm and centered feeling",
      duration: "5-10 min",
      difficulty: "Easy", 
      icon: "🧘‍♀️"
    }
  ];

  const quotes = [
    {
      text: "Happiness is not something ready-made. It comes from your own actions.",
      author: "Dalai Lama",
      category: "Motivation"
    },
    {
      text: "The best way to take care of the future is to take care of the present moment.",
      author: "Thich Nhat Hanh",
      category: "Mindfulness"
    },
    {
      text: "You are never too old to set another goal or to dream a new dream.",
      author: "C.S. Lewis",
      category: "Inspiration"
    }
  ];

  return (
    <div className="min-h-screen relative">
      <ThreeJSBackground />
      <Navigation />
      
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Personalized Suggestions</h1>
            <p className="text-muted-foreground text-lg">Activities and inspiration tailored to your current mood</p>
          </div>

          {/* Current Mood Banner */}
          <Card className="glassmorphism border-white/20 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">😊</div>
                  <div>
                    <h3 className="text-xl font-semibold">You're feeling Happy!</h3>
                    <p className="text-muted-foreground">Here are some suggestions to keep up this positive energy</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-accent/20 text-accent">87% Confidence</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Activity Suggestions */}
          <div className="mb-8">
            <Card className="glassmorphism border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 text-accent mr-3" />
                  Recommended Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activitySuggestions.map((activity, index) => (
                  <div key={index} className="bg-surface/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{activity.icon}</span>
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className={startedActivities.has(index) ? "bg-green-600 hover:bg-green-700" : "bg-accent hover:bg-accent/80"}
                        onClick={() => handleStartActivity(index)}
                      >
                        {startedActivities.has(index) ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Started
                          </>
                        ) : (
                          "Start"
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>⏱️ {activity.duration}</span>
                      <span>📊 {activity.difficulty}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Daily Inspiration */}
          <Card className="glassmorphism border-white/20 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Quote className="w-5 h-5 text-warning mr-3" />
                Daily Inspiration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quotes.map((quote, index) => (
                  <div key={index} className="bg-surface/50 rounded-lg p-6 text-center">
                    <Quote className="w-8 h-8 text-warning mx-auto mb-4" />
                    <blockquote className="italic text-muted-foreground mb-4">
                      "{quote.text}"
                    </blockquote>
                    <div>
                      <p className="font-medium">- {quote.author}</p>
                      <Badge variant="outline" className="mt-2 text-xs">{quote.category}</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`mt-4 ${savedQuotes.has(index) ? 'text-red-500 hover:text-red-600' : 'text-warning hover:text-warning/80'}`}
                      onClick={() => handleSaveQuote(index)}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${savedQuotes.has(index) ? 'fill-current' : ''}`} />
                      {savedQuotes.has(index) ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Wellness Tips */}
          <Card className="glassmorphism border-white/20 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 text-primary mr-3" />
                Wellness Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface/50 rounded-lg p-4 border-l-4 border-primary">
                  <h4 className="font-medium text-primary mb-2">Maintain Your Energy</h4>
                  <p className="text-sm text-muted-foreground">Stay hydrated and take short breaks every hour to keep your positive energy flowing throughout the day.</p>
                </div>
                <div className="bg-surface/50 rounded-lg p-4 border-l-4 border-accent">
                  <h4 className="font-medium text-accent mb-2">Share Your Joy</h4>
                  <p className="text-sm text-muted-foreground">Consider reaching out to a friend or family member to share your positive mood - happiness is contagious!</p>
                </div>
                <div className="bg-surface/50 rounded-lg p-4 border-l-4 border-secondary">
                  <h4 className="font-medium text-secondary mb-2">Practice Gratitude</h4>
                  <p className="text-sm text-muted-foreground">Take a moment to reflect on what's making you feel good today. Write down three things you're grateful for.</p>
                </div>
                <div className="bg-surface/50 rounded-lg p-4 border-l-4 border-warning">
                  <h4 className="font-medium text-warning mb-2">Plan Something Fun</h4>
                  <p className="text-sm text-muted-foreground">Use this positive energy to plan something enjoyable for later today or this week.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
