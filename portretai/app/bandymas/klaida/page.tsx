import { notFound } from 'next/navigation';
import { driverFor } from '@/server/env.js';

// Test hook: a page that always fails, to check what customers see on a
// server error. Exists only with the local stand-ins (like the fake payment).
export const dynamic = 'force-dynamic';

export default function BrokenPage() {
  if (driverFor('payment') !== 'fake') notFound();
  throw new Error('Bandomoji klaida');
}
