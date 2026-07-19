import { APP_NAME } from '@/lib/brand';
import ShopPage from '@/pages/Shop';

export const metadata = {
  title: `Shop · ${APP_NAME}`,
};

export default function Shop() {
  return <ShopPage />;
}
