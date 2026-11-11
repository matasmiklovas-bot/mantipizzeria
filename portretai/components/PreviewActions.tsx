'use client';

// The customer's two choices on the preview page: approve, or ask for a fix.

import { useActionState, useState } from 'react';
import { approveAction, revisionAction, type ActionState } from '@/app/perziura/[token]/actions';

const initial: ActionState = { error: null };

export default function PreviewActions({ token, version, revisionsLeft, name, contact }: { token: string; version: number; revisionsLeft: number; name: string; contact: string | null }) {
  const [approveState, approve, approving] = useActionState(approveAction, initial);
  const [revisionState, revise, revising] = useActionState(revisionAction, initial);
  const [wantsFix, setWantsFix] = useState(false);

  return (
    <>
      {approveState.error ? (
        <div className="alert" role="alert">
          <p>{approveState.error}</p>
        </div>
      ) : null}

      <form action={approve}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="version" value={version} />
        <button type="submit" className="btn accent" disabled={approving || revising}>
          {approving ? 'Tvirtinama…' : 'Tinka, spausdinkite'}
        </button>
      </form>
      <p className="small muted" style={{ margin: '8px 0 22px', textAlign: 'center' }}>
        Patvirtinus portreto „{name}“ pakeisti nebegalėsime.
      </p>

      {revisionsLeft > 0 ? (
        wantsFix ? (
          <form action={revise}>
            <input type="hidden" name="token" value={token} />
            <div className="field">
              <label htmlFor="fix">Ką pataisyti?</label>
              <textarea id="fix" name="text" required minLength={5} maxLength={1000} aria-describedby="fix-hint" aria-invalid={Boolean(revisionState.error)} />
              <span className="hint" id="fix-hint">
                Rašykite konkrečiai, pavyzdžiui: „kairė ausis turi būti nulinkusi“, „akys ne rudos, o gintarinės“, „varde trūksta raidės“.
              </span>
              {revisionState.error ? (
                <p className="error" role="alert">
                  {revisionState.error}
                </p>
              ) : null}
            </div>
            <button type="submit" className="btn" disabled={revising || approving}>
              {revising ? 'Siunčiama…' : 'Išsiųsti pataisymo prašymą'}
            </button>
            <p className="small muted" style={{ marginTop: 8, textAlign: 'center' }}>
              Šis pataisymas nemokamas. Pataisę atsiųsime naują peržiūrą.
            </p>
          </form>
        ) : (
          <button type="button" className="btn ghost" onClick={() => setWantsFix(true)}>
            Noriu pataisymo
          </button>
        )
      ) : (
        <p className="small muted">
          Nemokamas pataisymas jau panaudotas. Jei portretas vis dar netinka, {contact ? `parašykite ${contact}` : 'atsakykite į mūsų laišką'}: susitarsime.
        </p>
      )}
    </>
  );
}
