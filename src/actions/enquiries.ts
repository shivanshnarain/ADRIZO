'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';

export async function getEnquiries() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const enquiries = await prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, enquiries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEnquiryStatus(id: string, status: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: { status }
    });
    revalidatePath('/admin/enquiries');
    return { success: true, enquiry };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEnquiry(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !message) {
      return { success: false, error: 'Name, email, and message are required' };
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        name, email, phone: phone || null, subject: subject || null, message
      }
    });

    revalidatePath('/admin/enquiries');
    return { success: true, enquiry };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
