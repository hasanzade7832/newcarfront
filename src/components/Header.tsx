"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  CarFront,
  LogOut,
  Shield,
  LayoutDashboard,
  Loader2,
  UserRound,
  Pencil,
  Menu,
  X,
} from "lucide-react";
type BioItem = {
  id: number;
  userId?: number;
  title?: string;
  description?: string;
  isAdvanced?: boolean;
  contactInfo?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
function roleLabel(role?: string | null) {
  if (!role) return "";
  if (role === "SuperAdmin") return "Super Admin";
  if (role === "Admin") return "Admin";
  return "User";
}
function roleFa(role?: string | null) {
  if (role === "SuperAdmin") return "سوپر ادمین";
  if (role === "Admin") return "ادمین";
  return "کاربر";
}
function parseAdvancedLegacy(
  description?: string
): { person: string; contact: string } | null {
  const raw = String(description ?? "").trim();
  if (!raw) return null;
  if (raw.includes("|")) {
    const parts = raw.split("|").map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { person: parts[0], contact: parts[1] };
    }
  }
  const dash = raw.includes(" - ") ? " - " : raw.includes(" – ") ? " – " : null;
  if (dash) {
    const parts = raw.split(dash).map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { person: parts[0], contact: parts[1] };
    }
  }
  return null;
}
export default function Header() {
  const router = useRouter();
  const auth = useAuthStore() as any;
  const token = auth?.token as string | null | undefined;
  const role = auth?.role as string | null | undefined;
  const clear = auth?.clear as (() => void) | undefined;
  const storeUserId = auth?.userId as number | null | undefined;
  const storeUsername = auth?.username as string | null | undefined;
  const isAdmin = role === "Admin" || role === "SuperAdmin";
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const hasToken = mounted && !!token;
  const [loggingOut, setLoggingOut] = useState(false);
  const [bioItems, setBioItems] = useState<BioItem[]>([]);
  const [bioLoading, setBioLoading] = useState(false);
  const [meId, setMeId] = useState<number | null>(
    typeof storeUserId === "number" ? storeUserId : null
  );
  const [meUsername, setMeUsername] = useState<string>(
    String(storeUsername ?? "").trim()
  );
  useEffect(() => {
    if (typeof storeUserId === "number") setMeId(storeUserId);
  }, [storeUserId]);
  useEffect(() => {
    const u = String(storeUsername ?? "").trim();
    if (u) setMeUsername(u);
  }, [storeUsername]);
  useEffect(() => {
    if (!hasToken) return;
    const u = String(storeUsername ?? "").trim();
    const idOk = typeof storeUserId === "number";
    if (u && idOk) return;
    let alive = true;
    api
      .get("/api/users/me")
      .then((res) => {
        if (!alive) return;
        const idRaw = res.data?.id ?? res.data?.Id ?? null;
        const unRaw = res.data?.username ?? res.data?.Username ?? "";
        const idNum = Number(idRaw);
        if (Number.isFinite(idNum) && idNum > 0) setMeId(idNum);
        const uname = String(unRaw ?? "").trim();
        if (uname) setMeUsername(uname);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hasToken, storeUsername, storeUserId]);
  const headerBg = useMemo(() => {
    const main = isDark
      ? "linear-gradient(90deg, rgba(16,185,129,.40) 0%, rgba(56,189,248,.36) 45%, rgba(217,70,239,.32) 100%)"
      : "linear-gradient(90deg, rgba(16,185,129,.28) 0%, rgba(56,189,248,.24) 45%, rgba(217,70,239,.20) 100%)";
    const base = isDark
      ? "linear-gradient(180deg, rgba(10,10,10,1) 0%, rgba(12,12,12,1) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(252,252,252,1) 100%)";
    const sheen = isDark
      ? "radial-gradient(900px 180px at 50% 0%, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 60%)"
      : "radial-gradient(900px 200px at 50% 0%, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 62%)";
    return `${sheen}, ${main}, ${base}`;
  }, [isDark]);
  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.22), rgba(56,189,248,.18), rgba(217,70,239,.16))";
  }, [isDark]);
  const softGradient2 = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(56,189,248,.52), rgba(217,70,239,.44), rgba(34,197,94,.48))"
      : "linear-gradient(90deg, rgba(56,189,248,.20), rgba(217,70,239,.16), rgba(34,197,94,.18))";
  }, [isDark]);
  const dangerGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(239,68,68,.52), rgba(56,189,248,.22), rgba(217,70,239,.20))"
      : "linear-gradient(90deg, rgba(239,68,68,.30), rgba(56,189,248,.16), rgba(217,70,239,.12))";
  }, [isDark]);
  const roleTextColor = isDark ? "#ffffff" : "#0a0a0a";
  const btnBase =
    "rounded-2xl border px-4 h-10 text-sm font-semibold select-none " +
    "transition-all duration-200 " +
    "cursor-pointer hover:-translate-y-[1px] hover:shadow-md active:translate-y-0";
  const menuItemBase =
    "w-full rounded-2xl px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 " +
    "cursor-pointer select-none outline-none transition-all " +
    "hover:-translate-y-[1px] hover:shadow-sm";
  const handleLogout = useCallback(() => {
    if (loggingOut) return;
    setLoggingOut(true);
    setBioItems([]);
    setBioLoading(false);
    setTimeout(() => {
      try {
        clear?.();
      } finally {
        window.location.replace("/");
      }
    }, 0);
  }, [clear, loggingOut]);
  const applyHoverBg = (el: HTMLElement, bg: string) => {
    el.style.background = bg;
    el.style.borderColor = "hsl(var(--border))";
  };
  const applyNormalBg = (el: HTMLElement) => {
    el.style.background = "hsl(var(--background))";
    el.style.borderColor = "transparent";
  };
  const greetingName = (meUsername || "").trim() || (meId ? `#${meId}` : "");
  const greetingText = greetingName
    ? `👋 خوش آمدی ${roleFa(role)} ${greetingName}`
    : `👋 خوش آمدی ${roleFa(role)}`;

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50">
      {loggingOut ? (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/55">
          <div
            className="w-[92vw] max-w-[420px] rounded-3xl border p-5 text-center"
            style={{
              borderColor: "hsl(var(--border))",
              background: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
            }}
          >
            <div
              className="mx-auto h-12 w-12 rounded-2xl grid place-items-center border"
              style={{
                borderColor: "hsl(var(--border))",
                background: softGradient,
              }}
            >
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div
              className="mt-4 text-base font-semibold"
              style={{ color: roleTextColor }}
            >
              در حال خروج...
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              لطفاً چند لحظه صبر کنید
            </div>
          </div>
        </div>
      ) : null}

      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="border-b"
        style={{
          borderColor: "hsl(var(--border))",
          background: headerBg,
        }}
        suppressHydrationWarning
      >
        <div className="mx-auto max-w-[1650px] px-2 sm:px-4 py-3 flex items-center justify-between gap-3">
          {/* LEFT: Logo */}
          <motion.div
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <button
              type="button"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className="group flex items-center gap-2 select-none cursor-pointer"
              aria-label="صفحه اصلی"
              title="صفحه اصلی"
            >
              <span className="relative">
                <span
                  className="absolute -inset-1 rounded-3xl opacity-0 blur-[7px] group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: softGradient }}
                />
                <span
                  className="relative h-10 w-10 rounded-2xl grid place-items-center border shadow-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: softGradient,
                  }}
                >
                  <CarFront className="h-5 w-5" />
                </span>
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span
                  className="text-sm sm:text-base font-extrabold tracking-tight"
                  style={{ color: roleTextColor }}
                >
                  Keyvan
                </span>
              </span>
            </button>
          </motion.div>

          {/* CENTER: خوش آمدگویی + مدیریت بیوگرافی */}
          <div className="flex-1 flex justify-center">
            {hasToken ? (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "px-5 py-2 rounded-2xl border text-sm sm:text-base font-semibold",
                    "transition-all duration-200"
                  )}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                    color: roleTextColor,
                  }}
                >
                  {greetingText}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/biomanager")}
                  className={cn(
                    "h-10 rounded-2xl border px-3 text-sm font-semibold cursor-pointer",
                    "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md"
                  )}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      softGradient2;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))";
                  }}
                  title="مدیریت بیوگرافی"
                >
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="h-4 w-4 opacity-80" />
                    مدیریت بیوگرافی
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {/* RIGHT: Desktop and Mobile */}
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger Menu */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="منو"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              {!hasToken ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className={cn(btnBase, "relative overflow-hidden")}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                      style={{ background: softGradient }}
                    />
                    <span className="relative z-10">ورود</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className={cn(btnBase, "relative overflow-hidden")}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                      style={{ background: softGradient2 }}
                    />
                    <span className="relative z-10">ثبت‌نام</span>
                  </button>
                  <ThemeToggle />
                </>
              ) : (
                <>
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-2xl border bg-card cursor-pointer"
                        style={{
                          borderColor: "hsl(var(--border))",
                          background: isDark
                            ? "hsl(0 0% 10%)"
                            : "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        حساب کاربری
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-60 p-2 border shadow-lg rounded-2xl"
                      style={{
                        backgroundColor: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        borderColor: "hsl(var(--border))",
                        backdropFilter: "none",
                        WebkitBackdropFilter: "none",
                        opacity: 1,
                      }}
                    >
                      {isAdmin ? (
                        <DropdownMenuItem asChild className="p-0">
                          <Link
                            href="/admin"
                            className={cn(menuItemBase)}
                            style={{
                              border: "1px solid transparent",
                              background: "hsl(var(--background))",
                            }}
                            onMouseEnter={(e) =>
                              applyHoverBg(e.currentTarget, softGradient)
                            }
                            onMouseLeave={(e) => applyNormalBg(e.currentTarget)}
                            onFocus={(e) =>
                              applyHoverBg(e.currentTarget, softGradient)
                            }
                            onBlur={(e) => applyNormalBg(e.currentTarget)}
                          >
                            <Shield className="h-4 w-4 opacity-80" />
                            پنل مدیریت
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem asChild className="p-0">
                        <Link
                          href="/dashboard"
                          className={cn(menuItemBase)}
                          style={{
                            border: "1px solid transparent",
                            background: "hsl(var(--background))",
                          }}
                          onMouseEnter={(e) =>
                            applyHoverBg(e.currentTarget, softGradient2)
                          }
                          onMouseLeave={(e) => applyNormalBg(e.currentTarget)}
                          onFocus={(e) =>
                            applyHoverBg(e.currentTarget, softGradient2)
                          }
                          onBlur={(e) => applyNormalBg(e.currentTarget)}
                        >
                          <LayoutDashboard className="h-4 w-4 opacity-80" />
                          داشبورد
                        </Link>
                      </DropdownMenuItem>
                      {typeof meId === "number" ? (
                        <DropdownMenuItem asChild className="p-0">
                          <Link
                            href={`/u/${meId}`}
                            className={cn(menuItemBase)}
                            style={{
                              border: "1px solid transparent",
                              background: "hsl(var(--background))",
                            }}
                            onMouseEnter={(e) =>
                              applyHoverBg(e.currentTarget, softGradient)
                            }
                            onMouseLeave={(e) => applyNormalBg(e.currentTarget)}
                            onFocus={(e) =>
                              applyHoverBg(e.currentTarget, softGradient)
                            }
                            onBlur={(e) => applyNormalBg(e.currentTarget)}
                          >
                            <UserRound className="h-4 w-4 opacity-80" />
                            پنل کاربری
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={cn(menuItemBase)}
                        style={{
                          border: "1px solid transparent",
                          background: "hsl(var(--background))",
                          color: "hsl(var(--foreground))",
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          applyHoverBg(el, dangerGradient);
                          el.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          applyNormalBg(el);
                          el.style.color = "hsl(var(--foreground))";
                        }}
                        onFocus={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          applyHoverBg(el, dangerGradient);
                          el.style.color = "#fff";
                        }}
                        onBlur={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          applyNormalBg(el);
                          el.style.color = "hsl(var(--foreground))";
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                          handleLogout();
                        }}
                        disabled={loggingOut}
                      >
                        <LogOut className="h-4 w-4 opacity-90" />
                        خروج
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl"
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg">منو</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {hasToken ? (
                <div className="space-y-3">
                  <div
                    className="px-4 py-3 rounded-2xl border text-sm font-semibold"
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                      color: roleTextColor,
                    }}
                  >
                    {greetingText}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      router.push("/biomanager");
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                      "transition-all duration-200 hover:bg-muted/50"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Pencil className="h-4 w-4 opacity-80" />
                      مدیریت بیوگرافی
                    </span>
                  </button>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={cn(
                        "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                        "transition-all duration-200 hover:bg-muted/50"
                      )}
                      style={{
                        borderColor: "hsl(var(--border))",
                        background: isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4 opacity-80" />
                        پنل مدیریت
                      </span>
                    </Link>
                  )}

                  <Link
                    href="/dashboard"
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                      "transition-all duration-200 hover:bg-muted/50"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 opacity-80" />
                      داشبورد
                    </span>
                  </Link>

                  {typeof meId === "number" && (
                    <Link
                      href={`/u/${meId}`}
                      className={cn(
                        "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                        "transition-all duration-200 hover:bg-muted/50"
                      )}
                      style={{
                        borderColor: "hsl(var(--border))",
                        background: isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 opacity-80" />
                        پنل کاربری
                      </span>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                      "transition-all duration-200 hover:bg-destructive/10"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--destructive-foreground))",
                    }}
                    disabled={loggingOut}
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4 opacity-90" />
                      خروج
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/login");
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                      "transition-all duration-200 hover:bg-muted/50"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    ورود
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/register");
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold",
                      "transition-all duration-200 hover:bg-muted/50"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    ثبت‌نام
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
