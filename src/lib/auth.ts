import { cookies } from "next/headers";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === "authenticated";
}

export async function isKitchenAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("kitchen_session")?.value === "authenticated";
}

export async function isStaffAuthenticated(): Promise<boolean> {
  return (await isAdminAuthenticated()) || (await isKitchenAuthenticated());
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function requireKitchen() {
  if (!(await isKitchenAuthenticated())) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function requireStaff() {
  if (!(await isStaffAuthenticated())) {
    throw new Error("UNAUTHORIZED");
  }
}
