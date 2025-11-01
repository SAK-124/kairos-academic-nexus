import { NewsletterForm } from "@/components/NewsletterForm";

export const NewsletterSection = () => {
  return (
    <section id="newsletter" className="py-24 px-4 bg-surface-container-low">
      <div className="max-w-2xl mx-auto">
        <NewsletterForm />
      </div>
    </section>
  );
};
