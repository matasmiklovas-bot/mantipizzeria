'use client';

// Admin: upload a finished portrait. The file goes straight to storage, then
// the server lays out the poster (preview, wall mockup, print PDF).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { portraitUploadedAction } from '@/app/valdymas/actions';

const MAX_BYTES = 15 * 1024 * 1024;

export default function PortraitUpload({ orderId, label }: { orderId: string; label: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'rendering'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`Failas per didelis: ${(file.size / 1048576).toFixed(1)} MB. Daugiausia 15 MB. Išsaugokite kaip JPG su aukšta kokybe.`);
      return;
    }
    try {
      setPhase('uploading');
      const slotRes = await fetch('/api/valdymas/ikelimas', { method: 'POST' });
      if (!slotRes.ok) throw new Error('Sesija baigėsi. Perkraukite puslapį ir prisijunkite.');
      const slot = await slotRes.json();
      const put = await fetch(slot.upload.url, {
        method: slot.upload.method,
        headers: { 'content-type': file.type || 'application/octet-stream', ...(slot.upload.headers || {}) },
        body: file,
      });
      if (!put.ok) throw new Error('Nepavyko įkelti failo. Patikrinkite ryšį.');
      setPhase('rendering');
      const result = await portraitUploadedAction(orderId, slot.key);
      if (result.error) throw new Error(result.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepavyko įkelti.');
    } finally {
      setPhase('idle');
    }
  }

  return (
    <div>
      {error ? (
        <div className="alert" role="alert">
          <p>{error}</p>
        </div>
      ) : null}
      {phase === 'idle' ? (
        <label className="btn ghost" style={{ cursor: 'pointer' }}>
          {label}
          <input type="file" className="visually-hidden" accept="image/png,image/jpeg" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      ) : (
        <p role="status" aria-live="polite" className="btn ghost" aria-disabled="true">
          {phase === 'uploading' ? 'Keliama…' : 'Maketuojamas plakatas (apie 15 sek.)…'}
        </p>
      )}
      <p className="small muted" style={{ marginTop: 8 }}>
        PNG arba JPG, 4:5 proporcijos, bent 2000 px pločio, iki 15 MB. Vardo ant portreto nerašykite: jį uždeda programa.
      </p>
    </div>
  );
}
