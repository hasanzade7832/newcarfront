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
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
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

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

  const mobilePanelBg = useMemo(() => {
    return isDark
      ? "linear-gradient(180deg, rgba(10,10,10,1) 0%, rgba(12,12,12,1) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(252,252,252,1) 100%)";
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
    setMobileMenuOpen(false);
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

  const navCloseTo = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  // ─── Mobile menu nav items config ────────────────────────────────────────────
  const mobileNavItems = useMemo(() => {
    const items: {
      key: string;
      label: string;
      icon: React.ReactNode;
      href?: string;
      onClick?: () => void;
      gradient: string;
      danger?: boolean;
    }[] = [];

    items.push({
      key: "bio",
      label: "مدیریت بیوگرافی",
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => navCloseTo("/biomanager"),
      gradient: softGradient2,
    });

    if (isAdmin) {
      items.push({
        key: "admin",
        label: "پنل مدیریت",
        icon: <Shield className="h-4 w-4" />,
        href: "/admin",
        gradient: softGradient,
      });
    }

    items.push({
      key: "dashboard",
      label: "داشبورد",
      icon: <LayoutDashboard className="h-4 w-4" />,
      href: "/dashboard",
      gradient: softGradient2,
    });

    if (typeof meId === "number") {
      items.push({
        key: "profile",
        label: "پنل کاربری",
        icon: <UserRound className="h-4 w-4" />,
        href: `/u/${meId}`,
        gradient: softGradient,
      });
    }

    items.push({
      key: "logout",
      label: "خروج",
      icon: <LogOut className="h-4 w-4" />,
      onClick: handleLogout,
      gradient: dangerGradient,
      danger: true,
    });

    return items;
  }, [
    isAdmin,
    meId,
    softGradient,
    softGradient2,
    dangerGradient,
    handleLogout,
  ]);

  return (
    <div className="sticky top-0 z-50">
      {/* ── Logout overlay ──────────────────────────────────────────────────── */}
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

      {/* ── Main header bar ─────────────────────────────────────────────────── */}
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
        <div className="mx-auto max-w-[1650px] px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* ── Logo ────────────────────────────────────────────────────── */}
          <motion.div
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="shrink-0"
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
                  className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-2xl grid place-items-center border shadow-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: softGradient,
                  }}
                >
                  <CarFront className="h-4 w-4 sm:h-5 sm:w-5" />
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

          {/* ── Center: greeting + bio manager (md+) ────────────────────── */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-2 min-w-0 px-2">
            {hasToken ? (
              <>
                <div
                  className="px-4 py-2 rounded-2xl border text-sm lg:text-base font-semibold truncate max-w-xs lg:max-w-sm xl:max-w-md transition-all duration-200"
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
                    "h-9 lg:h-10 rounded-2xl border px-3 text-sm font-semibold cursor-pointer shrink-0",
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
                    <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4 opacity-80" />
                    <span className="hidden lg:inline">مدیریت بیوگرافی</span>
                    <span className="lg:hidden">بیوگرافی</span>
                  </span>
                </button>
              </>
            ) : null}
          </div>

          {/* ── Right side ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop only actions */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
              {!hasToken ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className={cn(
                      btnBase,
                      "relative overflow-hidden h-9 lg:h-10 px-3 lg:px-4"
                    )}
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
                    className={cn(
                      btnBase,
                      "relative overflow-hidden h-9 lg:h-10 px-3 lg:px-4"
                    )}
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
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-2xl border bg-card cursor-pointer h-9 lg:h-10 px-3 lg:px-4 text-sm"
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
              )}
            </div>

            {/* ThemeToggle — always visible */}
            <ThemeToggle />

            {/* Hamburger — sm and below (mobile + small tablet) */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-2xl border cursor-pointer"
              style={{
                borderColor: "hsl(var(--border))",
                background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                color: "hsl(var(--foreground))",
              }}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="باز کردن منو"
            >
              <Menu className="h-4.5 w-4.5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile / Tablet Slide-over panel ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Slide panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              dir="rtl"
              className="fixed inset-y-0 right-0 z-[70] flex flex-col w-[85vw] max-w-[360px] border-l shadow-2xl overflow-hidden"
              style={{
                borderColor: "hsl(var(--border))",
                background: mobilePanelBg,
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{
                  borderColor: "hsl(var(--border))",
                  background: headerBg,
                }}
              >
                {/* Logo repeat */}
                <button
                  type="button"
                  onClick={() => navCloseTo("/")}
                  className="flex items-center gap-2 select-none cursor-pointer"
                >
                  <span
                    className="h-8 w-8 rounded-xl grid place-items-center border shadow-sm"
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: softGradient,
                    }}
                  >
                    <CarFront className="h-4 w-4" />
                  </span>
                  <span
                    className="text-sm font-extrabold tracking-tight"
                    style={{ color: roleTextColor }}
                  >
                    Keyvan
                  </span>
                </button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-xl border flex items-center justify-center cursor-pointer"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark ? "hsl(0 0% 14%)" : "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                  }}
                  aria-label="بستن منو"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-2">
                {hasToken ? (
                  <>
                    {/* Greeting card */}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
                      style={{
                        borderColor: "hsl(var(--border))",
                        background: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                        color: roleTextColor,
                      }}
                    >
                      {greetingText}
                    </motion.div>

                    {/* Nav items */}
                    {mobileNavItems.map((item, i) => {
                      const sharedStyle: React.CSSProperties = {
                        borderColor: "hsl(var(--border))",
                        background: isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))",
                        color: item.danger
                          ? "hsl(var(--destructive))"
                          : "hsl(var(--foreground))",
                      };

                      const inner = (
                        <span className="flex items-center gap-3">
                          <span
                            className="h-7 w-7 rounded-xl grid place-items-center shrink-0"
                            style={{ background: item.gradient, opacity: 0.9 }}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 text-right">
                            {item.label}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 opacity-30 shrink-0" />
                        </span>
                      );

                      if (item.href) {
                        return (
                          <motion.div
                            key={item.key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.07 + i * 0.04 }}
                          >
                            <Link
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-150 active:scale-[.98]"
                              style={sharedStyle}
                            >
                              {inner}
                            </Link>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.07 + i * 0.04 }}
                        >
                          {item.key === "logout" && (
                            <div
                              className="my-2 border-t"
                              style={{ borderColor: "hsl(var(--border))" }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={item.onClick}
                            disabled={item.key === "logout" && loggingOut}
                            className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-150 active:scale-[.98] cursor-pointer disabled:opacity-60"
                            style={sharedStyle}
                          >
                            {inner}
                          </button>
                        </motion.div>
                      );
                    })}
                  </>
                ) : (
                  /* Not logged in */
                  <>
                    {[
                      { label: "ورود", path: "/login", gradient: softGradient },
                      {
                        label: "ثبت‌نام",
                        path: "/register",
                        gradient: softGradient2,
                      },
                    ].map((item, i) => (
                      <motion.button
                        key={item.path}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 + i * 0.05 }}
                        onClick={() => navCloseTo(item.path)}
                        className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-3 cursor-pointer active:scale-[.98] transition-all duration-150"
                        style={{
                          borderColor: "hsl(var(--border))",
                          background: isDark
                            ? "hsl(0 0% 10%)"
                            : "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        <span
                          className="h-7 w-7 rounded-xl grid place-items-center shrink-0"
                          style={{ background: item.gradient }}
                        />
                        <span className="flex-1 text-right">{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-30" />
                      </motion.button>
                    ))}
                  </>
                )}
              </div>

              {/* Panel footer */}
              <div
                className="px-4 py-3 border-t shrink-0 flex items-center justify-between"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <span className="text-xs text-muted-foreground">
                  {hasToken ? roleLabel(role) : "مهمان"}
                </span>
                <ThemeToggle />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
