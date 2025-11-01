const proofs = [
  "Trusted by IBA students",
  "Rapidly expanding network",
  "AI-powered scheduling",
  "Smart note-taking",
  "Collaborative learning",
];

export const SocialProofSection = () => {
  return (
    <section className="py-12 overflow-hidden bg-background">
      <div className="relative flex">
        <div className="flex gap-8 whitespace-nowrap animate-scroll">
          {[...proofs, ...proofs, ...proofs].map((proof, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-xl border shadow-[var(--elevation-1)] flex-shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-medium">{proof}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
