import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onClose: () => void;
  isGenerating?: boolean;
}

export function FlashcardViewer({ 
  flashcards, 
  onClose, 
  isGenerating = false 
}: FlashcardViewerProps) {
  // Ensure flashcards is always an array
  const flashcardsArray = Array.isArray(flashcards) ? flashcards : [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const isMobile = useIsMobile();

  // Guard clause for empty flashcards
  if (flashcardsArray.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card rounded-lg border p-8 shadow-lg text-center">
          <p className="text-muted-foreground mb-4">No flashcards available</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const currentCard = flashcardsArray[currentIndex];

  const handleNext = () => {
    if (currentIndex < flashcardsArray.length - 1) {
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

  // Touch gesture handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left = next
      handleNext();
    }
    if (touchEnd - touchStart > 75) {
      // Swipe right = previous
      handlePrevious();
    }
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
  }, [currentIndex, flashcardsArray.length]);

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center",
      isMobile ? "p-2" : "p-4"
    )}>
      <div className={cn(
        "w-full relative",
        isMobile ? "max-w-full h-auto" : "max-w-4xl h-[600px]"
      )}>
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
        <div className={cn("text-center", isMobile ? "mb-4" : "mb-8")}>
          <p className={cn(
            "text-muted-foreground",
            isMobile ? "text-sm" : "text-base"
          )}>
            Card {currentIndex + 1} of {flashcardsArray.length}
          </p>
        </div>

        {/* Flashcard Container */}
        <div 
          className={cn(
            "relative w-full perspective-1000",
            isMobile ? "h-[300px]" : "h-[400px]"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={cn(
              "relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer",
              isFlipped && "rotate-y-180"
            )}
            onClick={handleFlip}
          >
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden">
              <div className={cn(
                "w-full h-full rounded-lg border-2 border-primary bg-card flex flex-col items-center justify-center shadow-lg",
                isMobile ? "p-4" : "p-8"
              )}>
                <p className="text-sm text-muted-foreground mb-4">Question</p>
                <p className={cn(
                  "text-center font-medium",
                  isMobile ? "text-lg" : "text-2xl"
                )}>
                  {currentCard.question}
                </p>
              </div>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden rotate-y-180">
              <div className={cn(
                "w-full h-full rounded-lg border-2 border-accent bg-card flex flex-col items-center justify-center shadow-lg",
                isMobile ? "p-4" : "p-8"
              )}>
                <p className="text-sm text-muted-foreground mb-4">Answer</p>
                <p className={cn(
                  "text-center font-medium",
                  isMobile ? "text-lg" : "text-2xl"
                )}>
                  {currentCard.answer}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className={cn(
          "flex items-center justify-center gap-4",
          isMobile ? "mt-4" : "mt-8"
        )}>
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
            size={isMobile ? "default" : "lg"}
            onClick={handleFlip}
            className={isMobile ? "min-w-[100px]" : "min-w-[120px]"}
          >
            {isFlipped ? 'Show Question' : 'Flip Card'}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === flashcardsArray.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Keyboard/Touch Hints */}
        <div className={cn(
          "text-center text-muted-foreground",
          isMobile ? "mt-4 text-xs" : "mt-6 text-sm"
        )}>
          {isMobile 
            ? "Swipe left/right or tap arrows • Tap card to flip" 
            : "Use ← → arrow keys to navigate • Space to flip • Esc to exit"}
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
