import { cookieValue, JOIN_COOKIE, secure } from "./session";
import { createWorkspace, workspaceByInvite } from "./store";

/**
 * Where a new person lands: the team whose invite link they opened (cookie set by /login?join=…, or the token sent
 * with the form), otherwise a new empty workspace they own.
 */
export async function workspaceForNewUser(request: Request, userId: string, displayName: string, token?: string): Promise<string> {
  const invite = token || cookieValue(request, JOIN_COOKIE) || "";
  const w = invite ? await workspaceByInvite(invite) : null;
  if (w) return w.id;
  return (await createWorkspace(displayName, userId)).id;
}

export const joinCookie = (request: Request, token: string) =>
  `${JOIN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${token ? 3600 : 0}; HttpOnly; SameSite=Lax${secure(request) ? "; Secure" : ""}`;
