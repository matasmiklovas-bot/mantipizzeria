"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/kitchen/login";
  const [ready, setReady] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    fetch("/api/kitchen/login")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/kitchen/login");
        } else {
          setReady(true);
        }
      })
      .catch(() => router.replace("/kitchen/login"));
  }, [isLoginPage, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-olive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}
