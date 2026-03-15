import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { email, password } = await req.json();

  // Try to find existing user first
  const { data: users } = await supabase.auth.admin.listUsers();
  const existing = users?.users?.find((u: any) => u.email === email);

  if (existing) {
    // Update password
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    return new Response(JSON.stringify({ success: true, message: 'Password updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Create new user
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  return new Response(JSON.stringify({ success: true, message: 'Admin created' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
