import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset instructions have been sent to your email address.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
