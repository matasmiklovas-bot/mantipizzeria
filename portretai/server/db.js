// Data access. Two drivers behind one interface:
//   supabase – production (Postgres through the Supabase REST API)
//   local    – development and automated tests (one JSON file in .data/)
//
// The interface is deliberately small. State changes go through
// casOrder(): "update this order only if it still looks like X". That single
// atomic compare-and-set is what makes payment webhooks and customer
// approvals safe to receive twice.

import fs from 'node:fs';
import path from 'node:path';
import { dataDir, driverFor } from './env.js';

const camelToSnake = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const snakeToCamel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapKeys = (obj, fn) => (obj ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), v])) : obj);

function matches(row, where) {
  return Object.entries(where).every(([k, v]) => {
    const actual = row[k] ?? null;
    if (Array.isArray(v)) return v.includes(actual);
    return actual === (v ?? null);
  });
}

// ---------------------------------------------------------------------------
// Local driver
// ---------------------------------------------------------------------------

function localDriver() {
  const file = path.join(dataDir(), 'db.json');
  let queue = Promise.resolve();

  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return { orders: [], orderEvents: [], paymentEvents: [], photos: [], siteEvents: [] };
    }
  };
  const write = (state) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
    fs.renameSync(tmp, file);
  };
  // Serialises every operation, so compare-and-set is atomic in one process.
  const tx = (fn) => {
    const run = queue.then(() => {
      const state = read();
      const result = fn(state);
      if (result && result.__write) {
        write(state);
        return result.value;
      }
      return result;
    });
    queue = run.catch(() => {});
    return run;
  };
  const saved = (value) => ({ __write: true, value });
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

  return {
    name: 'local',
    insertOrder: (order) => tx((s) => (s.orders.push(clone(order)), saved(clone(order)))),
    getOrder: (id) => tx((s) => clone(s.orders.find((o) => o.id === id) ?? null)),
    getOrderByToken: (token) => tx((s) => clone(s.orders.find((o) => o.token === token) ?? null)),
    listOrders: ({ status } = {}) =>
      tx((s) =>
        clone(
          s.orders
            .filter((o) => !status || (Array.isArray(status) ? status.includes(o.status) : o.status === status))
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        ),
      ),
    casOrder: (id, where, patch) =>
      tx((s) => {
        const row = s.orders.find((o) => o.id === id);
        if (!row || !matches(row, where)) return null;
        Object.assign(row, clone(patch), { updatedAt: new Date().toISOString() });
        return saved(clone(row));
      }),
    addOrderEvent: (orderId, type, data = {}) =>
      tx((s) => (s.orderEvents.push({ orderId, type, data: clone(data), at: new Date().toISOString() }), saved(true))),
    listOrderEvents: (orderId) => tx((s) => clone(s.orderEvents.filter((e) => e.orderId === orderId))),
    insertPaymentEvent: (eventId, orderId, type) =>
      tx((s) => {
        if (s.paymentEvents.some((e) => e.eventId === eventId)) return false;
        s.paymentEvents.push({ eventId, orderId, type, at: new Date().toISOString() });
        return saved(true);
      }),
    insertPhoto: (photo) => tx((s) => (s.photos.push(clone(photo)), saved(clone(photo)))),
    getPhoto: (id) => tx((s) => clone(s.photos.find((p) => p.id === id) ?? null)),
    casPhoto: (id, where, patch) =>
      tx((s) => {
        const row = s.photos.find((p) => p.id === id);
        if (!row || !matches(row, where)) return null;
        Object.assign(row, clone(patch));
        return saved(clone(row));
      }),
    listOrphanPhotos: (olderThanIso) => tx((s) => clone(s.photos.filter((p) => !p.orderId && p.createdAt < olderThanIso))),
    deletePhoto: (id) => tx((s) => ((s.photos = s.photos.filter((p) => p.id !== id)), saved(true))),
    insertSiteEvent: (evt) => tx((s) => (s.siteEvents.push(clone(evt)), saved(true))),
    listSiteEvents: (sinceIso) => tx((s) => clone(s.siteEvents.filter((e) => e.at >= sinceIso))),
  };
}

