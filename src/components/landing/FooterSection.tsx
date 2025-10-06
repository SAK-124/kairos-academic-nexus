import { useNavigate } from "react-router-dom";

export const FooterSection = () => {
  const navigate = useNavigate();

  return (
    <footer className="py-12 border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row: Brand + Links */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">Kairos</h3>
            <p className="text-muted-foreground">
              Your AI-Powered Academic Companion
            </p>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-primary transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => navigate("/contact")}
              className="hover:text-primary transition-colors"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          © 2025 Kairos. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
