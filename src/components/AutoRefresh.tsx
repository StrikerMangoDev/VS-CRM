'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Refresh the router cache every 15 seconds
    const interval = setInterval(() => {
      router.refresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
