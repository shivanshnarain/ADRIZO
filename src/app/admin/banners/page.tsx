import { getHeroBanners } from '@/actions/cms';
import BannersClient from './BannersClient';

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  const { slides } = await getHeroBanners();
  return <BannersClient initialSlides={slides} />;
}
