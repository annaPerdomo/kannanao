import { Binder } from '@/components/Binder';
import { APP_NAME } from '@/lib/brand';

export const metadata = {
  title: `My Cards · ${APP_NAME}`,
};

export default function BinderPage() {
  return <Binder />;
}
