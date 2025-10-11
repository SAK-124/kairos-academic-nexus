export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
}

export type FlashcardResult = FlashcardItem[] | { flashcards?: FlashcardItem[]; error?: string };

export type QuizResult = QuizQuestionItem[] | { questions?: QuizQuestionItem[]; error?: string };
