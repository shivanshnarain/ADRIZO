import { prisma } from '../../../lib/prisma';
import EnquiriesClient from './EnquiriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminEnquiries() {
  let enquiries: any[] = [];
  try {
    enquiries = await prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    enquiries = [];
  }

  return <EnquiriesClient initialEnquiries={enquiries} />;
}
