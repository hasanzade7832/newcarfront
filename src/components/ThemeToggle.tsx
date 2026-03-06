"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  if (!mounted) return null; // ✅ تا mount نشده چیزی رندر نشود

  return (
    <Button
      type="button"
      variant="outline"
      className={`h-10 w-10 rounded-2xl cursor-pointer ${className || ""}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="تغییر تم"
      aria-label="تغییر تم"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
