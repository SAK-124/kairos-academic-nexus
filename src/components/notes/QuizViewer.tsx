import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCw, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
}

interface QuizViewerProps {
  questions: QuizQuestion[];
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentIndex];
  const allAnswered = questions.every(q => selectedAnswers[q.id]);

  const handleSelectAnswer = (answer: string) => {
    if (!showResults) {
      setSelectedAnswers({
        ...selectedAnswers,
        [currentQuestion.id]: answer
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
    setCurrentIndex(0); // Reset to first question for review
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        correct++;
      }
    });
    return { correct, total: questions.length };
  };

  const isCorrect = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    return selectedAnswers[questionId] === question?.correct_answer;
  };

  const score = showResults ? calculateScore() : null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="bg-card rounded-lg border p-8 shadow-lg">
          {/* Results Screen */}
          {showResults && score && (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Quiz Results</h2>
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
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
          )}

          {/* Question */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-6">
              {currentQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestion.id] === option;
                const isCorrectAnswer = option === currentQuestion.correct_answer;
                const showCorrectness = showResults && isSelected;

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

              {currentIndex === questions.length - 1 ? (
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
                disabled={currentIndex === questions.length - 1}
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
