"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

export default function WebsiteDescriptionManager() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))";
  }, [isDark]);

  useEffect(() => {
    loadDescription();
  }, []);

  const loadDescription = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/website-description");
      setDescription(res.data.description);
    } catch (e) {
      toast.error("خطا در دریافت توضیحات");
    } finally {
      setLoading(false);
    }
  };

  const saveDescription = async () => {
    try {
      await api.put("/api/admin/website-description", { description });
      toast.success("توضیحات ذخیره شد");
    } catch (e) {
      toast.error("خطا در ذخیره توضیحات");
    }
  };

  const btnMotion =
    "cursor-pointer rounded-2xl border " +
    "transition-all duration-200 ease-out " +
    "hover:-translate-y-[1px] hover:scale-[1.02] hover:shadow-md " +
    "active:translate-y-0 active:scale-100 active:shadow-sm";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full rounded-3xl p-4 border border-border bg-card"
      style={{
        borderColor: "hsl(var(--border))",
        background: isDark ? "hsl(0 0% 8%)" : "hsl(var(--card))",
      }}
    >
      <div className="space-y-4 flex-1 flex flex-col">
        <h2 className="text-xl font-semibold text-center text-foreground">
          توضیحات سایت
        </h2>
        <div className="relative flex-1 min-h-0">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-full rounded-2xl border-2 border-border bg-card"
            placeholder="توضیحات سایت را وارد کنید..."
            disabled={loading}
            style={{
              borderColor: "hsl(var(--border))",
              background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              resize: "vertical",
              minHeight: "400px", // اندازه دو برابر شده
            }}
          />
        </div>
        <Button
          onClick={saveDescription}
          disabled={loading}
          variant="default" // حذف border از دکمه
          className={[
            btnMotion,
            "bg-card mx-auto", // حذف border-border
            loading ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
          style={{
            background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
          onMouseEnter={(e) => {
            if (loading) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              softGradient;
          }}
          onMouseLeave={(e) => {
            if (loading) return;
            (e.currentTarget as HTMLButtonElement).style.background = isDark
              ? "hsl(0 0% 10%)"
              : "hsl(var(--card))";
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current" />
              <span>در حال ذخیره...</span>
            </div>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              ذخیره توضیحات
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
