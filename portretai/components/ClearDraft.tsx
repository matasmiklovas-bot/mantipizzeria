'use client';

// After a paid order the saved form state is no longer needed.
import { useEffect } from 'react';

export default function ClearDraft() {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem('uzsakymas-v1');
    } catch {
      // nothing to clear
    }
  }, []);
  return null;
}
