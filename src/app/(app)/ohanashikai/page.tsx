'use client';

import { LearnerRedirect } from '@/components/LearnerRedirect';
import OhanashikaiHome from '@/pages/OhanashikaiHome';

export default function OhanashikaiPage() {
  return (
    <>
      <LearnerRedirect to="/" />
      <OhanashikaiHome />
    </>
  );
}
