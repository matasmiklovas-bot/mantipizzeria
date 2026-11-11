// Private file storage. Nothing here is ever reachable by a public URL:
// files are read by the server and streamed only to the admin or, for the
// watermarked preview, to the holder of the order's secret link.
//
//   supabase – production (a private Supabase Storage bucket)
//   local    – development and tests (files under .data/files/)

import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir, driverFor } from './env.js';
import { siteUrl } from './settings.js';
import { sign } from './crypto.js';

export const BUCKET = 'portretai';

function safeKey(key) {
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes('..')) throw new Error(`Invalid storage key: ${key}`);
  return key;
}

function localDriver() {
  const root = path.join(dataDir(), 'files');
  const file = (key) => path.join(root, safeKey(key));
  return {
    name: 'local',
    async put(key, buffer) {
      await fs.mkdir(path.dirname(file(key)), { recursive: true });
      await fs.writeFile(file(key), buffer);
    },
    async get(key) {
      try {
        return await fs.readFile(file(key));
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    async remove(keys) {
      await Promise.all(keys.filter(Boolean).map((k) => fs.rm(file(k), { force: true })));
    },
    /** The browser uploads straight to this URL, bypassing page handlers. */
    async createUpload(key) {
      const expires = Date.now() + 2 * 60 * 60 * 1000;
      const sig = sign(`upload:${key}:${expires}`);
      return {
        url: `${siteUrl()}/api/ikelimas/failas?key=${encodeURIComponent(key)}&expires=${expires}&sig=${sig}`,
        method: 'PUT',
        headers: {},
      };
    },
  };
}

async function supabaseDriver() {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = sb.storage.from(BUCKET);
  return {
    name: 'supabase',
    async put(key, buffer, contentType = 'application/octet-stream') {
      const { error } = await bucket.upload(safeKey(key), buffer, { contentType, upsert: true });
      if (error) throw new Error(`Supabase Storage (put ${key}): ${error.message}`);
    },
    async get(key) {
      const { data, error } = await bucket.download(safeKey(key));
      if (error) {
        if (/not found|404/i.test(error.message) || error.status === 404 || error.statusCode === '404') return null;
        throw new Error(`Supabase Storage (get ${key}): ${error.message}`);
      }
      return Buffer.from(await data.arrayBuffer());
    },
    async remove(keys) {
      const list = keys.filter(Boolean).map(safeKey);
      if (list.length === 0) return;
      const { error } = await bucket.remove(list);
      if (error) throw new Error(`Supabase Storage (remove): ${error.message}`);
    },
    async createUpload(key) {
      const { data, error } = await bucket.createSignedUploadUrl(safeKey(key));
      if (error) throw new Error(`Supabase Storage (createUpload): ${error.message}`);
      // A plain PUT of the file body to the signed URL; no API key is needed.
      return { url: data.signedUrl, method: 'PUT', headers: { 'x-upsert': 'false' } };
    },
  };
}

let instance;

export async function storage() {
  if (!instance) instance = driverFor('storage') === 'supabase' ? supabaseDriver() : Promise.resolve(localDriver());
  return instance;
}

export function resetStorageForTests() {
  instance = undefined;
}
