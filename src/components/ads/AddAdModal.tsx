"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { X, ImagePlus, Trash2, Loader2 } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { errorToText } from "@/lib/errorText";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth.store";

dayjs.extend(jalaliday);

export type CarAdType = "UsedSale" | "CoopSale" | "BuyRequest" | "ZeroSale";
export type GearboxType = "Automatic" | "Manual";

export type AddAdPayload = {
  type: CarAdType;
  title: string;
  year: number | "";
  color: string;
  mileageKm: number | "";
  insuranceMonths: number | "";
  gearbox: GearboxType | "";
  chassisNumber: string;
  contactPhone: string;
  price: number | "";
  description: string;
  imageUrls?: string[];
};

// ✅ فقط ۳ تب
const tabs: { key: CarAdType; label: string }[] = [
  { key: "UsedSale", label: "فروش کارکرده" },
  { key: "BuyRequest", label: "درخواست خرید" },
  { key: "ZeroSale", label: "فروش صفر" },
];

function todayJalali() {
  return dayjs().calendar("jalali").locale("fa").format("YYYY/MM/DD");
}
function hintYear() {
  return "مثلاً 1401 یا 2018";
}
function hintPrice() {
  return "مثلاً 80 یا 2500 یا 120.5";
}
function toFaNum(input: string) {
  return input;
}

function formatFromMillionInput(v: number): string {
  if (!Number.isFinite(v)) return "";
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  const billion = Math.floor(abs / 1000);
  const remAfterBillion = abs - billion * 1000;
  const million = Math.floor(remAfterBillion);
  const frac = remAfterBillion - million;
  let thousand = Math.round(frac * 1000);
  let millionAdj = million;
  let billionAdj = billion;
  if (thousand >= 1000) {
    thousand -= 1000;
    millionAdj += 1;
  }
  if (millionAdj >= 1000) {
    const extraB = Math.floor(millionAdj / 1000);
    billionAdj += extraB;
    millionAdj = millionAdj - extraB * 1000;
  }
  const parts: string[] = [];
  if (billionAdj > 0)
    parts.push(`${billionAdj.toLocaleString("fa-IR")} میلیارد`);
  if (millionAdj > 0)
    parts.push(`${millionAdj.toLocaleString("fa-IR")} میلیون`);
  if (thousand > 0)
    parts.push(`${thousand.toLocaleString("fa-IR")} هزار تومان`);
  if (parts.length === 0) return "۰ تومان";
  const last = parts[parts.length - 1];
  const hasToman = last.includes("تومان");
  const joined = parts.join(" و ");
  return sign + (hasToman ? joined : `${joined} تومان`);
}

type ImageItem = {
  id: string;
  preview: string;
  url: string | null;
  uploading: boolean;
  error: boolean;
};

