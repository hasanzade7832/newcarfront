"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Save, Power, Timer } from "lucide-react";

export default function FlashSettingsManager({
  canManage,
}: {
  canManage: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(15);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.14), rgba(56,189,248,.12), rgba(217,70,239,.12))";
  }, [isDark]);

  const cardBg = useMemo(() => {
    return isDark
      ? "linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.018),rgba(0,0,0,.16))"
      : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))";
  }, [isDark]);

  const borderColor = useMemo(() => {
    return isDark ? "rgba(255,255,255,0.10)" : "hsl(var(--border))";
  }, [isDark]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("/api/Ads/flash-settings");
        setIsEnabled(!!res.data.isEnabled);
        setDefaultDuration(Number(res.data.defaultDurationMinutes ?? 15));
      } catch (e) {
        toast.error("خطا در بارگذاری تنظیمات");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await api.post("/api/Ads/flash-settings", {
        isEnabled,
        defaultDurationMinutes: defaultDuration,
      });
      toast.success("تنظیمات ذخیره شد");
    } catch (e) {
      toast.error("خطا در ذخیره تنظیمات");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEnabled = () => {
    if (!canManage) return;
    setIsEnabled((p) => !p);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-52">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-xl mx-auto rounded-[26px] border overflow-hidden"
      style={{ borderColor, background: cardBg }}
    >
      <div className="p-6" style={{ background: softGradient }}>
        <div className="flex items-center justify-between" dir="rtl">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">
              مدیریت فوروارد
            </h2>
            <p className="text-sm opacity-80 mt-1 text-foreground">
              فعال/غیرفعال کردن فوروارد و تعیین مدت پیش‌فرض
            </p>
          </div>
          <div
            className="h-11 w-11 rounded-2xl border grid place-items-center"
            style={{
              borderColor: "rgba(0,0,0,0.10)",
              background: "rgba(255,255,255,0.25)",
            }}
          >
            <Timer className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6" dir="rtl">
        {/* Toggle */}
        <div
          className="flex items-center justify-between rounded-2xl border p-4"
          style={{
            borderColor,
            background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl grid place-items-center border"
              style={{
                borderColor,
                background: isEnabled
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(148,163,184,0.15)",
              }}
            >
              <Power className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-foreground">وضعیت فوروارد</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isEnabled ? "فعال است" : "غیرفعال است"}
                {!canManage ? " (شما دسترسی ندارید)" : ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleEnabled}
            disabled={!canManage}
            className="relative w-14 h-7 rounded-full border transition-all"
            style={{
              borderColor,
              background: isEnabled ? softGradient : "rgba(200,200,200,0.35)",
              opacity: canManage ? 1 : 0.55,
              cursor: canManage ? "pointer" : "not-allowed",
            }}
          >
            <span
              className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-all"
              style={{
                transform: isEnabled ? "translateX(28px)" : "translateX(0px)",
              }}
            />
          </button>
        </div>

        {/* Duration */}
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor,
            background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)",
          }}
        >
          <div className="font-bold text-foreground mb-3">
            مدت پیش‌فرض فوروارد
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["15", "30", "45", "60"].map((d) => {
              const val = parseInt(d);
              const active = defaultDuration === val;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDefaultDuration(val)}
                  className="rounded-2xl border px-3 py-3 text-sm font-extrabold transition-all"
                  style={{
                    borderColor,
                    background: active
                      ? softGradient
                      : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                    transform: active ? "translateY(-1px)" : "none",
                    boxShadow: active
                      ? "0 10px 22px rgba(56,189,248,0.18)"
                      : "none",
                    cursor: "pointer",
                  }}
                >
                  {d} دقیقه
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={saveSettings}
          disabled={isSaving || !canManage}
          className="w-full rounded-2xl border px-4 py-3 font-extrabold flex items-center justify-center gap-2 transition-all"
          style={{
            borderColor,
            background:
              isSaving || !canManage ? "rgba(148,163,184,0.25)" : softGradient,
            cursor: isSaving || !canManage ? "not-allowed" : "pointer",
          }}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>

        {!isEnabled && (
          <div className="text-xs text-muted-foreground text-center">
            وقتی فوروارد غیرفعال باشد، در صفحه اصلی آیکون فوروارد برای همه
            آگهی‌ها دیزیبل می‌شود.
          </div>
        )}
      </div>
    </motion.div>
  );
}
