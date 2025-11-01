import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does Kairos generate schedules?",
    answer: "Kairos uses advanced AI algorithms to analyze your course data, preferences, and constraints to generate conflict-free schedules. It considers your preferred days, time windows, and instructor choices to rank the best combinations.",
  },
  {
    question: "Can I change my schedule after generating it?",
    answer: "Absolutely! Kairos supports dynamic re-planning. You can mark courses you already have, and the system will instantly recalculate new combinations while preserving your preferred structure.",
  },
  {
    question: "Is my data private and secure?",
    answer: "Yes. All your data is stored securely and encrypted. We never share your information with third parties. You have full control over your data and can delete it anytime.",
  },
  {
    question: "What makes the AI note system special?",
    answer: "Our AI notes feature smart formatting, autocomplete, markdown support, and a unique canvas mode for visual learners. You can search notes semantically, create mind maps, and organize everything by course automatically.",
  },
];

export const FAQSection = () => {
  return (
    <section id="faqs" className="py-24 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Frequently Asked <span className="text-primary">Questions</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          Everything you need to know about Kairos
        </p>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="bg-card border rounded-xl px-6 shadow-[var(--elevation-1)]">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-12 p-6 bg-muted/50 rounded-xl border text-center">
          <p className="text-sm text-muted-foreground">
            <strong>100% Privacy Guarantee:</strong> Your data is encrypted and never shared. Cancel anytime with full data deletion.
          </p>
        </div>
      </div>
    </section>
  );
};
