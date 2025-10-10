import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onClose: () => void;
  onGenerateMore?: () => void;
  isGenerating?: boolean;
}

export function FlashcardViewer({ 
  flashcards, 
  onClose, 
  onGenerateMore,
  isGenerating = false 
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') {
        e.preventDefault();
        handleFlip();
      }
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, flashcards.length]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[600px] relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Progress Indicator */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </p>
        </div>

        {/* Flashcard Container */}
        <div className="relative w-full h-[400px] perspective-1000">
          <div
            className={cn(
              "relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer",
              isFlipped && "rotate-y-180"
            )}
            onClick={handleFlip}
          >
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden">
              <div className="w-full h-full rounded-lg border-2 border-primary bg-card p-8 flex flex-col items-center justify-center shadow-lg">
                <p className="text-sm text-muted-foreground mb-4">Question</p>
                <p className="text-2xl text-center font-medium">
                  {currentCard.question}
                </p>
              </div>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden rotate-y-180">
              <div className="w-full h-full rounded-lg border-2 border-accent bg-card p-8 flex flex-col items-center justify-center shadow-lg">
                <p className="text-sm text-muted-foreground mb-4">Answer</p>
                <p className="text-2xl text-center font-medium">
                  {currentCard.answer}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="default"
            size="lg"
            onClick={handleFlip}
            className="min-w-[120px]"
          >
            {isFlipped ? 'Show Question' : 'Flip Card'}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Generate More Button */}
        {onGenerateMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={onGenerateMore}
              disabled={isGenerating}
            >
              <RotateCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
              Generate 10 More
            </Button>
          </div>
        )}

        {/* Keyboard Hints */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          Use ← → arrow keys to navigate • Space to flip • Esc to exit
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
