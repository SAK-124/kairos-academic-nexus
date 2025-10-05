import { useEffect, useState } from "react";

const proofs = [
  "Trusted by IBA students",
  "Rapidly expanding network",
  "AI-powered scheduling",
  "Smart note-taking",
  "Collaborative learning",
];

export const SocialProofSection = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % (proofs.length * 200));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 overflow-hidden bg-muted/30">
      <div className="flex gap-8 whitespace-nowrap animate-fade-in">
        {[...proofs, ...proofs].map((proof, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-full border shadow-sm"
            style={{
              transform: `translateX(-${offset}px)`,
              transition: "transform 3s linear",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">{proof}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
