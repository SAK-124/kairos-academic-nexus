// WaitlistSection.tsx
import { WaitlistForm } from "@/components/WaitListForm";

export const WaitlistSection = () => {
  return (
    <section id="waitlist" className="pt-0 pb-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">        
        <div className="mt-16 max-w-2xl mx-auto">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
};
