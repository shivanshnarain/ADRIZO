import { getResponsiveHeroConfig } from '@/actions/cms';
import BannersClient from './BannersClient';

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  const { config } = await getResponsiveHeroConfig();
  return <BannersClient initialConfig={config} />;
}
