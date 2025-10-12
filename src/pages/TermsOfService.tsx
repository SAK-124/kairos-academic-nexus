import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";

const TermsOfService = () => {
  const { user } = useAuth();
  const isAdmin = useAdminStatus(user);

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
              Terms of Service
            </h1>
            
            <div className="space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Kairos, you accept and agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">2. Use of Service</h2>
                <p>
                  Kairos provides AI-powered academic planning tools including course scheduling, note-taking, 
                  and collaboration features. You agree to use these services only for lawful purposes and 
                  in accordance with these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">3. User Accounts</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials and 
                  for all activities that occur under your account. You must notify us immediately of any 
                  unauthorized use.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">4. Intellectual Property</h2>
                <p>
                  All content, features, and functionality of Kairos are owned by us and are protected by 
                  international copyright, trademark, and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">5. User Content</h2>
                <p>
                  You retain ownership of any content you submit to Kairos. By submitting content, you grant 
                  us a license to use, store, and process that content to provide our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">6. Prohibited Activities</h2>
                <p>
                  You may not: (a) violate any laws or regulations; (b) infringe on intellectual property rights; 
                  (c) transmit harmful code or malware; (d) attempt to gain unauthorized access to our systems; 
                  or (e) interfere with other users' experience.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">7. Disclaimer of Warranties</h2>
                <p>
                  Kairos is provided "as is" without warranties of any kind. We do not guarantee that our 
                  services will be uninterrupted, secure, or error-free.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">8. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, Kairos shall not be liable for any indirect, 
                  incidental, special, or consequential damages arising from your use of our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">9. Termination</h2>
                <p>
                  We may terminate or suspend your account at any time for violations of these Terms or 
                  for any other reason at our discretion.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">10. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of any 
                  material changes via email or through our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">11. Contact Information</h2>
                <p>
                  For questions about these Terms, please contact us at legal@kairos.app
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

export default TermsOfService;