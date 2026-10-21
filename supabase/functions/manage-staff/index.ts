import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const roles = new Set(['facility_manager', 'procurement', 'supervisor', 'finance', 'admin', 'ict_admin', 'technician']);
const executiveRoles = new Set(['admin', 'ict_admin']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'Authentication required' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return response({ error: 'Server configuration is incomplete' }, 500);

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await callerClient.auth.getUser();
  if (authError || !user) return response({ error: 'Invalid session' }, 401);

  const admin = createClient(url, serviceKey);
  const { data: actor } = await admin.from('profiles').select('id, role, site_id, site_ids, active').eq('auth_user_id', user.id).maybeSingle();
  if (!actor?.active || (actor.role !== 'admin' && actor.role !== 'ict_admin' && actor.role !== 'facility_manager' && actor.role !== 'supervisor')) {
    return response({ error: 'Administrator, supervisor, or facility manager access required' }, 403);
  }
  const isAdmin = actor.role === 'admin';
  const isIct = actor.role === 'ict_admin';
  const isSupervisor = actor.role === 'supervisor';
  const actorSites: string[] = [actor.site_id, ...(actor.site_ids ?? [])].filter(Boolean);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request body' }, 400);
  }

  const action = String(body.action ?? 'invite');

  if (action === 'create') {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : '';
    const role = String(body.role ?? '');
    const siteId = body.siteId ? String(body.siteId) : null;
    const siteIds = Array.isArray(body.siteIds) ? body.siteIds.map(String).filter(Boolean) : [];
    const department = String(body.department ?? '').trim();
    const trade = body.trade ? String(body.trade).trim() : '';
    const password = String(body.password ?? '');
    const notes = body.notes ? String(body.notes).trim() : '';

    if (!name || !email || !roles.has(role) || !password) {
      return response({ error: 'Name, email, password, and a valid role are required' }, 400);
    }
    if (isIct && executiveRoles.has(role)) {
      return response({ error: 'ICT admins cannot create executive/administrator accounts' }, 403);
    }
    if (!isAdmin && !isIct) {
      if (role !== 'technician') return response({ error: 'Facility managers and supervisors can only create technicians' }, 403);
      if (!isSupervisor && (!siteId || !actorSites.includes(siteId))) return response({ error: 'Technicians can only be assigned to your facility' }, 403);
    }
    if ((role === 'facility_manager' || role === 'technician') && !siteId) {
      return response({ error: 'This role must be assigned to a site' }, 400);
    }
    if (password.length < 8) {
      return response({ error: 'Password must be at least 8 characters' }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, department, site_id: siteId, phone, trade },
    });
    if (createError || !created.user) return response({ error: createError?.message ?? 'Unable to create user' }, 400);

    const profileId = crypto.randomUUID();
    const allSiteIds = (isAdmin || isIct) && siteIds.length ? siteIds : (siteId ? [siteId] : []);
    const { error: profileError } = await admin.from('profiles').insert({
      id: profileId,
      auth_user_id: created.user.id,
      name,
      email,
      phone,
      role,
      site_id: siteId,
      site_ids: allSiteIds,
      department,
      trade,
      notes,
      active: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return response({ error: profileError.message }, 400);
    }

    await admin.from('audit_logs').insert({
      actor_profile_id: actor.id,
      action: 'STAFF_CREATED',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { email, role, site_id: siteId },
    });

    return response({ profileId, message: `Technician account created for ${email}` }, 201);
  }

  if (action === 'assignActing') {
    if (!isAdmin && !isSupervisor) return response({ error: 'Only supervisors or administrators can assign an acting FM' }, 403);
    const actingProfileId = String(body.actingProfileId ?? '');
    const coveringProfileId = String(body.coveringProfileId ?? '');
    const start = String(body.start ?? '');
    const end = String(body.end ?? '');
    if (!actingProfileId || !coveringProfileId || !start || !end) {
      return response({ error: 'Acting FM, covering FM, start and end dates are all required' }, 400);
    }
    if (actingProfileId === coveringProfileId) {
      return response({ error: 'The acting FM cannot be the same person as the assigned FM' }, 400);
    }
    if (new Date(end) <= new Date(start)) return response({ error: 'End date must be after the start date' }, 400);

    const { data: actingFm } = await admin.from('profiles').select('id, role, name').eq('id', actingProfileId).maybeSingle();
    const { data: coveringFm } = await admin.from('profiles').select('id, role, name').eq('id', coveringProfileId).maybeSingle();
    if (!actingFm || !coveringFm) return response({ error: 'Staff member not found' }, 404);
    if (actingFm.role !== 'facility_manager' || coveringFm.role !== 'facility_manager') {
      return response({ error: 'Both people must be facility managers' }, 400);
    }

    const { error } = await admin.from('profiles').update({
      acting_for_profile_id: coveringProfileId,
      acting_start: start,
      acting_end: end,
      acting_handover: body.handover ?? {},
      acting_acknowledged_at: null,
    }).eq('id', actingProfileId);
    if (error) return response({ error: error.message }, 400);

    await admin.from('audit_logs').insert({
      actor_profile_id: actor.id,
      action: 'ACTING_FM_ASSIGNED',
      entity_type: 'profile',
      entity_id: actingProfileId,
      metadata: { covering: coveringProfileId, start, end },
    });

    return response({ message: `${actingFm.name} is now acting for ${coveringFm.name} until ${end}` });
  }

  if (action === 'clearActing') {
    if (!isAdmin && !isSupervisor) return response({ error: 'Only supervisors or administrators can clear an acting FM' }, 403);
    const actingProfileId = String(body.actingProfileId ?? '');
    if (!actingProfileId) return response({ error: 'Profile id is required' }, 400);
    const { error } = await admin.from('profiles').update({
      acting_for_profile_id: null, acting_start: null, acting_end: null,
      acting_handover: {}, acting_acknowledged_at: null,
    }).eq('id', actingProfileId);
    if (error) return response({ error: error.message }, 400);
    return response({ message: 'Acting FM assignment cleared' });
  }

  if (action === 'update') {
    const profileId = String(body.profileId ?? '');
    if (!profileId) return response({ error: 'Profile id is required' }, 400);

    const { data: target } = await admin.from('profiles').select('id, role, site_id').eq('id', profileId).maybeSingle();
    if (!target) return response({ error: 'Staff member not found' }, 404);

    if (isIct && executiveRoles.has(target.role)) {
      return response({ error: 'ICT admins cannot modify executive/administrator accounts' }, 403);
    }
    if (!isAdmin && !isIct) {
      if (target.role !== 'technician' || (!isSupervisor && !actorSites.includes(target.site_id))) {
        return response({ error: 'You can only edit technicians assigned to your facility' }, 403);
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.phone !== undefined) updates.phone = String(body.phone).trim();
    if (body.trade !== undefined) updates.trade = String(body.trade).trim();
    if (body.notes !== undefined) updates.notes = String(body.notes).trim();
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if ((isAdmin || isIct) && body.siteId !== undefined) updates.site_id = body.siteId ? String(body.siteId) : null;
    if ((isAdmin || isIct) && body.siteIds !== undefined) updates.site_ids = Array.isArray(body.siteIds) ? body.siteIds.map(String).filter(Boolean) : [];
    if ((isAdmin || isIct) && body.department !== undefined) updates.department = String(body.department).trim();
    if ((isAdmin || isIct) && body.role !== undefined) {
      const role = String(body.role);
      if (!roles.has(role)) return response({ error: 'Invalid role' }, 400);
      if (isIct && executiveRoles.has(role)) return response({ error: 'ICT admins cannot assign executive/administrator roles' }, 403);
      updates.role = role;
    }
    if (Object.keys(updates).length === 0) return response({ error: 'Nothing to update' }, 400);

    const { error: updateError } = await admin.from('profiles').update(updates).eq('id', profileId);
    if (updateError) return response({ error: updateError.message }, 400);

    await admin.from('audit_logs').insert({
      actor_profile_id: actor.id,
      action: 'STAFF_UPDATED',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { updates },
    });

    return response({ message: 'Staff member updated' });
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : '';
  const role = String(body.role ?? '');
  const siteId = body.siteId ? String(body.siteId) : null;
  const siteIds = Array.isArray(body.siteIds) ? body.siteIds.map(String).filter(Boolean) : [];
  const department = String(body.department ?? '').trim();
  const trade = body.trade ? String(body.trade).trim() : '';
  const redirectTo = String(body.redirectTo ?? '').trim();

  if (!name || !email || !roles.has(role)) return response({ error: 'Name, email, and a valid role are required' }, 400);
  if (isIct && executiveRoles.has(role)) {
    return response({ error: 'ICT admins cannot invite executive/administrator accounts' }, 403);
  }
  if (!isAdmin && !isIct) {
    if (role !== 'technician') return response({ error: 'Facility managers and supervisors can only invite technicians' }, 403);
    if (!isSupervisor && (!siteId || !actorSites.includes(siteId))) return response({ error: 'Technicians can only be assigned to your facility' }, 403);
  }
  const allSiteIds = (isAdmin || isIct) && siteIds.length ? siteIds : (siteId ? [siteId] : []);
  if ((role === 'facility_manager' || role === 'technician') && !siteId) return response({ error: 'This role must be assigned to a site' }, 400);
  if (!redirectTo.startsWith('https://') && !redirectTo.startsWith('http://localhost:')) return response({ error: 'Invalid invitation redirect URL' }, 400);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { name, role, department, site_id: siteId, phone, trade },
  });
  if (inviteError || !invited.user) return response({ error: inviteError?.message ?? 'Unable to invite user' }, 400);

  const profileId = crypto.randomUUID();
  const { error: profileError } = await admin.from('profiles').insert({
    id: profileId,
    auth_user_id: invited.user.id,
    name,
    email,
    phone,
    role,
    site_id: siteId,
    site_ids: allSiteIds,
    department,
    trade,
    active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return response({ error: profileError.message }, 400);
  }

  await admin.from('audit_logs').insert({
    actor_profile_id: actor.id,
    action: 'STAFF_INVITED',
    entity_type: 'profile',
    entity_id: profileId,
    metadata: { email, role, site_id: siteId },
  });

  return response({ profileId, message: `Invitation sent to ${email}` }, 201);
});

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
