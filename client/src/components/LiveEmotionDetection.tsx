import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEmotionDetection } from "@/hooks/useEmotionDetection";
import { Video, VideoOff, Mic, MicOff, Eye, MessageSquare } from "lucide-react";

interface LiveEmotionDetectionProps {
  currentEmotion: string | null;
  confidence: number;
  isAnalyzing: boolean;
  startAnalysis: (stream: MediaStream) => void;
  stopAnalysis: () => void;
}

export function LiveEmotionDetection({
  currentEmotion,
  confidence,
  isAnalyzing,
  startAnalysis,
  stopAnalysis
}: LiveEmotionDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Ensure stream is attached to video element when it becomes available
  useEffect(() => {
    if (videoRef.current && stream && isVideoEnabled) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoEnabled]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      // If we already have a stream (audio only), add video track
      if (stream) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        stream.addTrack(videoTrack);

        // Video ref stream assignment moved to useEffect
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsVideoEnabled(true);
      } else {
        // Fresh start
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isAudioEnabled
        });

        setStream(mediaStream);
        // Video ref stream assignment moved to useEffect
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsVideoEnabled(true);
        startAnalysis(mediaStream);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop(); // Stop only video track
        stream.removeTrack(videoTrack);
      }
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoEnabled(false);

    // If audio is also disabled, then stop analysis
    if (!isAudioEnabled) {
      stopAnalysis();
      setStream(null);
    }
  };

  const toggleAudio = async () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];

      if (isAudioEnabled) {
        // Disable audio
        if (audioTrack) {
          audioTrack.stop();
          stream.removeTrack(audioTrack);
        }
        setIsAudioEnabled(false);

        // If video is also disabled, stop everything
        if (!isVideoEnabled) {
          stopAnalysis();
          setStream(null);
        }
      } else {
        // Enable audio
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newAudioTrack = audioStream.getAudioTracks()[0];
          stream.addTrack(newAudioTrack);
          setIsAudioEnabled(true);
        } catch (error) {
          console.error("Error accessing microphone:", error);
        }
      }
    } else {
      // No stream active, start with audio only
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(mediaStream);
        setIsAudioEnabled(true);
        startAnalysis(mediaStream);
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    }
  };

  return (
    <Card className="glassmorphism border-white/20 emotion-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 text-primary mr-3" />
            Live Emotion Analysis
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isAnalyzing && (
              <>
                <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                <Badge variant="secondary" className="bg-accent/20 text-accent">Live</Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Feed */}
        <div className="relative bg-surface rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {isVideoEnabled ? (
            <video
              id="live-emotion-video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-light to-surface flex items-center justify-center">
              <div className="text-center">
                <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Camera not active</p>
                <p className="text-sm text-muted-foreground mt-2">Click start to begin emotion analysis</p>
              </div>
            </div>
          )}

          {/* Emotion Detection Overlay */}
          {isVideoEnabled && currentEmotion && (
            <div className="absolute top-4 left-4 glassmorphism rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{currentEmotion}</span>
                <span className="text-sm text-muted-foreground">{confidence}%</span>
              </div>
            </div>
          )}

          {/* Face Detection Indicator */}
          {isVideoEnabled && isAnalyzing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary rounded-lg opacity-60 animate-pulse-slow"></div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={isVideoEnabled ? stopCamera : startCamera}
              className={isVideoEnabled ? "bg-destructive hover:bg-destructive/80" : "bg-primary hover:bg-primary/80"}
            >
              {isVideoEnabled ? <VideoOff className="w-4 h-4 mr-2" /> : <Video className="w-4 h-4 mr-2" />}
              {isVideoEnabled ? "Stop" : "Start"} Camera
            </Button>

            <Button
              variant="outline"
              onClick={toggleAudio}
              className="glassmorphism border-white/20"
            >
              {isAudioEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
              {isAudioEnabled ? "Disable" : "Enable"} Audio
            </Button>
          </div>
        </div>

        {/* Multi-Modal Status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-surface/50 rounded-lg">
            <Eye className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Facial</p>
            <p className="text-xs text-accent">{isVideoEnabled ? "Active" : "Inactive"}</p>
          </div>

          <div className="text-center p-3 bg-surface/50 rounded-lg">
            <Mic className="w-5 h-5 text-secondary mx-auto mb-2" />
            <p className="text-sm font-medium">Voice</p>
            <p className="text-xs text-accent">{isAudioEnabled ? "Listening" : "Disabled"}</p>
          </div>

          <div className="text-center p-3 bg-surface/50 rounded-lg">
            <MessageSquare className="w-5 h-5 text-warning mx-auto mb-2" />
            <p className="text-sm font-medium">Text</p>
            <p className="text-xs text-muted-foreground">Standby</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
