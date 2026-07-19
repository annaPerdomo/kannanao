import { APP_NAME } from '@/lib/brand';
import StatsPage from '@/pages/Stats';

export const metadata = {
  title: `My Progress · ${APP_NAME}`,
};

export default function Stats() {
  return <StatsPage />;
}
