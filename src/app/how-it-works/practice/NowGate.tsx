'use client';
import { useEffect, useState } from 'react';

import { DemoLab } from '@/components/DemoLab';

export function NowGate() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  return <DemoLab now={now} />;
}
