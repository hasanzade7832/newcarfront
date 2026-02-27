"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { startSignalR } from "@/lib/signalr";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Search,
  X,
  Eye,
  Users,
  Car,
  FileText,
  RefreshCcw,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

const log = (...args: any[]) => console.log("🔍 [CarAds]", ...args);
const logWarn = (...args: any[]) => console.warn("⚠️ [CarAds]", ...args);
const logError = (...args: any[]) => console.error("❌ [CarAds]", ...args);
const logOk = (...args: any[]) => console.log("✅ [CarAds]", ...args);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Ad = {
  id: number;
  userId: number;
  type: number | string;
  title: string;
  year: number;
  color: string;
  mileageKm: number;
  price: number;
  gearbox: number | string;
  createdAt: string;
  insuranceMonths?: number | null;
  chassisNumber?: string;
  contactPhone?: string;
  description?: string;
  viewCount: number;
};

type TelegramMsg = {
  id: number;
  messageId: number;
  text: string;
  fromUsername?: string;
  fromFirstName?: string;
  receivedAt: string;
  telegramLink: string;
};

type ListItem =
  | { kind: "ad"; data: Ad }
  | { kind: "telegram"; data: TelegramMsg };

type UserInfo = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
};

// ─────────────────────────────────────────────
// Label helpers
// ─────────────────────────────────────────────
const TYPE_NUM: Record<string, string> = {
  "1": "فروش کارکرده",
  "2": "فروش همکاری",
  "3": "درخواست خرید",
  "4": "فروش صفر",
};
const TYPE_STR: Record<string, string> = {
  usedsale: "فروش کارکرده",
  coopsale: "فروش همکاری",
  buyrequest: "درخواست خرید",
  zerosale: "فروش صفر",
};
function typeLabel(t: number | string): string {
  const s = String(t).toLowerCase().replace(/\s/g, "");
  return TYPE_NUM[s] ?? TYPE_STR[s] ?? "نامشخص";
}

const GEAR_NUM: Record<string, string> = {
  "0": "—",
  "1": "اتومات",
  "2": "دنده‌ای",
};
const GEAR_STR: Record<string, string> = {
  none: "—",
  automatic: "اتومات",
  manual: "دنده‌ای",
};
function gearboxLabel(g: number | string): string {
  const s = String(g).toLowerCase().replace(/\s/g, "");
  return GEAR_NUM[s] ?? GEAR_STR[s] ?? "—";
}

