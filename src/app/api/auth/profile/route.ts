import { NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const customer = await getAuthenticatedCustomer();

    if (!customer || !customer.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, delivery_address, city, state, pincode } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      const trimmedName = full_name.trim();
      // Block admin account name leaking into customer profile
      if (trimmedName.toLowerCase() !== 'administrator' && trimmedName.toLowerCase() !== 'admin') {
        updateData.full_name = trimmedName;
      }
    }

    if (phone !== undefined) {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone) {
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
          return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
        }
        updateData.phone = cleanPhone;
      }
    }

    if (delivery_address !== undefined) updateData.delivery_address = delivery_address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (pincode !== undefined) {
      const cleanPin = pincode.trim().replace(/\D/g, '');
      if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'Enter a valid 6-digit PIN code.' }, { status: 400 });
      }
      updateData.pincode = cleanPin || pincode.trim();
    }

    const adminSupabase = getAdminClient();
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('customer_profiles')
      .upsert({
        id: customer.id,
        email: customer.email,
        ...updateData,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Also sync to MongoDB prisma.user if matching user exists
    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(customer.id);
      const mongoUpdate: any = {};
      if (updateData.full_name) mongoUpdate.name = updateData.full_name;
      if (updateData.phone) mongoUpdate.phone = updateData.phone;
      if (updateData.delivery_address) mongoUpdate.address = updateData.delivery_address;
      if (updateData.city) mongoUpdate.city = updateData.city;
      if (updateData.state) mongoUpdate.state = updateData.state;
      if (updateData.pincode) mongoUpdate.pincode = updateData.pincode;

      if (Object.keys(mongoUpdate).length > 0) {
        if (isMongoId) {
          await prisma.user.update({
            where: { id: customer.id },
            data: mongoUpdate,
          }).catch(() => null);
        } else if (customer.email || customer.phone) {
          const matchUser = await prisma.user.findFirst({
            where: {
              OR: [
                customer.email ? { email: customer.email.toLowerCase() } : {},
                customer.phone ? { phone: customer.phone } : {},
              ].filter(o => Object.keys(o).length > 0),
            },
          }).catch(() => null);

          if (matchUser) {
            await prisma.user.update({
              where: { id: matchUser.id },
              data: mongoUpdate,
            }).catch(() => null);
          }
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
