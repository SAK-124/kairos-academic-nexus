import { useNavigate } from "react-router-dom";
import { FileText, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Smart Notes",
      description: "AI-powered note-taking with flashcards and quizzes",
      route: "/notes",
      color: "text-blue-500",
    },
    {
      icon: Calendar,
      title: "Course Scheduler",
      description: "Build your perfect semester schedule with AI assistance",
      route: "/scheduler",
      color: "text-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-display-large font-bold mb-2">Welcome back!</h1>
          <p className="text-body-large text-muted-foreground">
            Choose a tool to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="cursor-pointer hover:shadow-[var(--elevation-3)] transition-shadow bg-surface-container"
              onClick={() => navigate(feature.route)}
            >
              <CardHeader>
                <feature.icon className={`h-12 w-12 mb-4 ${feature.color}`} />
                <CardTitle className="text-headline-large">{feature.title}</CardTitle>
                <CardDescription className="text-body-large">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" className="w-full">
                  Open {feature.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
