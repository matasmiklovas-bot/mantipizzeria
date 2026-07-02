import { isSupabaseConfigured } from "./supabase/env";

// Nustatymai saugomi restaurant_tables lentelėje kaip specialios eilutės,
// kad nereikėtų DB migracijos: active=false reiškia išjungta.
const ORDERING_ROW = 9001;
const BUSY_ROW = 9002;

export interface SiteSettings {
  orderingEnabled: boolean;
  busyMode: boolean;
}

const memorySettings: SiteSettings = {
  orderingEnabled: true,
  busyMode: false,
};

async function getSupabase() {
  const { createServiceClient } = await import("./supabase/server");
  return createServiceClient();
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) {
    return { ...memorySettings };
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("number, active")
      .in("number", [ORDERING_ROW, BUSY_ROW]);
    if (error) throw error;

    const rows = new Map((data ?? []).map((r) => [r.number, r.active]));
    return {
      // Nėra eilutės = užsakymai įjungti
      orderingEnabled: rows.get(ORDERING_ROW) !== false,
      busyMode: rows.get(BUSY_ROW) === true,
    };
  } catch (err) {
    console.error("getSiteSettings failed:", err);
    return { orderingEnabled: true, busyMode: false };
  }
}

async function upsertSettingRow(number: number, active: boolean): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("restaurant_tables")
    .upsert({ number, active }, { onConflict: "number" });
  if (error) throw error;
}

export async function updateSiteSettings(
  updates: Partial<SiteSettings>
): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) {
    if (updates.orderingEnabled !== undefined)
      memorySettings.orderingEnabled = updates.orderingEnabled;
    if (updates.busyMode !== undefined)
      memorySettings.busyMode = updates.busyMode;
    return { ...memorySettings };
  }

  if (updates.orderingEnabled !== undefined) {
    await upsertSettingRow(ORDERING_ROW, updates.orderingEnabled);
  }
  if (updates.busyMode !== undefined) {
    await upsertSettingRow(BUSY_ROW, updates.busyMode);
  }
  return getSiteSettings();
}
