import { verifyAdminSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReviewsAdminClient from './ReviewsAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    redirect('/admin/login?from=/admin/reviews');
  }

  return <ReviewsAdminClient />;
}
