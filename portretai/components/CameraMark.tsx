// Where the phone camera will sit on the back of the case, drawn over the
// preview. Positions come from src/cameras.js, in container width units, so
// the parent must be a size container (container-type: inline-size).

import { CAMERA_LAYOUTS, cameraFor } from '@/src/cameras.js';

export default function CameraMark({ phoneModel }: { phoneModel?: string | null }) {
  const cam = CAMERA_LAYOUTS[cameraFor(phoneModel)];
  const u = (v: number) => `${v * 100}cqw`;
  const m = cam.module;
  return (
    <span className="camera" aria-hidden="true">
      {m ? <span className="camera-module" style={{ left: u(m.x), top: u(m.y), width: u(m.w), height: u(m.h), borderRadius: u(m.r) }} /> : null}
      {cam.lenses.map(([x, y]) => (
        <span key={`${x}-${y}`} className="camera-lens" style={{ left: u(x - cam.lens), top: u(y - cam.lens), width: u(2 * cam.lens), height: u(2 * cam.lens) }} />
      ))}
    </span>
  );
}
