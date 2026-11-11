'use client';

// Re-checks the page a few times while a payment confirmation is on its way.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoRefresh({ everySeconds = 4, times = 20 }: { everySeconds?: number; times?: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(times);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => {
      setLeft((n) => n - 1);
      router.refresh();
    }, everySeconds * 1000);
    return () => window.clearTimeout(id);
  }, [left, everySeconds, router]);
  return null;
}
