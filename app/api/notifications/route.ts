import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { NOTIFICATION_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = getSupabaseAdmin()
      .from('notifications')
      .select(NOTIFICATION_COLS)
      .eq('user_id', auth.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq('read', false);

    const { data: notifications, error } = await query;
    if (error) throw error;

    const unreadCount = (notifications ?? []).filter(n => !n.read).length;

    return NextResponse.json({ notifications: notifications ?? [], unreadCount });
  } catch (e) { return errorResponse('Failed to fetch notifications', e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, markAllRead } = await req.json();
    const admin = getSupabaseAdmin();

    if (markAllRead) {
      await admin.from('notifications').update({ read: true }).eq('user_id', auth.id).eq('read', false);
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: notification, error } = await admin
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', auth.id)
      .select(NOTIFICATION_COLS)
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ notification });
  } catch (e) { return errorResponse('Failed to update notification', e); }
}
