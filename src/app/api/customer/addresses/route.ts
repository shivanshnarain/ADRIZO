import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export interface CustomerAddress {
  id: string;
  customer_id: string;
  full_name: string;
  phone: string;
  address: string;
  area?: string | null;
  district?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * GET /api/customer/addresses
 * Returns all saved addresses for the authenticated customer.
 */
export async function GET() {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();

    // 1. Fetch saved addresses from customer_addresses table
    const { data: addresses, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Customer Addresses GET Error]:', error.message);
      return NextResponse.json({ success: false, error: 'Failed to retrieve addresses' }, { status: 500 });
    }

    // 2. Fallback / Auto-Migration: If no addresses in customer_addresses, check customer_profiles
    if ((!addresses || addresses.length === 0) && customer.id !== 'admin') {
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', customer.id)
        .single();

      if (profile && profile.delivery_address && profile.city && profile.state && profile.pincode) {
        const { data: migratedAddress, error: migErr } = await supabase
          .from('customer_addresses')
          .insert({
            customer_id: customer.id,
            full_name: profile.full_name || customer.name || 'Customer',
            phone: profile.phone || customer.phone || '',
            address: profile.delivery_address,
            city: profile.city,
            state: profile.state,
            pincode: profile.pincode,
            is_default: true,
          })
          .select()
          .single();

        if (!migErr && migratedAddress) {
          return NextResponse.json({ success: true, addresses: [migratedAddress] });
        }
      }
    }

    return NextResponse.json({ success: true, addresses: addresses || [] });
  } catch (err: any) {
    console.error('[Customer Addresses GET Exception]:', err.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customer/addresses
 * Adds a new address for the authenticated customer.
 */
export async function POST(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      full_name = '',
      phone = '',
      address = '',
      area = '',
      district = '',
      city = '',
      state = '',
      pincode = '',
      landmark = '',
      is_default = false,
    } = body;

    const trimmedName = full_name.trim();
    const trimmedPhone = phone.trim().replace(/\D/g, '');
    const trimmedAddress = address.trim();
    const trimmedArea = typeof area === 'string' ? area.trim() : '';
    const trimmedDistrict = typeof district === 'string' ? district.trim() : '';
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedPin = pincode.trim().replace(/\D/g, '');
    const trimmedLandmark = landmark.trim();

    // Field validations
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ success: false, error: 'Full name must be at least 2 characters.' }, { status: 400 });
    }
    if (!trimmedPhone || !/^[6-9]\d{9}$/.test(trimmedPhone)) {
      return NextResponse.json({ success: false, error: 'Please provide a valid 10-digit Indian mobile number.' }, { status: 400 });
    }
    if (!trimmedAddress || trimmedAddress.length < 3) {
      return NextResponse.json({ success: false, error: 'Street address must be at least 3 characters.' }, { status: 400 });
    }
    if (!trimmedCity) {
      return NextResponse.json({ success: false, error: 'City is required.' }, { status: 400 });
    }
    if (!trimmedState) {
      return NextResponse.json({ success: false, error: 'State is required.' }, { status: 400 });
    }
    if (!trimmedPin || !/^\d{6}$/.test(trimmedPin)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit Indian PIN code.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check count of existing addresses
    const { count } = await supabase
      .from('customer_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id);

    const isFirstAddress = (count || 0) === 0;
    const shouldBeDefault = is_default || isFirstAddress;

    // If new address is default, unset existing defaults
    if (shouldBeDefault) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customer.id);
    }

    const { data: newAddress, error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: customer.id,
        full_name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        area: trimmedArea || null,
        district: trimmedDistrict || null,
        city: trimmedCity,
        state: trimmedState,
        pincode: trimmedPin,
        landmark: trimmedLandmark || null,
        is_default: shouldBeDefault,
      })
      .select()
      .single();

    if (error || !newAddress) {
      console.error('[Customer Addresses POST Error]:', error?.message);
      return NextResponse.json({ success: false, error: error?.message || 'Failed to save address' }, { status: 500 });
    }

    // Sync to customer_profiles if this is default
    if (shouldBeDefault) {
      try {
        await supabase
          .from('customer_profiles')
          .upsert({
            id: customer.id,
            full_name: trimmedName,
            phone: trimmedPhone,
            delivery_address: trimmedAddress,
            city: trimmedCity,
            state: trimmedState,
            pincode: trimmedPin,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      } catch (profErr: any) {
        console.warn('[Profile Sync Warning]:', profErr?.message);
      }
    }

    return NextResponse.json({ success: true, address: newAddress });
  } catch (err: any) {
    console.error('[Customer Addresses POST Exception]:', err.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/customer/addresses
 * Edits an existing address.
 */
export async function PUT(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, full_name, phone, address, area, district, city, state, pincode, landmark, is_default } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Address ID is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verify ownership (strict IDOR protection)
    const { data: existing, error: findErr } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single();

    if (findErr || !existing) {
      return NextResponse.json({ success: false, error: 'Address not found or unauthorized' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      const trimmedName = String(full_name).trim();
      if (trimmedName.length < 2) {
        return NextResponse.json({ success: false, error: 'Full name must be at least 2 characters.' }, { status: 400 });
      }
      updateData.full_name = trimmedName;
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone).trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit Indian phone number.' }, { status: 400 });
      }
      updateData.phone = cleanPhone;
    }

    if (address !== undefined) {
      const trimmedAddress = String(address).trim();
      if (trimmedAddress.length < 3) {
        return NextResponse.json({ success: false, error: 'Street address must be at least 3 characters.' }, { status: 400 });
      }
      updateData.address = trimmedAddress;
    }

    if (area !== undefined) updateData.area = String(area).trim() || null;
    if (district !== undefined) updateData.district = String(district).trim() || null;
    if (city !== undefined) updateData.city = String(city).trim();
    if (state !== undefined) updateData.state = String(state).trim();
    if (landmark !== undefined) updateData.landmark = String(landmark).trim() || null;

    if (pincode !== undefined) {
      const cleanPin = String(pincode).trim().replace(/\D/g, '');
      if (!/^\d{6}$/.test(cleanPin)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit Indian PIN code.' }, { status: 400 });
      }
      updateData.pincode = cleanPin;
    }

    if (is_default === true) {
      // Unset previous defaults
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customer.id);

      updateData.is_default = true;
    }

    const { data: updatedAddress, error: updateErr } = await supabase
      .from('customer_addresses')
      .update(updateData)
      .eq('id', id)
      .eq('customer_id', customer.id)
      .select()
      .single();

    if (updateErr) {
      console.error('[Customer Addresses PUT Error]:', updateErr.message);
      return NextResponse.json({ success: false, error: 'Failed to update address' }, { status: 500 });
    }

    // Sync default to profile if updated to default
    if (updatedAddress.is_default) {
      try {
        await supabase
          .from('customer_profiles')
          .upsert({
            id: customer.id,
            full_name: updatedAddress.full_name,
            phone: updatedAddress.phone,
            delivery_address: updatedAddress.address,
            city: updatedAddress.city,
            state: updatedAddress.state,
            pincode: updatedAddress.pincode,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      } catch (profErr: any) {
        console.warn('[Profile Sync Warning]:', profErr?.message);
      }
    }

    return NextResponse.json({ success: true, address: updatedAddress });
  } catch (err: any) {
    console.error('[Customer Addresses PUT Exception]:', err.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/customer/addresses?id=xxx
 * Deletes an existing address for the authenticated customer.
 */
export async function DELETE(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Address ID is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Address not found or unauthorized' }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('customer_id', customer.id);

    if (delErr) {
      return NextResponse.json({ success: false, error: 'Failed to delete address' }, { status: 500 });
    }

    // If deleted address was default, promote another address to default
    if (existing.is_default) {
      const { data: remaining } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        const nextDefault = remaining[0];
        await supabase
          .from('customer_addresses')
          .update({ is_default: true })
          .eq('id', nextDefault.id);

        try {
          await supabase
            .from('customer_profiles')
            .upsert({
              id: customer.id,
              full_name: nextDefault.full_name,
              phone: nextDefault.phone,
              delivery_address: nextDefault.address,
              city: nextDefault.city,
              state: nextDefault.state,
              pincode: nextDefault.pincode,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
        } catch (profErr: any) {
          console.warn('[Profile Sync Warning]:', profErr?.message);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Address deleted successfully' });
  } catch (err: any) {
    console.error('[Customer Addresses DELETE Exception]:', err.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
