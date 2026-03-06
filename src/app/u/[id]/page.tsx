"use client";

import Header from "@/components/Header";
import { api } from "@/lib/api";
import { joinProfile, leaveProfile, startSignalR } from "@/lib/signalr";
import { useAuthStore } from "@/store/auth.store";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Search,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Images,
} from "lucide-react";

dayjs.extend(jalaliday);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type PublicUser = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: "User" | "Admin" | "SuperAdmin";
  createdAt: string;
};

type BioItem = {
  id: number;
  userId: number;
  isAdvanced: boolean;
  title: string;
  description: string;
  contactInfo?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Ad = {
  id: number;
  userId: number;
  type: number;
  title: string;
  year: number;
  color: string;
  mileageKm: number;
  price: number;
  gearbox: number;
  createdAt: string;
  viewCount: number;
  insuranceMonths?: number | null;
  chassisNumber?: string;
  contactPhone?: string;
  description?: string;
  images?: string[]; // ✅ تصاویر
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

function imgUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

function formatBioLine(item: BioItem) {
  const title = (item.title ?? "").trim();
  const desc = (item.description ?? "").trim();
  const contact = (item.contactInfo ?? "").trim();
  if (item.isAdvanced) {
    const left = title ? `${title}: ` : "";
    const right = contact ? ` - ${contact}` : "";
    return `${left}${desc}${right}`.trim();
  }
  return desc;
}

function priceToText(millionVal: number): string {
  if (!Number.isFinite(millionVal) || millionVal <= 0) return "—";
  const billion = Math.floor(millionVal / 1000);
  const rem = millionVal - billion * 1000;
  const million = Math.floor(rem);
  const thousand = Math.round((rem - million) * 1000);
  const toFa = (n: number) => n.toLocaleString("fa-IR");
  const parts: string[] = [];
  if (billion > 0) parts.push(`${toFa(billion)} میلیارد`);
  if (million > 0) parts.push(`${toFa(million)} میلیون`);
  if (thousand > 0) parts.push(`${toFa(thousand)} هزار`);
  if (parts.length === 0) return "—";
  return parts.join(" و ") + " تومان";
}

const TYPE_LABELS: Record<number, string> = {
  1: "فروش کارکرده",
  2: "فروش همکاری",
  3: "درخواست خرید",
  4: "فروش صفر",
};
const GEARBOX_LABELS: Record<number, string> = {
  0: "—",
  1: "اتومات",
  2: "دنده‌ای",
};
function typeLabel(t: number | string) {
  return TYPE_LABELS[Number(t)] ?? "نامشخص";
}
function gearboxLabel(g: number | string) {
  return GEARBOX_LABELS[Number(g)] ?? "—";
}

// ─────────────────────────────────────────────
// Image Slider Modal
// ─────────────────────────────────────────────
function ImageSliderModal({
  images,
  initialIndex = 0,
  open,
  onClose,
  isDark,
  softGradient,
  borderColor,
}: {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  softGradient: string;
  borderColor: string;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const [dir, setDir] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setCurrent(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, current, images.length]);

  function goPrev() {
    if (images.length <= 1) return;
    setDir(-1);
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }

  function goNext() {
    if (images.length <= 1) return;
    setDir(1);
    setCurrent((c) => (c + 1) % images.length);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      dx > 0 ? goPrev() : goNext();
    }
    touchStartX.current = null;
  }

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? 120 : -120,
      opacity: 0,
      scale: 0.94,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({
      x: d > 0 ? -120 : 120,
      opacity: 0,
      scale: 0.94,
    }),
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(16px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg flex flex-col items-center gap-4"
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* تصویر اصلی */}
              <div
                className="relative w-full rounded-3xl overflow-hidden border"
                style={{
                  borderColor,
                  aspectRatio: "4/3",
                  background: isDark ? "hsl(0 0% 8%)" : "hsl(var(--card))",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <AnimatePresence custom={dir} mode="popLayout">
                  <motion.img
                    key={current}
                    src={imgUrl(images[current])}
                    alt={`تصویر ${current + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    custom={dir}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: "spring",
                      stiffness: 340,
                      damping: 32,
                      mass: 0.85,
                    }}
                    draggable={false}
                  />
                </AnimatePresence>

                {/* دکمه بستن */}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-3 left-3 z-10 h-9 w-9 rounded-2xl border grid place-items-center transition hover:scale-110"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    borderColor: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <X className="h-4 w-4 text-white" />
                </button>

                {/* شمارنده */}
                {images.length > 1 && (
                  <div
                    className="absolute top-3 right-3 z-10 px-3 py-1 rounded-xl text-xs font-bold"
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      backdropFilter: "blur(8px)",
                      color: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {current + 1} / {images.length}
                  </div>
                )}

                {/* دکمه‌های چپ/راست */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-2xl border grid place-items-center transition-all hover:scale-110 hover:-translate-y-1/2"
                      style={{
                        background: "rgba(0,0,0,0.60)",
                        borderColor: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <ChevronRight className="h-5 w-5 text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-2xl border grid place-items-center transition-all hover:scale-110 hover:-translate-y-1/2"
                      style={{
                        background: "rgba(0,0,0,0.60)",
                        borderColor: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDir(i > current ? 1 : -1);
                        setCurrent(i);
                      }}
                      className="rounded-xl overflow-hidden border-2 transition-all"
                      style={{
                        width: 52,
                        height: 40,
                        borderColor:
                          i === current
                            ? "rgba(56,189,248,0.9)"
                            : "rgba(255,255,255,0.12)",
                        opacity: i === current ? 1 : 0.55,
                        transform: i === current ? "scale(1.08)" : "scale(1)",
                        boxShadow:
                          i === current
                            ? "0 0 0 2px rgba(56,189,248,0.3)"
                            : "none",
                      }}
                    >
                      <img
                        src={imgUrl(url)}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Dots */}
              {images.length > 1 && (
                <div className="flex gap-1.5 justify-center">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDir(i > current ? 1 : -1);
                        setCurrent(i);
                      }}
                      className="rounded-full transition-all"
                      style={{
                        width: i === current ? 20 : 6,
                        height: 6,
                        background:
                          i === current
                            ? "rgba(56,189,248,0.9)"
                            : "rgba(255,255,255,0.3)",
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// Details Modal
// ─────────────────────────────────────────────
function DetailsModal({
  ad,
  open,
  onClose,
  softGradient,
  borderColor,
  isDark,
}: {
  ad: Ad | null;
  open: boolean;
  onClose: () => void;
  softGradient: string;
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

  const rows: { label: string; value: string }[] = [
    { label: "عنوان", value: ad.title },
    { label: "نوع آگهی", value: typeLabel(ad.type) },
    { label: "سال تولید", value: String(ad.year) },
    { label: "رنگ", value: ad.color },
    {
      label: "کارکرد",
      value: `${Number(ad.mileageKm).toLocaleString("fa-IR")} کیلومتر`,
    },
    { label: "گیربکس", value: gearboxLabel(ad.gearbox) },
    { label: "قیمت", value: priceToText(ad.price) },
    ...(ad.insuranceMonths != null
      ? [{ label: "بیمه", value: `${ad.insuranceMonths} ماه` }]
      : []),
    ...(ad.chassisNumber?.trim()
      ? [{ label: "شماره شاسی", value: ad.chassisNumber! }]
      : []),
    ...(ad.contactPhone?.trim()
      ? [{ label: "شماره تماس", value: ad.contactPhone! }]
      : []),
    ...(ad.description?.trim()
      ? [{ label: "توضیحات", value: ad.description! }]
      : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.56)",
              backdropFilter: "blur(4px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div
              className="w-full max-w-md rounded-3xl border p-5 shadow-2xl"
              style={{
                borderColor,
                background: isDark
                  ? "linear-gradient(180deg, rgba(15,15,15,0.98) 0%, rgba(8,8,8,0.99) 100%)"
                  : "hsl(var(--card))",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <h2 className="text-base font-extrabold text-foreground">
                  جزئیات آگهی
                </h2>
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

              <div className="space-y-2" dir="rtl">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-start gap-2 rounded-2xl border px-3 py-2.5"
                    style={{
                      borderColor,
                      background: isDark
                        ? "hsl(0 0% 10%)"
                        : "hsl(var(--background))",
                    }}
                  >
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 mt-0.5"
                      style={{ background: softGradient }}
                    >
                      {r.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs text-muted-foreground">
                  ثبت:{" "}
                  {dayjs(ad.createdAt)
                    .calendar("jalali")
                    .locale("fa")
                    .format("YYYY/MM/DD • HH:mm")}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// ذره‌بین SVG
// ─────────────────────────────────────────────
function MagnifierIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// AdCard
// ─────────────────────────────────────────────
function AdCard({
  ad,
  highlighted,
  onDetails,
  onOpenSlider,
  softGradient,
  borderColor,
  chipBg,
  isDark,
}: {
  ad: Ad;
  highlighted: boolean;
  onDetails: (ad: Ad) => void;
  onOpenSlider: (ad: Ad, index: number) => void;
  softGradient: string;
  borderColor: string;
  chipBg: string;
  isDark: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [hoveredMag, setHoveredMag] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasImages = ad.images && ad.images.length > 0;
  const imageCount = ad.images?.length ?? 0;

  useEffect(() => {
    if (!highlighted) return;
    setTimeout(
      () =>
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      200
    );
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 2800);
  }, [highlighted]);

  function onMagEnter() {
    setHoveredMag(true);
    tipTimer.current = setTimeout(() => setShowTooltip(true), 280);
  }
  function onMagLeave() {
    setHoveredMag(false);
    setShowTooltip(false);
    if (tipTimer.current) clearTimeout(tipTimer.current);
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      <div
        className="relative rounded-2xl border flex flex-col overflow-hidden"
        style={{
          borderColor: isFlashing ? "rgba(34,197,94,0.9)" : borderColor,
          background: isDark
            ? "linear-gradient(180deg, rgba(255,255,255,.033) 0%, rgba(0,0,0,.16) 100%)"
            : "hsl(var(--background))",
          boxShadow: isFlashing
            ? "0 0 0 2px rgba(34,197,94,0.5), 0 0 32px rgba(34,197,94,0.28)"
            : "none",
          animation: isFlashing
            ? "profileCardFlash 0.38s ease-in-out infinite alternate"
            : "none",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        {/* ─── تصویر بالا ─── */}
        {hasImages && (
          <div
            className="relative w-full overflow-hidden cursor-pointer group"
            style={{ aspectRatio: "16/9" }}
            onClick={() => onOpenSlider(ad, 0)}
          >
            <img
              src={imgUrl(ad.images![0])}
              alt={ad.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              draggable={false}
            />

            {/* gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 60%)",
              }}
            />

            {/* بیشتر از ۱ تصویر: نشانگر */}
            {imageCount > 1 && (
              <motion.div
                className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Images className="h-3 w-3 text-white opacity-80" />
                <span className="text-[11px] font-bold text-white">
                  {imageCount} تصویر
                </span>
              </motion.div>
            )}

            {/* hover overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <div
                className="px-4 py-2 rounded-2xl text-xs font-bold text-white border"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  borderColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {imageCount > 1 ? "مشاهده تصاویر" : "مشاهده تصویر"}
              </div>
            </div>
          </div>
        )}

        {/* ─── محتوا ─── */}
        <div className="p-4 flex flex-col items-center text-center">
          {/* ذره‌بین */}
          <div className="absolute top-3 left-3">
            <button
              type="button"
              onClick={() => onDetails(ad)}
              onMouseEnter={onMagEnter}
              onMouseLeave={onMagLeave}
              className="h-8 w-8 rounded-xl border grid place-items-center"
              style={{
                borderColor: hoveredMag ? "rgba(56,189,248,0.7)" : borderColor,
                background: hoveredMag
                  ? isDark
                    ? "rgba(56,189,248,0.15)"
                    : "rgba(56,189,248,0.12)"
                  : isDark
                  ? "hsl(0 0% 12%)"
                  : "hsl(var(--background))",
                cursor: "pointer",
                color: hoveredMag ? "rgb(56,189,248)" : "currentColor",
                opacity: hoveredMag ? 1 : 0.65,
                transform: hoveredMag ? "translateY(-1px) scale(1.1)" : "none",
                boxShadow: hoveredMag
                  ? "0 4px 14px rgba(56,189,248,0.25)"
                  : "none",
                transition: "all 0.16s",
                // اگر تصویر داشت، دکمه بالاتر بره
                ...(hasImages ? { top: "calc(100% * 9/16 + 12px)" } : {}),
              }}
            >
              <MagnifierIcon size={14} />
            </button>

            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  className="absolute top-9 left-0 z-20 pointer-events-none"
                  initial={{ opacity: 0, y: -4, scale: 0.88 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.88 }}
                  transition={{ duration: 0.14 }}
                >
                  <div
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap border"
                    style={{
                      borderColor: "rgba(56,189,248,0.45)",
                      background: isDark
                        ? "rgba(12,12,12,0.95)"
                        : "hsl(var(--card))",
                      color: "rgb(56,189,248)",
                      boxShadow: "0 4px 12px rgba(56,189,248,0.15)",
                    }}
                  >
                    جزئیات
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* عنوان */}
          <div
            className="font-bold text-foreground text-sm leading-tight px-6"
            style={{ marginTop: hasImages ? 0 : "4px" }}
          >
            {ad.title}
          </div>

          {/* نوع آگهی */}
          <div
            className="mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
            style={{ background: softGradient }}
          >
            {typeLabel(ad.type)}
          </div>

          {/* چیپ‌ها */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{ background: chipBg }}
            >
              {ad.year}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{ background: chipBg }}
            >
              {ad.color}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{ background: chipBg }}
            >
              {Number(ad.mileageKm).toLocaleString("fa-IR")} km
            </span>
            {Number(ad.gearbox) > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{ background: chipBg }}
              >
                {gearboxLabel(ad.gearbox)}
              </span>
            )}
          </div>

          {/* قیمت */}
          <div
            className="mt-4 text-sm font-extrabold px-4 py-2 rounded-xl border"
            style={{ borderColor, background: softGradient }}
          >
            {priceToText(ad.price)}
          </div>

          {/* پایین: تاریخ + بازدید */}
          <div
            className="mt-3 w-full flex items-center justify-between"
            dir="rtl"
          >
            <div className="text-[10px] text-muted-foreground">
              {dayjs(ad.createdAt)
                .calendar("jalali")
                .locale("fa")
                .format("YYYY/MM/DD • HH:mm")}
            </div>
            <div
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: chipBg }}
            >
              <Eye className="h-3 w-3 opacity-70" />
              <span>{(ad.viewCount ?? 0).toLocaleString("fa-IR")}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function PublicUserPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = (params as any)?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const profileId = Number(idStr);
  const highlightAdId = Number(searchParams.get("ad") ?? "0") || null;

  const { userId: meId, token } = useAuthStore();
  const isOwner = meId === profileId;

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const softGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg, rgba(34,197,94,.56), rgba(56,189,248,.48), rgba(217,70,239,.46))"
        : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))",
    [isDark]
  );

  const borderColor = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, hsl(var(--border)) 65%, rgba(255,255,255,.18) 35%)"
        : "hsl(var(--border))",
    [isDark]
  );

  const chipBg = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, rgba(255,255,255,.085) 70%, rgba(0,0,0,.35) 30%)"
        : "color-mix(in srgb, hsl(var(--foreground)) 7%, hsl(var(--background)) 93%)",
    [isDark]
  );

  const sectionBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.20) 100%)"
        : "linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, transparent), color-mix(in srgb, var(--card) 86%, transparent))",
    [isDark]
  );

  // ── State ──
  const [user, setUser] = useState<PublicUser | null>(null);
  const [bio, setBio] = useState<BioItem[]>([]);
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // details modal
  const [detailsAd, setDetailsAd] = useState<Ad | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // slider modal
  const [sliderAd, setSliderAd] = useState<Ad | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [sliderOpen, setSliderOpen] = useState(false);

  function openSlider(ad: Ad, index: number) {
    setSliderAd(ad);
    setSliderIndex(index);
    setSliderOpen(true);
  }

  // ── Load ──
  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [uRes, bioRes, adsRes] = await Promise.all([
        api.get(`/api/users/${profileId}`),
        api.get(`/api/bio/user/${profileId}`),
        api.get(`/api/ads`),
      ]);

      setUser(uRes.data);

      const bioList = (bioRes.data ?? []) as BioItem[];
      bioList.sort((a, b) => {
        if (!!a.isAdvanced !== !!b.isAdvanced) return a.isAdvanced ? -1 : 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
      setBio(bioList);

      const onlyThis = (adsRes.data as Ad[]).filter(
        (x) => x.userId === profileId
      );

      if (highlightAdId) {
        const idx = onlyThis.findIndex((a) => a.id === highlightAdId);
        if (idx > 0) {
          const [item] = onlyThis.splice(idx, 1);
          onlyThis.unshift(item);
        }
      } else {
        onlyThis.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      }

      setAllAds(onlyThis);
    } catch (e: any) {
      setErr(e?.response?.data ?? "خطا در دریافت اطلاعات کاربر");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(profileId)) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // ── Filter ──
  const filteredAds = useMemo(() => {
    if (!search.trim()) return allAds;
    const q = search.trim().toLowerCase();
    return allAds.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.color.toLowerCase().includes(q) ||
        String(a.year).includes(q) ||
        priceToText(a.price).includes(q)
    );
  }, [allAds, search]);

  // ── SignalR ──
  useEffect(() => {
    if (!Number.isFinite(profileId)) return;
    let unsub: (() => void) | null = null;
    let alive = true;

    (async () => {
      try {
        const conn = await startSignalR();
        if (!alive) return;
        await joinProfile(profileId);

        const onBioAdded = (p: any) => {
          if (p.userId !== profileId) return;
          setBio((prev) => {
            const next = [p as BioItem, ...prev];
            next.sort((a, b) => {
              if (!!a.isAdvanced !== !!b.isAdvanced)
                return a.isAdvanced ? -1 : 1;
              return a.createdAt < b.createdAt ? 1 : -1;
            });
            return next;
          });
        };
        const onBioUpdated = (p: any) => {
          if (p.userId !== profileId) return;
          setBio((prev) => {
            const next = prev.map((x) => (x.id === p.id ? { ...x, ...p } : x));
            next.sort((a, b) => {
              if (!!a.isAdvanced !== !!b.isAdvanced)
                return a.isAdvanced ? -1 : 1;
              return a.createdAt < b.createdAt ? 1 : -1;
            });
            return next;
          });
        };
        const onBioDeleted = (p: any) => {
          if (p.userId !== profileId) return;
          setBio((prev) => prev.filter((x) => x.id !== p.id));
        };
        const onAdCreated = (p: any) => {
          if (p.userId !== profileId) return;
          setAllAds((prev) => {
            if (prev.some((x) => x.id === p.id)) return prev;
            return [p, ...prev];
          });
        };
        const onAdUpdated = (p: any) => {
          if (p.userId !== profileId) return;
          setAllAds((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, ...p } : x))
          );
        };
        const onAdDeleted = (p: any) => {
          if (p.userId !== profileId) return;
          setAllAds((prev) => prev.filter((x) => x.id !== p.adId));
        };
        const onAdView = (p: { adId: number; viewCount: number }) => {
          setAllAds((prev) =>
            prev.map((x) =>
              x.id === p.adId ? { ...x, viewCount: p.viewCount } : x
            )
          );
        };

        conn.on("BioItemAdded", onBioAdded);
        conn.on("BioItemUpdated", onBioUpdated);
        conn.on("BioItemDeleted", onBioDeleted);
        conn.on("CarAdCreated", onAdCreated);
        conn.on("CarAdUpdated", onAdUpdated);
        conn.on("CarAdDeleted", onAdDeleted);
        conn.on("AdViewUpdated", onAdView);

        unsub = () => {
          conn.off("BioItemAdded", onBioAdded);
          conn.off("BioItemUpdated", onBioUpdated);
          conn.off("BioItemDeleted", onBioDeleted);
          conn.off("CarAdCreated", onAdCreated);
          conn.off("CarAdUpdated", onAdUpdated);
          conn.off("CarAdDeleted", onAdDeleted);
          conn.off("AdViewUpdated", onAdView);
        };
      } catch {}
    })();

    return () => {
      alive = false;
      unsub?.();
      leaveProfile(profileId).catch(() => {});
    };
  }, [profileId, token]);

  if (!Number.isFinite(profileId)) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border p-4 bg-card">آیدی نامعتبر</div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes profileCardFlash {
          from { box-shadow: 0 0 0 2px rgba(34,197,94,0.5), 0 0 20px rgba(34,197,94,0.22); }
          to   { box-shadow: 0 0 0 3px rgba(34,197,94,0.95), 0 0 42px rgba(34,197,94,0.52); }
        }
        @keyframes titleGlow {
          0%, 100% { opacity: 1; text-shadow: none; }
          50%       { opacity: 0.62; text-shadow: 0 0 18px rgba(56,189,248,0.35); }
        }
      `}</style>

      {/* ─── Slider Modal ─── */}
      <ImageSliderModal
        images={sliderAd?.images ?? []}
        initialIndex={sliderIndex}
        open={sliderOpen}
        onClose={() => setSliderOpen(false)}
        isDark={isDark}
        softGradient={softGradient}
        borderColor={borderColor}
      />

      <DetailsModal
        ad={detailsAd}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        softGradient={softGradient}
        borderColor={borderColor}
        isDark={isDark}
      />

      <Header />

      <main
        className="mx-auto max-w-6xl px-4 py-4"
        style={{
          height: "calc(100vh - 84px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {err && (
          <div className="text-sm rounded-xl p-3 border border-destructive/30 text-destructive bg-card shrink-0">
            {String(err)}
          </div>
        )}

        {/* Top Card */}
        <section
          className="rounded-3xl border p-4 shrink-0"
          style={{ borderColor, background: sectionBg }}
        >
          <div className="flex flex-col items-center gap-3">
            <h1
              className="text-xl font-extrabold text-foreground text-center"
              style={{ animation: "titleGlow 3s ease-in-out infinite" }}
            >
              نمایشگاه {loading ? "..." : user?.username ?? ""}
            </h1>

            <div className="w-full max-w-[440px] relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در آگهی‌ها..."
                className="w-full h-9 rounded-2xl border pr-10 pl-9 text-sm outline-none text-center"
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Bio + Ads */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* BIO */}
          <div
            className="lg:col-span-1 rounded-3xl border p-4 flex flex-col overflow-hidden"
            style={{ borderColor, background: sectionBg }}
          >
            <div className="flex items-center justify-center shrink-0">
              <h2 className="text-base font-semibold text-foreground">
                بیوگرافی
              </h2>
            </div>

            <div
              className="mt-3 space-y-3 overflow-y-auto flex-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {bio.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center">
                  هنوز بیوگرافی ثبت نشده.
                </div>
              ) : (
                bio.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border p-3"
                    style={{
                      borderColor,
                      background: isDark
                        ? "hsl(0 0% 10%)"
                        : "hsl(var(--background))",
                    }}
                  >
                    <div
                      className="inline-block rounded-2xl border px-3 py-2 text-sm font-semibold text-foreground"
                      style={{ borderColor, background: softGradient }}
                    >
                      {formatBioLine(b)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {dayjs(b.createdAt)
                        .calendar("jalali")
                        .locale("fa")
                        .format("YYYY/MM/DD")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ADS */}
          <div
            className="lg:col-span-2 rounded-3xl border p-4 flex flex-col overflow-hidden"
            style={{ borderColor, background: sectionBg }}
          >
            <div className="flex items-center justify-center shrink-0 mb-3">
              <div
                className="px-4 py-1.5 rounded-2xl border text-[12px] font-semibold"
                style={{ borderColor, background: softGradient }}
              >
                {isOwner ? "آگهی‌های من" : "آگهی‌های این نمایشگاه"}
              </div>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto pr-0.5"
              style={{ scrollbarWidth: "thin" }}
            >
              {filteredAds.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {search ? "آگهی‌ای یافت نشد" : "هنوز آگهی‌ای ثبت نشده."}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                    {filteredAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        highlighted={ad.id === highlightAdId}
                        onDetails={(a) => {
                          setDetailsAd(a);
                          setDetailsOpen(true);
                        }}
                        onOpenSlider={openSlider}
                        softGradient={softGradient}
                        borderColor={borderColor}
                        chipBg={chipBg}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
