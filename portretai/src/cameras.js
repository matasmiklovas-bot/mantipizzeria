// Where the camera sits on the back of each phone, so previews and mockups
// show what will be hidden. Plain data, no imports: used by the server and the
// browser. Positions are fractions of the case width, measured from the
// top-left corner of the back.
// TODO(savininkas): check against your case supplier's templates for each model.

/** @typedef {'bar' | 'air' | 'pro' | 'dual' | 'pill' | 'samsung'} CameraKind */

/** @type {Record<string, CameraKind>} */
export const CAMERA_BY_MODEL = {
  // 2025: the Pro models and the Air have a camera bar across the whole back.
  'iPhone 17 Pro Max': 'bar',
  'iPhone 17 Pro': 'bar',
  'iPhone Air': 'air',
  'iPhone 17': 'pill',
  'iPhone 16 Pro Max': 'pro',
  'iPhone 16 Pro': 'pro',
  'iPhone 16': 'pill',
  'iPhone 15 Pro': 'pro',
  'iPhone 15': 'dual',
  'iPhone 14': 'dual',
  'iPhone 13': 'dual',
  'Samsung Galaxy S26 Ultra': 'samsung',
  'Samsung Galaxy S26': 'samsung',
  'Samsung Galaxy S25': 'samsung',
  'Samsung Galaxy S24': 'samsung',
  'Samsung Galaxy S23': 'samsung',
  'Samsung Galaxy A55': 'samsung',
  'Samsung Galaxy A54': 'samsung',
};

/** @returns {CameraKind} */
export function cameraFor(model) {
  return (model && CAMERA_BY_MODEL[model]) || 'pro';
}

/**
 * Module outline and lenses, in fractions of the case width.
 * module: rounded box behind the lenses (null when the lenses stand alone).
 * @type {Record<CameraKind, { module: { x: number, y: number, w: number, h: number, r: number } | null, lenses: [number, number][], lens: number, flash: [number, number] }>}
 */
export const CAMERA_LAYOUTS = {
  bar: { module: { x: 0.03, y: 0.035, w: 0.94, h: 0.4, r: 0.12 }, lenses: [[0.17, 0.15], [0.17, 0.33], [0.34, 0.24]], lens: 0.07, flash: [0.8, 0.15] },
  air: { module: { x: 0.03, y: 0.04, w: 0.94, h: 0.22, r: 0.11 }, lenses: [[0.16, 0.15]], lens: 0.068, flash: [0.32, 0.15] },
  pro: { module: { x: 0.06, y: 0.06, w: 0.42, h: 0.42, r: 0.1 }, lenses: [[0.186, 0.186], [0.186, 0.362], [0.362, 0.27]], lens: 0.072, flash: [0.375, 0.144] },
  dual: { module: { x: 0.06, y: 0.06, w: 0.36, h: 0.36, r: 0.09 }, lenses: [[0.165, 0.165], [0.315, 0.315]], lens: 0.068, flash: [0.32, 0.135] },
  pill: { module: { x: 0.07, y: 0.06, w: 0.18, h: 0.38, r: 0.09 }, lenses: [[0.16, 0.15], [0.16, 0.34]], lens: 0.066, flash: [0.31, 0.12] },
  samsung: { module: null, lenses: [[0.17, 0.14], [0.17, 0.29], [0.17, 0.44]], lens: 0.064, flash: [0.31, 0.14] },
};