// ---------------------------------------------------------------------------
// Supabase driver
// ---------------------------------------------------------------------------

async function supabaseDriver() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the supabase data driver.');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const out = (row) => mapKeys(row, snakeToCamel);
  const inn = (obj) => mapKeys(obj, camelToSnake);
  const check = ({ data, error }, what) => {
    if (error) throw new Error(`Supabase (${what}): ${error.message}`);
    return data;
  };
  const applyWhere = (q, where) => {
    for (const [k, v] of Object.entries(where)) {
      const col = camelToSnake(k);
      if (Array.isArray(v)) q = q.in(col, v);
      else if (v == null) q = q.is(col, null);
      else q = q.eq(col, v);
    }
    return q;
  };

  return {
    name: 'supabase',
    insertOrder: async (order) => out(check(await sb.from('orders').insert(inn(order)).select().single(), 'insertOrder')),
    getOrder: async (id) => out(check(await sb.from('orders').select().eq('id', id).maybeSingle(), 'getOrder')),
    getOrderByToken: async (token) => out(check(await sb.from('orders').select().eq('token', token).maybeSingle(), 'getOrderByToken')),
    listOrders: async ({ status } = {}) => {
      let q = sb.from('orders').select().order('created_at', { ascending: false }).limit(1000);
      if (status) q = Array.isArray(status) ? q.in('status', status) : q.eq('status', status);
      return check(await q, 'listOrders').map(out);
    },
    casOrder: async (id, where, patch) => {
      const q = applyWhere(sb.from('orders').update({ ...inn(patch), updated_at: new Date().toISOString() }).eq('id', id), where);
      return out(check(await q.select().maybeSingle(), 'casOrder'));
    },
    addOrderEvent: async (orderId, type, data = {}) => {
      check(await sb.from('order_events').insert({ order_id: orderId, type, data }), 'addOrderEvent');
      return true;
    },
    listOrderEvents: async (orderId) =>
      check(await sb.from('order_events').select().eq('order_id', orderId).order('at', { ascending: true }), 'listOrderEvents').map(out),
    insertPaymentEvent: async (eventId, orderId, type) => {
      const { error } = await sb.from('payment_events').insert({ event_id: eventId, order_id: orderId, type });
      if (!error) return true;
      if (error.code === '23505') return false; // unique violation: already recorded
      throw new Error(`Supabase (insertPaymentEvent): ${error.message}`);
    },
    insertPhoto: async (photo) => out(check(await sb.from('photos').insert(inn(photo)).select().single(), 'insertPhoto')),
    getPhoto: async (id) => out(check(await sb.from('photos').select().eq('id', id).maybeSingle(), 'getPhoto')),
    casPhoto: async (id, where, patch) =>
      out(check(await applyWhere(sb.from('photos').update(inn(patch)).eq('id', id), where).select().maybeSingle(), 'casPhoto')),
    listOrphanPhotos: async (olderThanIso) =>
      check(await sb.from('photos').select().is('order_id', null).lt('created_at', olderThanIso).limit(500), 'listOrphanPhotos').map(out),
    deletePhoto: async (id) => {
      check(await sb.from('photos').delete().eq('id', id), 'deletePhoto');
      return true;
    },
    insertSiteEvent: async (evt) => {
      check(await sb.from('site_events').insert(inn(evt)), 'insertSiteEvent');
      return true;
    },
    listSiteEvents: async (sinceIso) =>
      check(await sb.from('site_events').select().gte('at', sinceIso).order('at', { ascending: true }).limit(20000), 'listSiteEvents').map(out),
  };
}

let instance;

/** @returns {Promise<ReturnType<typeof localDriver>>} */
export async function db() {
  if (!instance) instance = driverFor('data') === 'supabase' ? supabaseDriver() : Promise.resolve(localDriver());
  return instance;
}

/** Tests switch data directories between cases. */
export function resetDbForTests() {
  instance = undefined;
}
