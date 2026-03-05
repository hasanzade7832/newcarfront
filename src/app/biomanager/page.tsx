"use client";

import Header from "@/components/Header";
import BioManager from "@/app/admin/BioManager";
import { useAuthStore } from "@/store/auth.store";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function BioManagerPage() {
  const router = useRouter();
  const token = useAuthStore((s: any) => s.token);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const borderColor = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, hsl(var(--border)) 65%, rgba(255,255,255,.18) 35%)"
        : "hsl(var(--border))",
    [isDark]
  );

  const sectionBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.20) 100%)"
        : "linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, transparent), color-mix(in srgb, var(--card) 86%, transparent))",
    [isDark]
  );

  return (
    <>
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-4">
        <section
          className="rounded-3xl border p-4"
          style={{ borderColor, background: sectionBg }}
        >
          {!token ? (
            <div className="text-center py-10">
              <div className="text-sm text-muted-foreground">
                برای مدیریت بیوگرافی، ابتدا وارد شوید.
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  className="rounded-2xl"
                  onClick={() => router.push("/login")}
                >
                  رفتن به صفحه ورود
                </Button>
              </div>
            </div>
          ) : (
            <BioManager canManageBio embedded={false} />
          )}
        </section>
      </main>
    </>
  );
}
