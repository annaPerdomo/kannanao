import { MePage } from '@/components/MePage';
import { APP_NAME } from '@/lib/brand';

export const metadata = {
  title: `Me · ${APP_NAME}`,
};

export default function Me() {
  return <MePage />;
}