type AddAdFormState = Omit<AddAdPayload, "price" | "imageUrls"> & {
  priceText: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function AddAdModal({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
  mode = "create",
  token,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: AddAdPayload) => Promise<void> | void;
  initialValue?: AddAdPayload;
  mode?: "create" | "edit";
  token?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const empty: AddAdFormState = {
    type: "UsedSale",
    title: "",
    year: "",
    color: "",
    mileageKm: "",
    insuranceMonths: "",
    gearbox: "",
    chassisNumber: "",
    contactPhone: "",
    description: "",
    priceText: "",
  };

  const [form, setForm] = useState<AddAdFormState>(() => {
    if (!initialValue) return empty;
    return {
      ...initialValue,
      priceText:
        initialValue.price === "" ? "" : String(initialValue.price ?? ""),
    };
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const today = useMemo(() => todayJalali(), []);

  // ✅ هر بار که modal باز می‌شود یا initialValue عوض می‌شود
  useEffect(() => {
    if (!open) return;

    if (!initialValue) {
      setForm(empty);
      setImages([]);
      return;
    }

    setForm({
      ...initialValue,
      priceText: initialValue.price === "" ? "" : String(initialValue.price),
    });

    // ✅ بارگذاری تصاویر قبلی
    if (initialValue.imageUrls && initialValue.imageUrls.length > 0) {
      const existing: ImageItem[] = initialValue.imageUrls.map((url) => ({
        id: crypto.randomUUID(),
        preview: url.startsWith("http") ? url : `${API_BASE}${url}`,
        url,
        uploading: false,
        error: false,
      }));
      setImages(existing);
    } else {
      setImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue]);

  function setF<K extends keyof AddAdFormState>(
    key: K,
    val: AddAdFormState[K]
  ) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function numberOrEmpty(v: string): number | "" {
    if (v.trim() === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? n : "";
  }

  function setPriceText(v: string) {
    const s = v.replace(/,/g, "").trim();
    if (s === "") return setF("priceText", "");
    if (!/^\d*\.?\d*$/.test(s)) return;
    setF("priceText", s);
  }

  function parsePrice(): number | "" {
    const t = (form.priceText ?? "").trim();
    if (!t) return "";
    if (t.endsWith(".")) return "";
    const n = Number(t);
    return Number.isFinite(n) ? n : "";
  }

  async function uploadFile(file: File, itemId: string) {
    const formData = new FormData();
    formData.append("file", file);

    const authToken = token ?? useAuthStore.getState().token;

    try {
      const res = await fetch(`${API_BASE}/api/ads/upload-image`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "آپلود ناموفق");
      }

      const data = await res.json();
      setImages((prev) =>
        prev.map((img) =>
          img.id === itemId
            ? { ...img, url: data.url, uploading: false, error: false }
            : img
        )
      );
    } catch (err: any) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === itemId ? { ...img, uploading: false, error: true } : img
        )
      );
      toast.error("آپلود تصویر ناموفق بود", {
        description: err?.message ?? "دوباره تلاش کنید.",
      });
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;

    const remaining = 3 - images.length;
    if (remaining <= 0) {
      toast.error("حداکثر ۳ تصویر مجاز است.");
      return;
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const validFiles = Array.from(files)
      .filter((f) => {
        if (!allowed.includes(f.type)) {
          toast.error(`فرمت ${f.name} پشتیبانی نمی‌شود.`);
          return false;
        }
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name} بزرگتر از ۵ مگابایت است.`);
          return false;
        }
        return true;
      })
      .slice(0, remaining);

    if (validFiles.length === 0) return;

    const newItems: ImageItem[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
      error: false,
    }));

    setImages((prev) => [...prev, ...newItems]);

    await Promise.all(
      validFiles.map((file, i) => uploadFile(file, newItems[i].id))
    );
  }

  function removeImage(itemId: string) {
    setImages((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (item?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((i) => i.id !== itemId);
    });
  }

  function validate() {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push("نام خودرو");
    if (form.year === "") missing.push("سال ساخت");
    if (!form.color.trim()) missing.push("رنگ");
    if (form.mileageKm === "") missing.push("کارکرد");
    if (!form.chassisNumber.trim()) missing.push("شماره شاسی");
    if (!form.contactPhone.trim()) missing.push("شماره تماس");
    if (!form.priceText.trim()) missing.push("قیمت");
    const p = parsePrice();
    if (form.priceText.trim() && p === "") missing.push("قیمت معتبر");
    if (form.contactPhone.trim() && form.contactPhone.trim().length < 10)
      missing.push("شماره تماس معتبر");
    if (images.some((i) => i.uploading))
      missing.push("انتظار پایان آپلود تصاویر");
    if (images.some((i) => i.error)) missing.push("رفع خطای آپلود تصاویر");
    return { ok: missing.length === 0, missing };
  }

  function showValidationToast(missing: string[]) {
    toast.error("فرم کامل نیست", {
      description:
        missing.length <= 4
          ? `لطفاً این موارد را تکمیل کنید: ${missing.join("، ")}`
          : "چند مورد ناقص است. لطفاً فیلدهای ستاره‌دار (*) را کامل کنید.",
    });
  }

  async function handleSubmit() {
    const v = validate();
    if (!v.ok) return showValidationToast(v.missing);

    const price = parsePrice();
    const payload: AddAdPayload = {
      type: form.type,
      title: form.title,
      year: form.year,
      color: form.color,
      mileageKm: form.mileageKm,
      insuranceMonths: form.insuranceMonths,
      gearbox: form.gearbox,
      chassisNumber: form.chassisNumber,
      contactPhone: form.contactPhone,
      price: price === "" ? 0 : price,
      description: form.description ?? "",
      imageUrls: images.filter((i) => i.url).map((i) => i.url!),
    };

    setLoading(true);
    try {
      toast.loading(
        mode === "edit" ? "در حال ویرایش..." : "در حال ارسال فرم...",
        { id: "add-ad" }
      );

      await onSubmit(payload);

      toast.success(mode === "edit" ? "آگهی ویرایش شد ✅" : "آگهی ثبت شد ✅", {
        id: "add-ad",
        description: "در همین صفحه نمایش داده می‌شود.",
      });

      onOpenChange(false);
      setForm(empty);
      setImages([]);
    } catch (e: any) {
      toast.error(
        mode === "edit" ? "ویرایش آگهی ناموفق بود" : "ثبت آگهی ناموفق بود",
        {
          id: "add-ad",
          description: errorToText(e) || "لطفاً دوباره تلاش کنید.",
        }
      );
    } finally {
      setLoading(false);
    }
  }

  const softGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
        : "linear-gradient(90deg, rgba(34,197,94,.80), rgba(56,189,248,.72), rgba(217,70,239,.66))",
    [isDark]
  );
  const surfaceBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 10%) 100%)"
        : "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)",
    [isDark]
  );
  const stickyBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 10%) 100%)"
        : "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)",
    [isDark]
  );
  const inactiveBtnBg = useMemo(
    () => (isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))"),
    [isDark]
  );

  const roleBtnBase =
    "h-11 w-full rounded-2xl border text-sm font-semibold " +
    "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md " +
    "active:translate-y-0 active:shadow-sm cursor-pointer";

  const priceHuman = useMemo(() => {
    const t = (form.priceText ?? "").trim();
    if (!t || t.endsWith(".")) return "";
    const n = Number(t);
    if (!Number.isFinite(n)) return "";
    return formatFromMillionInput(n);
  }, [form.priceText]);

  function toggleGearbox(next: GearboxType) {
    setF("gearbox", form.gearbox === next ? "" : next);
  }

  const canAddMore = images.length < 3;
  const hasUploading = images.some((i) => i.uploading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0 overflow-hidden w-[92vw] max-w-[620px]")}
        style={{
          borderRadius: 28,
          borderColor: "hsl(var(--border))",
          background: surfaceBg,
        }}
      >
        <VisuallyHidden>
          <DialogTitle>
            {mode === "edit" ? "ویرایش آگهی" : "افزودن آگهی"}
          </DialogTitle>
        </VisuallyHidden>

        <div className="h-1.5 w-full" style={{ background: softGradient }} />

        {/* ─── Header ─── */}
        <div
          className="sticky top-0 z-30"
          style={{
            background: stickyBg,
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div className="px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="w-10" />
              <div className="flex-1 flex justify-center">
                <div
                  className="px-4 py-2 rounded-2xl border text-sm font-semibold"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: softGradient,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  امروز • {today}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-2xl border grid place-items-center cursor-pointer transition hover:scale-105"
                style={{
                  borderColor: "hsl(var(--border))",
                  background: isDark
                    ? "hsl(0 0% 10%)"
                    : "hsl(var(--background))",
                }}
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ✅ ۳ تب وسط‌چین */}
            <div className="mt-4 flex gap-2 justify-center">
              {tabs.map((t) => {
                const active = form.type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setF("type", t.key)}
                    className={cn(
                      "px-4 py-2 rounded-2xl border text-sm font-semibold cursor-pointer select-none",
                      "transition-all hover:-translate-y-[1px] hover:shadow-sm"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: active ? softGradient : inactiveBtnBg,
                      color: "hsl(var(--foreground))",
                    }}
                    onMouseEnter={(e) => {
                      if (!active)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = softGradient;
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = inactiveBtnBg;
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="px-4 sm:px-6 py-5 max-h-[78vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Field label="نام خودرو *">
              <Input
                value={form.title}
                onChange={(e) => setF("title", e.target.value)}
                placeholder="مثلاً: Sonata 2018 | 206 تیپ 2"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="سال ساخت *">
              <Input
                value={form.year === "" ? "" : String(form.year)}
                onChange={(e) => setF("year", numberOrEmpty(e.target.value))}
                placeholder={hintYear()}
                inputMode="numeric"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="رنگ *">
              <Input
                value={form.color}
                onChange={(e) => setF("color", e.target.value)}
                placeholder="مثلاً سفید"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="کارکرد (کیلومتر) *">
              <Input
                value={form.mileageKm === "" ? "" : String(form.mileageKm)}
                onChange={(e) =>
                  setF("mileageKm", numberOrEmpty(e.target.value))
                }
                placeholder="مثلاً 45000"
                inputMode="numeric"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="مهلت بیمه (ماه)">
              <Input
                value={
                  form.insuranceMonths === ""
                    ? ""
                    : String(form.insuranceMonths)
                }
                onChange={(e) =>
                  setF("insuranceMonths", numberOrEmpty(e.target.value))
                }
                placeholder="مثلاً 6"
                inputMode="numeric"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="گیربکس">
              <div className="grid grid-cols-2 gap-2">
                {(["Automatic", "Manual"] as GearboxType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGearbox(g)}
                    className={cn(roleBtnBase)}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background:
                        form.gearbox === g ? softGradient : inactiveBtnBg,
                      color: "hsl(var(--foreground))",
                    }}
                    onMouseEnter={(e) => {
                      if (form.gearbox !== g)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = softGradient;
                    }}
                    onMouseLeave={(e) => {
                      if (form.gearbox !== g)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = inactiveBtnBg;
                    }}
                  >
                    {g === "Automatic" ? "اتومات" : "دنده‌ای"}
                  </button>
                ))}
              </div>
              {form.gearbox === "" && (
                <div className="mt-2 text-xs text-muted-foreground text-right">
                  حالت فعلی: هیچکدام
                </div>
              )}
            </Field>

            <Field label="شماره تماس *">
              <Input
                value={form.contactPhone}
                onChange={(e) => setF("contactPhone", e.target.value)}
                placeholder="مثلاً 09123456789"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="شماره شاسی *">
              <Input
                value={form.chassisNumber}
                onChange={(e) => setF("chassisNumber", e.target.value)}
                placeholder="مثلاً IR-CHS-12345"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="قیمت (بر اساس میلیون تومان) *">
              <Input
                value={form.priceText}
                onChange={(e) => setPriceText(e.target.value)}
                placeholder={hintPrice()}
                inputMode="decimal"
                className="rounded-2xl h-12"
              />
              {priceHuman && (
                <div
                  className="mt-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-right"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark
                      ? "color-mix(in srgb, rgba(255,255,255,.10) 65%, hsl(0 0% 10%) 35%)"
                      : "linear-gradient(90deg, rgba(34,197,94,.18), rgba(56,189,248,.14), rgba(217,70,239,.12))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {toFaNum(priceHuman)}
                </div>
              )}
            </Field>

            {/* ─── Image Uploader ─── */}
            <Field label="تصاویر (حداکثر ۳ عکس)">
              {canAddMore && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full rounded-2xl border-2 border-dashed h-24",
                    "flex flex-col items-center justify-center gap-2",
                    "cursor-pointer transition-all duration-200",
                    "hover:-translate-y-[1px] hover:shadow-md"
                  )}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark
                      ? "hsl(0 0% 10%)"
                      : "hsl(var(--background))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      isDark ? "hsl(0 0% 13%)" : "hsl(var(--accent))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))";
                  }}
                >
                  <ImagePlus className="h-6 w-6 opacity-60" />
                  <span className="text-sm font-medium">
                    {images.length === 0
                      ? "انتخاب تصویر"
                      : `افزودن تصویر (${images.length}/۳)`}
                  </span>
                  <span className="text-xs opacity-50">
                    JPG، PNG، WEBP — حداکثر ۵ مگابایت
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = "";
                }}
              />

              <AnimatePresence initial={false}>
                {images.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="grid grid-cols-3 gap-3 mt-3"
                  >
                    {images.map((img) => (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.2 }}
                        className="relative aspect-square rounded-2xl overflow-hidden border"
                        style={{ borderColor: "hsl(var(--border))" }}
                      >
                        <img
                          src={img.preview}
                          alt="پیش‌نمایش"
                          className={cn(
                            "w-full h-full object-cover transition-all duration-300",
                            img.uploading && "opacity-50 blur-[1px]",
                            img.error && "opacity-40 grayscale"
                          )}
                        />

                        {img.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="rounded-full p-1.5"
                              style={{
                                background: isDark
                                  ? "rgba(0,0,0,.55)"
                                  : "rgba(255,255,255,.75)",
                              }}
                            >
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          </div>
                        )}

                        {img.error && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <span className="text-destructive text-xs font-semibold bg-background/80 px-2 py-0.5 rounded-xl">
                              خطا
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className={cn(
                            "absolute top-1.5 left-1.5 h-7 w-7 rounded-xl",
                            "flex items-center justify-center",
                            "transition-all duration-150 hover:scale-110 cursor-pointer"
                          )}
                          style={{
                            background: isDark
                              ? "rgba(0,0,0,.65)"
                              : "rgba(255,255,255,.85)",
                            border: "1px solid hsl(var(--border))",
                          }}
                          aria-label="حذف تصویر"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>

                        {!img.uploading && !img.error && img.url && (
                          <div
                            className="absolute bottom-1.5 left-1.5 h-5 w-5 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(34,197,94,.9)" }}
                          >
                            <svg
                              viewBox="0 0 10 10"
                              className="h-3 w-3 fill-white"
                            >
                              <path
                                d="M1.5 5l2.5 2.5L8.5 2.5"
                                stroke="white"
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {images.length === 3 && (
                <p className="text-xs text-muted-foreground text-right mt-2">
                  حداکثر ۳ تصویر انتخاب شده است.
                </p>
              )}
            </Field>

            <Field label="توضیحات (وضعیت بدنه، رنگ‌شدگی، لاستیک‌ها و...)">
              <Textarea
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
                placeholder="دلخواه"
                className="rounded-2xl min-h-[120px]"
              />
            </Field>

            <Button
              onClick={handleSubmit}
              disabled={loading || hasUploading}
              className="w-full rounded-2xl h-12 font-semibold cursor-pointer transition hover:-translate-y-[1px] hover:shadow-md"
              style={{
                border: "1px solid hsl(var(--border))",
                background: softGradient,
                color: "hsl(var(--foreground))",
              }}
            >
              {hasUploading
                ? "در حال آپلود تصاویر..."
                : loading
                ? "در حال ارسال..."
                : mode === "edit"
                ? "ذخیره تغییرات"
                : "ارسال فرم"}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-foreground text-right">
        {label}
      </div>
      {children}
    </div>
  );
}
