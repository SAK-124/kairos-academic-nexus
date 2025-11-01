import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { credentialId, challengeId, email } = await req.json();
    
    console.log('Verifying WebAuthn credential:', credentialId);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verify challenge exists and hasn't expired
    const { data: challengeData, error: challengeError } = await supabase
      .from('webauthn_challenges')
      .select('*')
      .eq('id', challengeId)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (challengeError || !challengeData) {
      console.error('Challenge error:', challengeError);
      throw new Error('Invalid or expired challenge');
    }
    
    console.log('Challenge verified');
    
    // Look up credential
    const { data: credential, error: credError } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .single();
    
    if (credError) {
      // First time using this passkey - register it
      console.log('New credential, registering for:', email);
      
      // Find or create user
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      let user = users?.find(u => u.email === email);
      
      if (!user) {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
        });
        
        if (createError) {
          console.error('User creation error:', createError);
          throw createError;
        }
        user = newUser.user;
      }
      
      // Store the credential
      const { error: insertError } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: user!.id,
          user_email: email,
          credential_id: credentialId,
          public_key: 'placeholder', // In production, store actual public key
          counter: 0,
        });
      
      if (insertError) {
        console.error('Credential storage error:', insertError);
        throw insertError;
      }
      
      console.log('Credential registered successfully');
    } else {
      console.log('Existing credential found for user:', credential.user_email);
      
      // Update last used timestamp
      await supabase
        .from('webauthn_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', credential.id);
    }
    
    // Clean up used challenge
    await supabase
      .from('webauthn_challenges')
      .delete()
      .eq('id', challengeId);
    
    console.log('Verification complete');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        email: credential?.user_email || email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
