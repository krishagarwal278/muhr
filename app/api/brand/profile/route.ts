import { createRouteClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: { code: 'auth', message: 'Not authenticated' } }, { status: 401 });

    const { data, error } = await supabase.from('brand_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) {
      console.error('brand_profile_get_error', error.message);
      return NextResponse.json({ ok: false, error: { code: 'db', message: 'Failed to load' } }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data ?? {} });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: { code: 'unknown', message: 'Unexpected error' } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: { code: 'auth', message: 'Not authenticated' } }, { status: 401 });

    const body = await request.json();
    const allowed = {
      company_name: body.companyName ?? null,
      address_line1: body.addressLine1 ?? null,
      address_line2: body.addressLine2 ?? null,
      city: body.city ?? null,
      pin_code: body.pinCode ?? null,
      primary_email: body.primaryEmail ?? null,
      secondary_email: body.secondaryEmail ?? null,
      phone: body.phone ?? null,
      rep_name: body.repName ?? null,
      rep_email: body.repEmail ?? null,
    };

    const upsertRow = {
      user_id: user.id,
      ...allowed,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>;

    const { error } = await supabase.from('brand_profiles').upsert(upsertRow, { onConflict: 'user_id' }).select();
    if (error) {
      console.error('brand_profile_patch_error', error.message);
      return NextResponse.json({ ok: false, error: { code: 'db', message: 'Could not save' } }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: { code: 'unknown', message: 'Unexpected error' } }, { status: 500 });
  }
}
