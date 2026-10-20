import { verifyAdminSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CustomerPhotosAdminClient from './CustomerPhotosAdminClient';
import { getCustomerPhotos } from '@/lib/customer-photos-service';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerPhotosPage() {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    redirect('/admin/login?from=/admin/customer-photos');
  }

  const { all } = await getCustomerPhotos().catch(() => ({ all: [] }));

  return <CustomerPhotosAdminClient initialPhotos={all} />;
}