function priceToText(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const billion = Math.floor(n / 1000);
  const rem = n - billion * 1000;
  const million = Math.floor(rem);
  const thousand = Math.round((rem - million) * 1000);
  const toFa = (x: number) => x.toLocaleString("fa-IR");
  const parts: string[] = [];
  if (billion > 0) parts.push(`${toFa(billion)} میلیارد`);
  if (million > 0) parts.push(`${toFa(million)} میلیون`);
  if (thousand > 0) parts.push(`${toFa(thousand)} هزار`);
  return parts.length ? parts.join(" و ") + " تومان" : "—";
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─────────────────────────────────────────────
// Description Modal
// ─────────────────────────────────────────────
function DescModal({
  ad,
  open,
  onClose,
  borderColor,
  isDark,
}: {
  ad: Ad | null;
  open: boolean;
  onClose: () => void;
  borderColor: string;
  isDark: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !ad) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.52)",
              backdropFilter: "blur(4px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div
              className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl"
              style={{
                borderColor,
                background: isDark
                  ? "linear-gradient(180deg,rgba(15,15,15,.98),rgba(8,8,8,.99))"
                  : "hsl(var(--card))",
                maxHeight: "70vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <div>
                  <h2 className="text-sm font-extrabold text-foreground">
                    {ad.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    توضیحات آگهی
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 w-8 rounded-xl border grid place-items-center opacity-60 hover:opacity-100 transition-opacity"
                  style={{
                    borderColor,
                    background: isDark
                      ? "hsl(0 0% 12%)"
                      : "hsl(var(--background))",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                className="rounded-2xl border px-4 py-3"
                style={{
                  borderColor,
                  background: isDark
                    ? "hsl(0 0% 10%)"
                    : "hsl(var(--background))",
                }}
                dir="rtl"
              >
                <p className="text-sm text-foreground leading-8 whitespace-pre-wrap">
                  {ad.description?.trim() || "—"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// TelegramRow
// ─────────────────────────────────────────────
function TelegramRow({
  msg,
  isNew,
  borderColor,
  isDark,
  softGradient,
}: {
  msg: TelegramMsg;
  isNew: boolean;
  borderColor: string;
  isDark: boolean;
  softGradient: string;
}) {
  const [hovered, setHovered] = useState(false);
  const senderName = msg.fromFirstName || msg.fromUsername || "ناشناس";

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div
        className="relative rounded-[14px] border"
        style={{
          borderColor: isNew ? "rgba(0,136,204,0.7)" : borderColor,
          background: isDark
            ? "linear-gradient(180deg,rgba(0,136,204,0.07),rgba(0,136,204,0.03))"
            : "linear-gradient(180deg,rgba(0,136,204,0.05),rgba(0,136,204,0.02))",
          boxShadow: isNew ? "0 0 0 1.5px rgba(0,136,204,0.35)" : "none",
          transition: "box-shadow 0.12s, border-color 0.12s",
        }}
      >
        <div
          className="flex items-center px-3 py-2 gap-2"
          style={{ direction: "rtl", minWidth: 0 }}
        >
          {/* آیکون تلگرام */}
          <div
            className="shrink-0 h-7 w-7 rounded-xl grid place-items-center"
            style={{
              background: "rgba(0,136,204,0.15)",
              border: "1px solid rgba(0,136,204,0.3)",
            }}
          >
            <Send className="h-3.5 w-3.5" style={{ color: "rgb(0,136,204)" }} />
          </div>

          {/* فرستنده */}
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-xl border whitespace-nowrap shrink-0"
            style={{
              borderColor: "rgba(0,136,204,0.4)",
              background: "rgba(0,136,204,0.1)",
              color: "rgb(0,136,204)",
            }}
          >
            {senderName}
          </span>

          {/* جداکننده */}
          <div
            className="shrink-0 h-4 w-px opacity-20"
            style={{ background: "currentColor" }}
          />

          {/* متن پیام */}
          <span
            className="flex-1 text-sm text-foreground truncate leading-tight min-w-0"
            dir="rtl"
          >
            {msg.text}
          </span>

          {/* ساعت */}
          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
            {formatTime(msg.receivedAt)}
          </span>

          {/* دکمه باز کردن در تلگرام */}
          <a
            href={msg.telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title="مشاهده در تلگرام"
            className="h-8 w-8 rounded-xl border grid place-items-center select-none outline-none shrink-0"
            style={{
              borderColor: hovered ? "rgba(0,136,204,0.8)" : borderColor,
              background: hovered
                ? "rgba(0,136,204,0.2)"
                : isDark
                ? "hsl(0 0% 12%)"
                : "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              transform: hovered ? "translateY(-1px) scale(1.08)" : "none",
              boxShadow: hovered ? "0 4px 16px rgba(0,136,204,0.3)" : "none",
              transition: "all 0.18s",
            }}
          >
            <Send
              className="h-4 w-4"
              style={{ color: hovered ? "rgb(0,136,204)" : undefined }}
            />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// AdRow
// ─────────────────────────────────────────────
function AdRow({
  ad,
  userInfo,
  isNew,
  flashCount,
  selected,
  onViewClick,
  onSelect,
  onDescClick,
  softGradient,
  greenGradient,
  borderColor,
  cardBg,
  chipBg,
  isDark,
}: {
  ad: Ad;
  userInfo?: UserInfo;
  isNew: boolean;
  flashCount: number;
  selected: boolean;
  onViewClick: (ad: Ad) => void;
  onSelect: (ad: Ad) => void;
  onDescClick: (ad: Ad) => void;
  softGradient: string;
  greenGradient: string;
  borderColor: string;
  cardBg: string;
  chipBg: string;
  isDark: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState<"green" | "blue">("green");
  const prevFlash = useRef(0);
  const [hoveredView, setHoveredView] = useState(false);

  useEffect(() => {
    if (!isNew) return;
    const t1 = setTimeout(() => {
      setFlashColor("green");
      setIsFlashing(true);
    }, 650);
    const t2 = setTimeout(() => setIsFlashing(false), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isNew]);

  useEffect(() => {
    if (flashCount > 0 && flashCount !== prevFlash.current) {
      prevFlash.current = flashCount;
      setFlashColor("blue");
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 2000);
    }
  }, [flashCount]);

  const flashBorder =
    flashColor === "green" ? "rgba(34,197,94,0.9)" : "rgba(56,189,248,0.9)";
  const flashShadow =
    flashColor === "green"
      ? "0 0 0 2px rgba(34,197,94,0.45), 0 0 30px rgba(34,197,94,0.22)"
      : "0 0 0 2px rgba(56,189,248,0.45), 0 0 30px rgba(56,189,248,0.22)";
  const flashAnim = flashColor === "green" ? "rowFlashGreen" : "rowFlashBlue";
  const hasDesc = !!ad.description?.trim();
  const gb = gearboxLabel(ad.gearbox);

  const chip = (content: React.ReactNode) => (
    <span
      className="text-xs font-semibold whitespace-nowrap shrink-0"
      style={{ background: chipBg, borderRadius: 8, padding: "2px 7px" }}
    >
      {content}
    </span>
  );

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div
        className="relative rounded-[14px] border cursor-pointer"
        onClick={() => onSelect(ad)}
        style={{
          borderColor: selected
            ? "rgba(56,189,248,0.7)"
            : isFlashing
            ? flashBorder
            : borderColor,
          background: selected
            ? isDark
              ? "rgba(56,189,248,0.08)"
              : "rgba(56,189,248,0.05)"
            : cardBg,
          boxShadow: selected
            ? "0 0 0 1.5px rgba(56,189,248,0.35)"
            : isFlashing
            ? flashShadow
            : "none",
          animation:
            !selected && isFlashing
              ? `${flashAnim} 0.38s ease-in-out infinite alternate`
              : "none",
          transition: "box-shadow 0.12s, border-color 0.12s, background 0.12s",
          overflow: "hidden",
        }}
      >
        {isFlashing && !selected && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]"
            style={{ zIndex: 0 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  flashColor === "green"
                    ? "linear-gradient(90deg,transparent,rgba(34,197,94,0.09),transparent)"
                    : "linear-gradient(90deg,transparent,rgba(56,189,248,0.09),transparent)",
                animation: "shimmerSlide 0.55s linear infinite",
              }}
            />
          </div>
        )}

        <div
          className="relative z-10 flex items-center px-3 py-2"
          style={{ direction: "rtl", gap: 8, minWidth: 0 }}
        >
          <div
            className="flex items-center gap-1.5 shrink-0"
            style={{ maxWidth: 200 }}
          >
            <span className="font-bold text-sm text-foreground truncate leading-tight">
              {ad.title}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0"
              style={{ background: softGradient }}
            >
              {typeLabel(ad.type)}
            </span>
          </div>

          <div
            className="shrink-0 h-4 w-px opacity-20"
            style={{ background: "currentColor" }}
          />

          <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 overflow-hidden">
            {chip(ad.year)}
            {chip(ad.color)}
            {chip(`${Number(ad.mileageKm).toLocaleString("fa-IR")} km`)}
            {gb !== "—" && chip(gb)}
            <span
              className="text-xs font-extrabold whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-xl border"
              style={{ borderColor, background: softGradient }}
            >
              {priceToText(ad.price)}
            </span>

            <button
              type="button"
              disabled={!hasDesc}
              onClick={(e) => {
                if (!hasDesc) return;
                e.stopPropagation();
                onDescClick(ad);
              }}
              className="flex items-center gap-1 text-[11px] rounded-lg border font-semibold whitespace-nowrap shrink-0 select-none outline-none"
              style={{
                minWidth: 82,
                padding: "3px 10px",
                borderColor: hasDesc
                  ? borderColor
                  : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
                background: hasDesc
                  ? "rgba(148,163,184,0.10)"
                  : isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
                color: hasDesc
                  ? isDark
                    ? "rgba(203,213,225,0.85)"
                    : "rgba(71,85,105,0.9)"
                  : isDark
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(0,0,0,0.22)",
                cursor: hasDesc ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!hasDesc) return;
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(148,163,184,0.20)";
                b.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                if (!hasDesc) return;
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(148,163,184,0.10)";
                b.style.transform = "none";
              }}
            >
              <FileText className="h-3 w-3 opacity-60 shrink-0" />
              توضیحات
            </button>
          </div>

          <div
            className="shrink-0 h-4 w-px opacity-20"
            style={{ background: "currentColor" }}
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {userInfo && (
              <span
                className="text-[11px] font-bold px-2 py-1 rounded-xl border whitespace-nowrap"
                style={{ borderColor, background: softGradient }}
              >
                {userInfo.username}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewClick(ad);
              }}
              onMouseEnter={() => setHoveredView(true)}
              onMouseLeave={() => setHoveredView(false)}
              title="بازدید از خودرو"
              className="h-8 w-8 rounded-xl border grid place-items-center select-none outline-none shrink-0"
              style={{
                borderColor: hoveredView ? "rgba(34,197,94,0.8)" : borderColor,
                background: hoveredView
                  ? greenGradient
                  : isDark
                  ? "hsl(0 0% 12%)"
                  : "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                cursor: "pointer",
                transform: hoveredView
                  ? "translateY(-1px) scale(1.08)"
                  : "none",
                boxShadow: hoveredView
                  ? "0 4px 16px rgba(34,197,94,0.25)"
                  : "none",
                transition: "all 0.18s",
              }}
            >
              <Car className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// EmptyRightPanel
// ─────────────────────────────────────────────
function EmptyRightPanel({
  borderColor,
  isDark,
}: {
  borderColor: string;
  isDark: boolean;
}) {
  const bg = isDark
    ? "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.20) 100%)"
    : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))";

  return (
    <div
      className="rounded-[22px] border h-full flex flex-col items-center justify-center gap-3"
      style={{ borderColor, background: bg }}
    >
      <div
        className="flex flex-col items-center gap-2"
        style={{ opacity: 0.28 }}
      >
        <FileText className="h-9 w-9" />
        <p
          className="text-sm font-semibold text-foreground text-center px-4"
          dir="rtl"
        >
          هنوز هیچ توضیحی ثبت نشده
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const softGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg,rgba(34,197,94,.56),rgba(56,189,248,.48),rgba(217,70,239,.46))"
        : "linear-gradient(90deg,rgba(34,197,94,.22),rgba(56,189,248,.18),rgba(217,70,239,.16))",
    [isDark]
  );

  const greenGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg,rgba(34,197,94,.65),rgba(34,197,94,.45))"
        : "linear-gradient(90deg,rgba(34,197,94,.35),rgba(34,197,94,.20))",
    [isDark]
  );

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
        ? "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.20) 100%)"
        : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))",
    [isDark]
  );

  const cardBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg,rgba(255,255,255,.033) 0%,rgba(255,255,255,.016) 55%,rgba(0,0,0,.16) 100%)"
        : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))",
    [isDark]
  );

  const chipBg = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb,rgba(255,255,255,.08) 70%,rgba(0,0,0,.35) 30%)"
        : "color-mix(in srgb,hsl(var(--foreground)) 7%,hsl(var(--background)) 93%)",
    [isDark]
  );

  const [ads, setAds] = useState<Ad[]>([]);
  const [telegramMsgs, setTelegramMsgs] = useState<TelegramMsg[]>([]);
  const [newTelegramIds, setNewTelegramIds] = useState<Set<number>>(new Set());
  const [users, setUsers] = useState<Record<number, UserInfo>>({});
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [flashCounts, setFlashCounts] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [todayViews, setTodayViews] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [descAd, setDescAd] = useState<Ad | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchedUserIds = useRef<Set<number>>(new Set());
  function fetchUser(userId: number) {
    if (fetchedUserIds.current.has(userId)) return;
    fetchedUserIds.current.add(userId);
    api
      .get(`/api/users/${userId}`)
      .then((r) =>
        setUsers((prev) => ({
          ...prev,
          [userId]: {
            id: r.data.id,
            username: r.data.username,
            firstName: r.data.firstName,
            lastName: r.data.lastName,
          },
        }))
      )
      .catch(() => {
        fetchedUserIds.current.delete(userId);
      });
  }

  const loadAds = useCallback(async () => {
    log("Fetching /api/ads ...");
    const res = await api.get("/api/ads");
    const list: Ad[] = res.data ?? [];
    logOk("Ads loaded:", list.length, "items");
    setAds(list);
    [...new Set(list.map((a) => a.userId))].forEach(fetchUser);
  }, []);

  const loadTodayStats = useCallback(async () => {
    const r = await api.get("/api/ads/stats/today");
    setTodayViews(r.data?.todayViews ?? 0);
  }, []);

  const loadTelegramToday = useCallback(async () => {
    try {
      const r = await api.get("/api/telegram/today");
      setTelegramMsgs(r.data ?? []);
      logOk("Telegram messages loaded:", (r.data ?? []).length);
    } catch (e: any) {
      logWarn("Failed to load telegram messages →", e?.message);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadAds(),
        loadTodayStats(),
        loadTelegramToday(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAds, loadTodayStats, loadTelegramToday]);

  useEffect(() => {
    loadAds().catch((e: any) => logError("Failed to load ads →", e?.message));
    loadTodayStats().catch((e: any) =>
      logWarn("Failed to load stats →", e?.message)
    );
    loadTelegramToday();
  }, [loadAds, loadTodayStats, loadTelegramToday]);

  // ── ریست پیام‌های تلگرام راس ۱۲ شب ──
  useEffect(() => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msToMidnight = midnight.getTime() - now.getTime();

    const t = setTimeout(() => {
      setTelegramMsgs([]);
      logOk("Telegram messages cleared at midnight");
    }, msToMidnight);

    return () => clearTimeout(t);
  }, []);

  // ── SignalR ──
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const conn = await startSignalR();

        const onOnlineCount = (count: number) => setOnlineCount(count);
        conn.off("OnlineCount");
        conn.on("OnlineCount", onOnlineCount);
        await conn.invoke("GetOnlineCount");

        // ✅ دریافت پیام تلگرام real-time
        const onTelegramMsg = (msg: TelegramMsg) => {
          logOk("New Telegram message:", msg.text.substring(0, 30));
          setTelegramMsgs((prev) => {
            const exists = prev.some((m) => m.id === msg.id);
            if (exists) return prev;
            return [msg, ...prev];
          });
          setNewTelegramIds((prev) => new Set([...prev, msg.id]));
          setTimeout(() => {
            setNewTelegramIds((prev) => {
              const next = new Set(prev);
              next.delete(msg.id);
              return next;
            });
          }, 3000);
        };

        conn.off("TelegramMessageReceived");
        conn.on("TelegramMessageReceived", onTelegramMsg);

        unsub = () => {
          conn.off("OnlineCount", onOnlineCount);
          conn.off("TelegramMessageReceived", onTelegramMsg);
        };
      } catch (err: any) {
        logError("SignalR failed →", err?.message);
      }
    })();

    return () => {
      unsub?.();
    };
  }, []);

  const handleViewClick = useCallback(
    async (ad: Ad) => {
      setFlashCounts((prev) => ({ ...prev, [ad.id]: (prev[ad.id] ?? 0) + 1 }));
      try {
        const res = await api.post(`/api/ads/${ad.id}/view`);
        const newCount = res.data?.viewCount ?? Number(ad.viewCount) + 1;
        setAds((prev) =>
          prev.map((x) => (x.id === ad.id ? { ...x, viewCount: newCount } : x))
        );
      } catch (e: any) {
        logError("View API error →", e?.message);
      }
      await new Promise((r) => setTimeout(r, 700));
      router.push(`/u/${ad.userId}?ad=${ad.id}`);
    },
    [router]
  );

  // ── لیست ترکیبی (آگهی + تلگرام) ──
  const combinedItems = useMemo((): ListItem[] => {
    let filteredAds = ads;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filteredAds = ads.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.color.toLowerCase().includes(q) ||
          String(a.year).includes(q) ||
          typeLabel(a.type).includes(q) ||
          priceToText(a.price).includes(q)
      );
    }

    const adItems: ListItem[] = filteredAds.map((a) => ({
      kind: "ad",
      data: a,
    }));
    const tgItems: ListItem[] = telegramMsgs.map((m) => ({
      kind: "telegram",
      data: m,
    }));

    // ترکیب و مرتب‌سازی بر اساس زمان (جدیدترین اول)
    const all = [...adItems, ...tgItems].sort((a, b) => {
      const getTime = (item: ListItem) => {
        if (item.kind === "ad") return new Date(item.data.createdAt).getTime();
        return new Date(item.data.receivedAt).getTime();
      };
      return getTime(b) - getTime(a);
    });

    return all;
  }, [ads, telegramMsgs, search]);

  useEffect(() => {
    if (selectedAd) {
      const updated = ads.find((a) => a.id === selectedAd.id);
      if (updated) setSelectedAd(updated);
    }
  }, [ads, selectedAd]);

  if (!mounted) {
    return (
      <>
        <Header />
        <main
          className="mx-auto max-w-[1800px] px-2 sm:px-4 py-3"
          style={{ height: "calc(100vh - 84px)", overflow: "hidden" }}
        >
          <div
            className="rounded-[26px] border flex flex-col h-full overflow-hidden p-3 sm:p-4"
            style={{
              borderColor: "hsl(var(--border))",
              background:
                "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.20) 100%)",
            }}
          />
        </main>
      </>
    );
  }

  const adCount = combinedItems.filter((i) => i.kind === "ad").length;
  const tgCount = combinedItems.filter((i) => i.kind === "telegram").length;

  return (
    <>
      <style>{`
        @keyframes rowFlashGreen {
          from { box-shadow: 0 0 0 2px rgba(34,197,94,0.45), 0 0 18px rgba(34,197,94,0.18); }
          to   { box-shadow: 0 0 0 3px rgba(34,197,94,0.92), 0 0 38px rgba(34,197,94,0.44); }
        }
        @keyframes rowFlashBlue {
          from { box-shadow: 0 0 0 2px rgba(56,189,248,0.45), 0 0 18px rgba(56,189,248,0.18); }
          to   { box-shadow: 0 0 0 3px rgba(56,189,248,0.92), 0 0 38px rgba(56,189,248,0.44); }
        }
        @keyframes shimmerSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(-100%); }
        }
      `}</style>

      <DescModal
        ad={descAd}
        open={descOpen}
        onClose={() => setDescOpen(false)}
        borderColor={borderColor}
        isDark={isDark}
      />

      <Header />

      <main
        className="mx-auto max-w-[1800px] px-2 sm:px-4 py-3"
        style={{ height: "calc(100vh - 84px)", overflow: "hidden" }}
      >
        <div
          className="rounded-[26px] border flex flex-col h-full overflow-hidden p-3 sm:p-4"
          style={{ borderColor, background: sectionBg }}
        >
          {/* Search + Refresh */}
          <div className="flex justify-center shrink-0">
            <div className="w-full max-w-[520px] relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

              <button
                type="button"
                onClick={refreshAll}
                title="رفرش"
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
                disabled={refreshing}
              >
                <RefreshCcw
                  className="h-4 w-4"
                  style={{
                    animation: refreshing
                      ? "spin 0.9s linear infinite"
                      : "none",
                  }}
                />
              </button>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در آگهی‌ها: نام، رنگ، سال، قیمت..."
                className="w-full h-10 rounded-2xl border pr-10 pl-10 text-sm outline-none text-center"
                style={{
                  borderColor,
                  background: isDark
                    ? "hsl(0 0% 10%)"
                    : "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-10 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div
            className="mt-2.5 h-px opacity-25 shrink-0"
            style={{ background: "hsl(var(--border))" }}
          />

          {/* layout */}
          <div
            className="flex-1 min-h-0 flex gap-3 mt-2"
            style={{ direction: "ltr" }}
          >
            <div
              className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-1"
              style={{ scrollbarWidth: "thin" }}
            >
              <div className="space-y-1">
                {combinedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-40 py-20">
                    <Car className="h-8 w-8" />
                    <div className="text-sm font-semibold">موردی یافت نشد</div>
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {combinedItems.map((item) => {
                      if (item.kind === "telegram") {
                        return (
                          <TelegramRow
                            key={`tg-${item.data.id}`}
                            msg={item.data}
                            isNew={newTelegramIds.has(item.data.id)}
                            borderColor={borderColor}
                            isDark={isDark}
                            softGradient={softGradient}
                          />
                        );
                      }
                      const ad = item.data;
                      return (
                        <AdRow
                          key={`ad-${ad.id}`}
                          ad={ad}
                          userInfo={users[ad.userId]}
                          isNew={newIds.has(ad.id)}
                          flashCount={flashCounts[ad.id] ?? 0}
                          selected={selectedAd?.id === ad.id}
                          onViewClick={handleViewClick}
                          onSelect={(a) =>
                            setSelectedAd((prev) =>
                              prev?.id === a.id ? null : a
                            )
                          }
                          onDescClick={(a) => {
                            setDescAd(a);
                            setDescOpen(true);
                          }}
                          softGradient={softGradient}
                          greenGradient={greenGradient}
                          borderColor={borderColor}
                          cardBg={cardBg}
                          chipBg={chipBg}
                          isDark={isDark}
                        />
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>

            <div className="shrink-0" style={{ width: 800 }}>
              <EmptyRightPanel borderColor={borderColor} isDark={isDark} />
            </div>
          </div>

          {/* Footer stats */}
          <div
            className="mt-2 pt-2 flex items-center justify-between gap-3 flex-wrap shrink-0"
            style={{ borderTop: `1px solid hsl(var(--border) / 0.25)` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-4 py-1.5 rounded-2xl border text-xs font-bold"
                style={{ borderColor, background: softGradient }}
              >
                <Car className="h-3.5 w-3.5" />
                <span>{adCount.toLocaleString("fa-IR")} آگهی</span>
              </div>
              {tgCount > 0 && (
                <div
                  className="flex items-center gap-2 px-4 py-1.5 rounded-2xl border text-xs font-bold"
                  style={{
                    borderColor: "rgba(0,136,204,0.4)",
                    background: "rgba(0,136,204,0.12)",
                    color: "rgb(0,136,204)",
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{tgCount.toLocaleString("fa-IR")} پیام تلگرام</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold"
                style={{
                  borderColor,
                  background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                }}
              >
                <Eye className="h-3.5 w-3.5 opacity-70" />
                <span>بازدید امروز:</span>
                <span style={{ color: "rgb(56,189,248)" }}>
                  {todayViews.toLocaleString("fa-IR")}
                </span>
              </div>

              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold"
                style={{
                  borderColor,
                  background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: "rgb(34,197,94)",
                    boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                    animation: "pulse 2s infinite",
                  }}
                />
                <Users className="h-3.5 w-3.5 opacity-70" />
                <span>آنلاین:</span>
                <span style={{ color: "rgb(34,197,94)" }}>
                  {onlineCount.toLocaleString("fa-IR")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
