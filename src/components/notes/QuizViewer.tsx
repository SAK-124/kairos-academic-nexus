import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCw, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { QuizQuestionItem } from '@/types/ai';

interface QuizViewerProps {
  questions: QuizQuestionItem[];
  onClose: () => void;
  onGenerateMore?: () => void;
  isGenerating?: boolean;
}

export function QuizViewer({
  questions,
  onClose,
  onGenerateMore,
  isGenerating = false
}: QuizViewerProps) {
  const questionsArray = useMemo(
    () => (Array.isArray(questions) ? questions : []),
    [questions]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const isMobile = useIsMobile();
  const hasQuestions = questionsArray.length > 0;

  const currentQuestion = hasQuestions ? questionsArray[currentIndex] : undefined;

  const handleSelectAnswer = useCallback((answer: string) => {
    if (!showResults && currentQuestion) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: answer,
      }));
    }
  }, [currentQuestion, showResults]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < questionsArray.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [questionsArray.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    setShowResults(true);
    setCurrentIndex(0);
  }, []);

  const score = useMemo(() => {
    if (!showResults) return null;

    const correct = questionsArray.reduce((acc, question) => (
      selectedAnswers[question.id] === question.correct_answer ? acc + 1 : acc
    ), 0);

    return { correct, total: questionsArray.length };
  }, [questionsArray, selectedAnswers, showResults]);

  const allAnswered = useMemo(
    () => questionsArray.every((q) => selectedAnswers[q.id]),
    [questionsArray, selectedAnswers]
  );

  const isCorrect = useCallback((questionId: string) => {
    const question = questionsArray.find((q) => q.id === questionId);
    return selectedAnswers[questionId] === question?.correct_answer;
  }, [questionsArray, selectedAnswers]);

  useEffect(() => {
    if (!hasQuestions) {
      setCurrentIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      return;
    }

    setCurrentIndex((prev) => Math.min(prev, questionsArray.length - 1));
  }, [hasQuestions, questionsArray.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!hasQuestions) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card rounded-lg border p-8 shadow-lg text-center">
          <p className="text-muted-foreground mb-4">No questions available</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center",
      isMobile ? "p-2" : "p-4"
    )}>
      <div className={cn(
        "w-full max-h-[90vh] overflow-y-auto",
        isMobile ? "max-w-full" : "max-w-4xl"
      )}>
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className={cn(
          "bg-card rounded-lg border shadow-lg",
          isMobile ? "p-4" : "p-8"
        )}>
          {/* Results Screen */}
          {showResults && score && (
            <div className="text-center mb-8">
              <h2 className={cn(
                "font-bold mb-4",
                isMobile ? "text-2xl" : "text-3xl"
              )}>Quiz Results</h2>
              <div className="text-5xl font-bold text-primary mb-2">
                {score.correct}/{score.total}
              </div>
              <p className="text-muted-foreground">
                {Math.round((score.correct / score.total) * 100)}% Correct
              </p>
            </div>
          )}

          {/* Progress Indicator */}
          {!showResults && (
            <div className="text-center mb-6">
              <p className="text-muted-foreground">
                Question {currentIndex + 1} of {questionsArray.length}
              </p>
            </div>
          )}

          {/* Question */}
          <div className={cn("mb-8", isMobile && "mb-4")}>
            <h3 className={cn(
              "font-semibold mb-6",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              {currentQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestion.id] === option;
                const isCorrectAnswer = option === currentQuestion.correct_answer;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(option)}
                    disabled={showResults}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                      "hover:border-primary hover:bg-accent/50",
                      isSelected && !showResults && "border-primary bg-accent/50",
                      showResults && isCorrectAnswer && "border-green-500 bg-green-500/10",
                      showResults && isSelected && !isCorrectAnswer && "border-red-500 bg-red-500/10",
                      !showResults && !isSelected && "border-border"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      isSelected && !showResults && "border-primary bg-primary",
                      showResults && isCorrectAnswer && "border-green-500",
                      showResults && isSelected && !isCorrectAnswer && "border-red-500"
                    )}>
                      {isSelected && !showResults && (
                        <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                      )}
                      {showResults && isCorrectAnswer && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {showResults && isSelected && !isCorrectAnswer && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          {!showResults && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>

              {currentIndex === questionsArray.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!selectedAnswers[currentQuestion.id]}
                >
                  Next
                </Button>
              )}
            </div>
          )}

          {/* Results Navigation */}
          {showResults && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {isCorrect(currentQuestion.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isCorrect(currentQuestion.id) ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === questionsArray.length - 1}
              >
                Next
              </Button>
            </div>
          )}

          {/* Generate More Button */}
          {onGenerateMore && showResults && (
            <div className="flex justify-center mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={onGenerateMore}
                disabled={isGenerating}
              >
                <RotateCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
                Generate 10 More Questions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
