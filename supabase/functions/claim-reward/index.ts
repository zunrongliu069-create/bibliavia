import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const authorization = request.headers.get('Authorization');
  if (!authorization) return new Response('Unauthorized', { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return new Response('Unauthorized', { status: 401 });

  const { requestId, rewardKey } = await request.json();
  if (typeof requestId !== 'string' || typeof rewardKey !== 'string')
    return new Response('Invalid request', { status: 400 });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('claim_reward_for_user', {
    p_user_id: userData.user.id,
    p_request_id: requestId,
    p_reward_key: rewardKey,
  });
  if (error) return new Response(error.message, { status: 400 });
  return Response.json(data);
});
