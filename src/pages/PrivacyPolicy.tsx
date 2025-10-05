import { Navigation } from "@/components/Navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PrivacyPolicy = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data }) => {
            setIsAdmin(!!data);
          });
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      
      <Navigation 
        user={user} 
        isAdmin={isAdmin} 
        onAdminClick={() => {}} 
        onLoginClick={() => {}}
      />

      <main className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl border shadow-2xl p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            
            <div className="space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">1. Information We Collect</h2>
                <p>
                  Kairos collects information you provide directly to us, including your name, email address, 
                  university information, and course preferences. We also automatically collect usage data 
                  to improve our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
                <p>
                  We use the information we collect to provide, maintain, and improve Kairos services, 
                  including AI-powered scheduling, note-taking features, and personalized recommendations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">3. Data Security</h2>
                <p>
                  We implement industry-standard security measures to protect your personal information. 
                  All data is encrypted in transit and at rest using modern cryptographic protocols.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">4. Third-Party Services</h2>
                <p>
                  Kairos may use third-party services for analytics and authentication. These services 
                  have their own privacy policies governing the use of your information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">5. Your Rights</h2>
                <p>
                  You have the right to access, correct, or delete your personal information at any time. 
                  You may also opt out of marketing communications.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">6. Updates to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes 
                  by posting the new Privacy Policy on this page with an updated effective date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">7. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at privacy@kairos.app
                </p>
              </section>

              <p className="text-sm mt-8 pt-8 border-t">
                <strong>Last Updated:</strong> January 2025
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;