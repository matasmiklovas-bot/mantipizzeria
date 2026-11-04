import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LeadsProvider } from "@/components/LeadsProvider";
import { Shell } from "@/components/Shell";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!me) redirect("/login");
  return (
    <LeadsProvider me={me}>
      <Shell>{children}</Shell>
    </LeadsProvider>
  );
}
