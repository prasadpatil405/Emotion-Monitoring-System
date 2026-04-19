import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { ThreeJSBackground } from "@/components/ThreeJSBackground";
import { Brain, Eye, Mic, MessageSquare } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", name: "" },
  });

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.username, data.password);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await register(data.username, data.password, data.name);
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <ThreeJSBackground />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center space-x-3 animate-float">
            <div className="w-16 h-16 bg-gradient-to-br from-primary via-accent to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3 hover:rotate-6 transition-transform duration-300">
              <Brain className="w-8 h-8 text-white drop-shadow-md" />
              <div className="absolute -top-2 -right-2">
                <span className="flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-accent"></span>
                </span>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary drop-shadow-sm">
              EmotionAI
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome to the Future</h2>
            <p className="text-muted-foreground">Advanced emotion monitoring for adolescents</p>
          </div>

          {/* Feature icons */}
          <div className="flex items-center justify-center space-x-8 py-4">
            <div className="text-center group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors border border-primary/20">
                <Eye className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Facial</p>
            </div>
            <div className="text-center group">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:bg-secondary/20 transition-colors border border-secondary/20">
                <Mic className="w-6 h-6 text-secondary group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Voice</p>
            </div>
            <div className="text-center group">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:bg-accent/20 transition-colors border border-accent/20">
                <MessageSquare className="w-6 h-6 text-accent group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Text</p>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="glass-panel border-border/50 shadow-2xl backdrop-blur-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
              <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Login</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="p-2">
              <CardHeader className="space-y-1 px-2">
                <CardTitle className="text-2xl">Welcome back!</CardTitle>
                <CardDescription>Sign in to continue your emotional journey</CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      {...loginForm.register("username")}
                      className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                      placeholder="Enter your username"
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                      className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                      placeholder="Enter your password"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/20"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register" className="p-2">
              <CardHeader className="space-y-1 px-2">
                <CardTitle className="text-2xl">Create account</CardTitle>
                <CardDescription>Start your personalized experience</CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      {...registerForm.register("name")}
                      className="bg-background/50 border-input"
                      placeholder="John Doe"
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      {...registerForm.register("username")}
                      className="bg-background/50 border-input"
                      placeholder="johndoe"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      {...registerForm.register("password")}
                      className="bg-background/50 border-input"
                      placeholder="••••••••"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/20"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
