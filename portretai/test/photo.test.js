import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { checkPhoto } from '../src/validate.js';
import { loadPhoto, sniffFormat } from '../src/image-io.js';

const fx = (name) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);

test('accepts a sharp, well-lit JPG', async () => {
  const r = await checkPhoto(fx('sunelis.jpg'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.equal(r.metrics.format, 'jpeg');
});

test('accepts PNG and warns when resolution is modest', async () => {
  const r = await checkPhoto(fx('sunelis.png'));
  assert.equal(r.ok, true);
  assert.equal(r.metrics.format, 'png');
  assert.match(r.warnings.join(' '), /Raiška nedidelė/);
});

test('decodes HEIC (HEVC) and reports the real pixel size', async () => {
  assert.equal(sniffFormat(fs.readFileSync(fx('sunelis.heic'))), 'heic');
  const r = await checkPhoto(fx('sunelis.heic'));
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.equal(r.metrics.format, 'heic');
  assert.equal(r.metrics.width, 1600);
  assert.equal(r.metrics.height, 2000);
});

test('HEIC is detected by content, not by file extension', async () => {
  const r = await checkPhoto(fs.readFileSync(fx('sunelis.heic')));
  assert.equal(r.metrics.format, 'heic');
});

test('applies EXIF orientation so the photo is upright', async () => {
  const p = await loadPhoto(fx('pasukta.jpg'));
  assert.equal(p.width, 1600);
  assert.equal(p.height, 2000);
});

test('rejects a blurred photo with a clear reason', async () => {
  const r = await checkPhoto(fx('neryski.jpg'));
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /išplaukusi/);
});

test('rejects a dark photo, and does not also call it blurred', async () => {
  const r = await checkPhoto(fx('tamsi.jpg'));
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /per tamsi/);
});

test('rejects low resolution and says the required size', async () => {
  const r = await checkPhoto(fx('maza.jpg'));
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /480×600 px/);
  assert.match(r.errors.join(' '), /bent 800 px/);
});

test('rejects a file that is not an image', async () => {
  const r = await checkPhoto(fx('ne-paveikslelis.jpg'));
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /Neatpažintas failo formatas/);
});

test('rejects files over the size limit', async () => {
  const r = await checkPhoto(fx('sunelis.jpg'), {
    maxBytes: 1000, minShortSidePx: 800, warnShortSidePx: 1200, darkReject: 30, darkWarn: 55, brightReject: 240, sharpReject: 35, sharpWarn: 90,
  });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /per didelis/);
});
