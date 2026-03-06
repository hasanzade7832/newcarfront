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
  Clock3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
dayjs.extend(jalaliday);
import ShowroomSearchModal from "@/components/namecars/ShowroomSearchModal";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
const log = (...args: any[]) => console.log("🔍 [CarAds]", ...args);
const logWarn = (...args: any[]) => console.warn("⚠️ [CarAds]", ...args);
const logError = (...args: any[]) => console.error("❌ [CarAds]", ...args);
const logOk = (...args: any[]) => console.log("✅ [CarAds]", ...args);
const TEHRAN_TZ = "Asia/Tehran";
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
  // ✅ فوروارد
  hasFlash?: boolean;
  flashEndTime?: string | null;
};
type UserInfo = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
};
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
// ✅ تاریخ‌هایی که بدون Z می‌آیند را UTC در نظر می‌گیریم (برای اینکه 24 ساعت دقیق باشد)
function parseUtcDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const s = String(dateStr);
  // اگر timezone دارد همان را استفاده کن
  if (s.endsWith("Z") || s.includes("+")) return new Date(s);
  // اگر timezone ندارد UTC فرض کن
  return new Date(s + "Z");
}
function formatTimeTehran(dateStr: string): string {
  const d = parseUtcDate(dateStr);
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: TEHRAN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x: number) => x.toString().padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
// ✅ استخراج userId از JWT (بدون درخواست /api/users/me)
function getUserIdFromToken(token: string | null | undefined): number | null {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let payload = parts[1];
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const json = atob(payload);
    const data = JSON.parse(json);
    const idVal = data?.userId ?? data?.UserId ?? null;
    const n = Number(idVal);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
// ✅ مودال تایمر فوروارد + حذف 24 ساعته (بدون جمله‌ی اضافی)
function FlashInfoModal({
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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open || !ad) return null;
  const created = parseUtcDate(ad.createdAt).getTime();
  const deleteAt = created + 24 * 60 * 60 * 1000;
  const deleteLeft = deleteAt - now;
  const flashEnd = ad.flashEndTime
    ? parseUtcDate(ad.flashEndTime).getTime()
    : null;
  const flashLeft = flashEnd ? flashEnd - now : 0;
  const boxBg = isDark
    ? "linear-gradient(180deg,rgba(15,15,15,.98),rgba(8,8,8,.99))"
    : "hsl(var(--card))";
  const softGradient = isDark
    ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
    : "linear-gradient(90deg, rgba(34,197,94,.14), rgba(56,189,248,.12), rgba(217,70,239,.12))";
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.52)",
              backdropFilter: "blur(6px)",
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
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
              style={{ borderColor, background: boxBg }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="p-5" style={{ background: softGradient }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-foreground">
                      {ad.title}
                    </div>
                    <div className="text-xs opacity-80 text-foreground mt-1">
                      وضعیت فوروارد و زمان حذف
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 w-9 rounded-2xl border grid place-items-center"
                    style={{
                      borderColor: "rgba(0,0,0,0.15)",
                      background: "rgba(255,255,255,0.25)",
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Forward timer */}
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor,
                    background: isDark
                      ? "rgba(0,0,0,0.22)"
                      : "rgba(255,255,255,0.35)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-foreground">
                      پایان فوروارد
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ad.flashEndTime
                        ? formatTimeTehran(ad.flashEndTime)
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      شمارش معکوس
                    </div>
                    <div className="text-lg font-extrabold text-foreground">
                      {ad.flashEndTime ? msToClock(flashLeft) : "00:00"}
                    </div>
                  </div>
                  {!ad.flashEndTime || flashLeft <= 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      فوروارد فعال نیست یا به پایان رسیده است.
                    </div>
                  ) : null}
                </div>
                {/* Delete timer */}
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor,
                    background: isDark
                      ? "rgba(0,0,0,0.22)"
                      : "rgba(255,255,255,0.35)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-foreground">حذف آگهی</div>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fa-IR", {
                        timeZone: TEHRAN_TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(deleteAt))}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      زمان باقی‌مانده
                    </div>
                    <div className="text-lg font-extrabold text-foreground">
                      {msToClock(deleteLeft)}
                    </div>
                  </div>
                  {deleteLeft <= 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      این آگهی باید توسط سیستم حذف شود (چند دقیقه صبر کنید).
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
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
              backdropFilter: "blur(6px)",
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
function LoadingIndicator() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
function AdRow({
  ad,
  userInfo,
  isNew,
  flashCount,
  selected,
  onViewClick,
  onSelect,
  onDescClick,
  onFlashClick,
  onClockClick,
  softGradient,
  greenGradient,
  borderColor,
  cardBg,
  chipBg,
  isDark,
  userId,
  flashEnabled,
}: {
  ad: Ad;
  userInfo?: UserInfo;
  isNew: boolean;
  flashCount: number;
  selected: boolean;
  onViewClick: (ad: Ad) => void;
  onSelect: (ad: Ad) => void;
  onDescClick: (ad: Ad) => void;
  onFlashClick: (ad: Ad) => void;
  onClockClick: (ad: Ad) => void;
  softGradient: string;
  greenGradient: string;
  borderColor: string;
  cardBg: string;
  chipBg: string;
  isDark: boolean;
  userId: number | null;
  flashEnabled: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState<"green" | "blue">("green");
  const prevFlash = useRef(0);
  const [hoveredView, setHoveredView] = useState(false);
  const isOwner = userId !== null && userId === ad.userId;
  const now = Date.now();
  const flashActive =
    !!ad.hasFlash &&
    !!ad.flashEndTime &&
    parseUtcDate(ad.flashEndTime).getTime() > now;
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
            {/* ✅ فوروارد: فقط مالک + اگر پنل مدیریت فعال باشد */}
            {isOwner && (
              <>
                {flashActive ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClockClick(ad);
                    }}
                    title="جزئیات فوروارد"
                    className="h-8 w-8 rounded-xl border grid place-items-center select-none outline-none shrink-0"
                    style={{
                      borderColor: "rgba(56,189,248,0.60)",
                      background: isDark
                        ? "rgba(56,189,248,0.10)"
                        : "rgba(56,189,248,0.06)",
                      cursor: "pointer",
                      transition: "all 0.18s",
                    }}
                  >
                    <Clock3 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFlashClick(ad);
                    }}
                    disabled={!flashEnabled}
                    title={flashEnabled ? "فوروارد" : "فوروارد غیرفعال است"}
                    className="h-8 w-8 rounded-xl border grid place-items-center select-none outline-none shrink-0"
                    style={{
                      // ✅ آبی
                      borderColor: flashEnabled
                        ? "rgba(56,189,248,0.70)"
                        : "rgba(148,163,184,0.35)",
                      background: flashEnabled
                        ? isDark
                          ? "rgba(56,189,248,0.10)"
                          : "rgba(56,189,248,0.06)"
                        : isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.03)",
                      cursor: flashEnabled ? "pointer" : "not-allowed",
                      opacity: flashEnabled ? 1 : 0.55,
                      transition: "all 0.18s",
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
function EmptyRightPanel({
  description,
  borderColor,
  isDark,
}: {
  description: string;
  borderColor: string;
  isDark: boolean;
}) {
  const bg = isDark
    ? "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.20) 100%)"
    : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))";
  const paragraphs = description
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      return `${index === 0 ? "" : "."} ${line.trim()}`;
    });
  return (
    <div
      className="rounded-[26px] border h-full flex flex-col items-center justify-center p-6 gap-4"
      style={{ borderColor, background: bg }}
    >
      <div
        className="w-full max-h-[400px] overflow-y-auto px-4 py-3 rounded-xl"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          background: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)",
          scrollbarWidth: "thin",
          scrollbarColor: isDark
            ? "rgba(255,255,255,.2) rgba(0,0,0,.1)"
            : "rgba(0,0,0,.2) rgba(255,255,255,.1)",
        }}
      >
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <div
              key={index}
              className={`mb-3 last:mb-0 border-b border-muted-foreground/20 pb-2`}
            >
              <p
                className="text-base font-medium text-foreground text-right leading-relaxed whitespace-pre-wrap"
                dir="rtl"
              >
                {paragraph}
              </p>
            </div>
          ))
        ) : (
          <p
            className="text-base font-medium text-foreground text-center text-muted-foreground leading-relaxed"
            dir="rtl"
          >
            هنوز توضیحی ثبت نشده است.
          </p>
        )}
      </div>
    </div>
  );
}
export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [websiteDescription, setWebsiteDescription] = useState(
    "هنوز هیچ توضیحی ثبت نشده"
  );
  // ✅ به جای /api/users/me => از توکن استخراج می‌کنیم
  const [userId, setUserId] = useState<number | null>(null);
  // ✅ وضعیت تنظیمات فوروارد (فقط وقتی لاگین هستیم می‌گیریم تا 401 نخوریم)
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [flashDuration, setFlashDuration] = useState(15);
  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);
  useEffect(() => {
    setUserId(getUserIdFromToken(token));
  }, [token]);
  useEffect(() => {
    const loadDescription = async () => {
      try {
        const res = await api.get("/api/admin/website-description");
        setWebsiteDescription(res.data.description);
      } catch (e) {
        // default
      }
    };
    loadDescription();
  }, []);
  // ✅ گرفتن تنظیمات فوروارد فقط وقتی توکن داریم
  useEffect(() => {
    const loadFlashSettings = async () => {
      try {
        if (!token) return;
        const res = await api.get("/api/Ads/flash-settings");
        setFlashEnabled(!!res.data.isEnabled);
        setFlashDuration(Number(res.data.defaultDurationMinutes ?? 15));
      } catch (e) {
        // اگر خطا شد، پیشفرض: فعال
      }
    };
    loadFlashSettings();
  }, [token]);
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
  const [users, setUsers] = useState<{ [key: number]: UserInfo }>({});
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [flashCounts, setFlashCounts] = useState<{ [key: number]: number }>({});
  const [search, setSearch] = useState("");
  const [todayViews, setTodayViews] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [descAd, setDescAd] = useState<Ad | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  // ✅ مودال فوروارد
  const [flashModalAd, setFlashModalAd] = useState<Ad | null>(null);
  const [flashModalOpen, setFlashModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
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
  // ✅ مرتب‌سازی: فوروارد فعال اول لیست
  const sortAdsBoostFirst = useCallback((list: Ad[]) => {
    const now = Date.now();
    return [...list].sort((a, b) => {
      const aBoost =
        !!a.hasFlash &&
        !!a.flashEndTime &&
        parseUtcDate(a.flashEndTime).getTime() > now
          ? 1
          : 0;
      const bBoost =
        !!b.hasFlash &&
        !!b.flashEndTime &&
        parseUtcDate(b.flashEndTime).getTime() > now
          ? 1
          : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      return (
        parseUtcDate(b.createdAt).getTime() -
        parseUtcDate(a.createdAt).getTime()
      );
    });
  }, []);
  const loadAds = useCallback(async () => {
    log("Fetching /api/ads ...");
    setLoading(true);
    try {
      const res = await api.get("/api/ads");
      const list: Ad[] = res.data ?? [];
      const sorted = sortAdsBoostFirst(list);
      logOk("Ads loaded:", sorted.length, "items");
      setAds(sorted);
      [...new Set(sorted.map((a) => a.userId))].forEach(fetchUser);
    } finally {
      setLoading(false);
    }
  }, [sortAdsBoostFirst]);
  const loadTodayStats = useCallback(async () => {
    const r = await api.get("/api/ads/stats/today");
    setTodayViews(r.data?.todayViews ?? 0);
  }, []);
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([loadAds(), loadTodayStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAds, loadTodayStats]);
  useEffect(() => {
    loadAds().catch((e: any) => logError("Failed to load ads →", e?.message));
    loadTodayStats().catch((e: any) =>
      logWarn("Failed to load stats →", e?.message)
    );
  }, [loadAds, loadTodayStats]);
  // ✅ SignalR + FlashStatusUpdated
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const conn = await startSignalR();
        const onOnlineCount = (count: number) => setOnlineCount(count);
        conn.off("OnlineCount");
        conn.on("OnlineCount", onOnlineCount);
        await conn.invoke("GetOnlineCount");
        const onAdView = (adId: number) => {
          setFlashCounts((prev) => ({
            ...prev,
            [adId]: (prev[adId] ?? 0) + 1,
          }));
        };
        conn.off("AdViewed");
        conn.on("AdViewed", onAdView);
        const onFlashUpdated = (payload: any) => {
          const adId = payload?.AdId ?? payload?.adId;
          const endTime =
            payload?.EndTime ??
            payload?.endTime ??
            payload?.Endtime ??
            payload?.endtime ??
            null;
          const has = payload?.HasFlash ?? payload?.hasFlash;
          if (!adId) return;
          setAds((prev) => {
            const next = prev.map((x) =>
              x.id === adId
                ? { ...x, hasFlash: !!has, flashEndTime: endTime ?? null }
                : x
            );
            return sortAdsBoostFirst(next);
          });
        };
        conn.off("FlashStatusUpdated");
        conn.on("FlashStatusUpdated", onFlashUpdated);
        unsub = () => {
          conn.off("OnlineCount", onOnlineCount);
          conn.off("AdViewed", onAdView);
          conn.off("FlashStatusUpdated", onFlashUpdated);
        };
      } catch (err: any) {
        logError("SignalR failed →", err?.message);
      }
    })();
    return () => {
      unsub?.();
    };
  }, [sortAdsBoostFirst]);
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
  // ✅ فوروارد: case-safe + بدون خطای الکی
  const handleFlashClick = useCallback(
    async (ad: Ad) => {
      if (!flashEnabled) {
        toast.error("فوروارد توسط مدیریت غیرفعال است");
        return;
      }
      try {
        const res = await api.post(`/api/ads/${ad.id}/flash`);
        const endTime =
          res.data?.EndTime ??
          res.data?.endTime ??
          res.data?.Endtime ??
          res.data?.endtime ??
          null;
        const computedEndTime = new Date(
          Date.now() + flashDuration * 60 * 1000
        ).toISOString();
        const finalEndTime = endTime || computedEndTime;
        setAds((prev) => {
          const next = prev.map((x) =>
            x.id === ad.id
              ? { ...x, hasFlash: true, flashEndTime: finalEndTime }
              : x
          );
          return sortAdsBoostFirst(next);
        });
        toast.success(`فوروارد فعال شد (${flashDuration} دقیقه)`);
      } catch (e: any) {
        toast.error("خطا در فعال‌سازی فوروارد");
        console.error("Flash error:", e);
      }
    },
    [flashEnabled, flashDuration, sortAdsBoostFirst]
  );
  const combinedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredAds = ads.filter((a) => {
      const txt = [
        a.title,
        a.color,
        String(a.year),
        typeLabel(a.type),
        priceToText(a.price),
      ]
        .join(" ")
        .toLowerCase();
      return txt.includes(q);
    });
    const sorted = sortAdsBoostFirst(filteredAds);
    return sorted.map((a) => ({ kind: "ad", data: a }));
  }, [ads, search, sortAdsBoostFirst]);
  useEffect(() => {
    if (selectedAd) {
      const updated = ads.find((a) => a.id === selectedAd.id);
      if (updated) setSelectedAd(updated);
    }
  }, [ads, selectedAd]);
  const [showroomModalOpen, setShowroomModalOpen] = useState(false);
  if (!mounted) return null;
  return (
    <>
      <style jsx global>{`
        @keyframes rowFlashGreen {
          from {
            box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.45),
              0 0 18px rgba(34, 197, 94, 0.18);
          }
          to {
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.92),
              0 0 38px rgba(34, 197, 94, 0.44);
          }
        }
        @keyframes rowFlashBlue {
          from {
            box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.45),
              0 0 18px rgba(56, 189, 248, 0.18);
          }
          to {
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.92),
              0 0 38px rgba(56, 189, 248, 0.44);
          }
        }
        @keyframes shimmerSlide {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.5;
          }
        }
        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }
      `}</style>

      <DescModal
        ad={descAd}
        open={descOpen}
        onClose={() => setDescOpen(false)}
        borderColor={borderColor}
        isDark={isDark}
      />
      <FlashInfoModal
        ad={flashModalAd}
        open={flashModalOpen}
        onClose={() => setFlashModalOpen(false)}
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
          {/* جستجو + دکمه‌ها */}
          <div className="flex justify-between items-center shrink-0 gap-2">
            <div className="max-w-[1040px] mx-auto relative flex-1 flex items-center justify-center">
              <div className="relative w-full max-w-[600px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در آگهی‌ها..."
                  className="h-10 rounded-2xl border text-sm outline-none w-full pr-10 pl-10"
                  style={{
                    borderColor,
                    background: isDark
                      ? "hsl(0 0% 10%)"
                      : "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <button
                  type="button"
                  onClick={refreshAll}
                  title="رفرش"
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
                  style={{
                    animation: refreshing
                      ? "spin 0.9s linear infinite"
                      : "none",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute left-10 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ cursor: "pointer" }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowroomModalOpen(true)}
                className="hidden sm:inline-flex px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
                style={{
                  boxShadow: "0 4px 20px rgba(56,189,248,0.35)",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
              >
                نمایشگاهها
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescAd({
                    id: "desc",
                    description: websiteDescription,
                  } as any);
                  setDescOpen(true);
                }}
                className="sm:hidden px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  borderColor,
                  background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                  color: "rgb(56,189,248)",
                  animation: "rowFlashBlue 1.4s ease-in-out infinite alternate",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                توضیحات
              </button>
            </div>
          </div>

          {/* موبایل نمایشگاه‌ها */}
          <div className="mt-2 sm:hidden w-full flex justify-center">
            <button
              onClick={() => setShowroomModalOpen(true)}
              className="w-full max-w-[300px] px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
              style={{
                boxShadow: "0 4px 20px rgba(56,189,248,0.35)",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
            >
              نمایشگاهها
            </button>
          </div>

          <div
            className="mt-2.5 h-px opacity-25 shrink-0"
            style={{ background: "hsl(var(--border))" }}
          />

          {/* ردیف‌ها: ستون‌وار موبایل + اسکرول افقی راست به چپ */}
          <div
            className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col md:flex-row gap-3"
            style={{ direction: "ltr" }}
          >
            <div
              className="flex-1 min-w-0 overflow-y-auto overflow-x-auto pb-1"
              ref={(el) => {
                if (el) el.scrollLeft = el.scrollWidth;
              }}
            >
              <div className="flex flex-col gap-3 w-max min-w-full md:w-auto rtl">
                {loading ? (
                  <LoadingIndicator />
                ) : combinedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-40 py-20">
                    <Car className="h-8 w-8" />
                    <div className="text-sm font-semibold">موردی یافت نشد</div>
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {combinedItems.map((item) => {
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
                          onFlashClick={(a) => handleFlashClick(a)}
                          onClockClick={(a) => {
                            setFlashModalAd(a);
                            setFlashModalOpen(true);
                          }}
                          softGradient={softGradient}
                          greenGradient={greenGradient}
                          borderColor={borderColor}
                          cardBg={cardBg}
                          chipBg={chipBg}
                          isDark={isDark}
                          userId={userId}
                          flashEnabled={flashEnabled}
                        />
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* توضیحات دسکتاپ */}
            <div className="flex-1 shrink-0 hidden md:block">
              <EmptyRightPanel
                description={websiteDescription}
                borderColor={borderColor}
                isDark={isDark}
              />
            </div>
          </div>

          {/* فوتر آمار */}
          <div
            className="mt-2 pt-2 flex items-center justify-end gap-2 flex-wrap shrink-0"
            style={{ borderTop: `1px solid hsl(var(--border)/0.25)` }}
          >
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
      </main>

      <ShowroomSearchModal
        isOpen={showroomModalOpen}
        onClose={() => setShowroomModalOpen(false)}
        borderColor={borderColor}
        isDark={isDark}
      />
    </>
  );
}
