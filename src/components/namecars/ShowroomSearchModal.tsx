"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X, Eye } from "lucide-react";

type Showroom = {
  id: number;
  showroomName: string;
  city: string;
  rank?: number;
};

export default function ShowroomSearchModal({
  isOpen,
  onClose,
  borderColor,
  isDark,
}: {
  isOpen: boolean;
  onClose: () => void;
  borderColor: string;
  isDark: boolean;
}) {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const fetchShowrooms = async () => {
      setLoading(true);
      setShowrooms([]);
      try {
        const res = await api.get("/api/auth/showrooms");
        const validData = (res.data as { showroomName: string; city: string }[])
          .map((item, index) => ({
            id: index + 1,
            showroomName: item.showroomName,
            city: item.city,
          }))
          .filter((s) => s.showroomName);
        setShowrooms(validData);
      } catch (error) {
        console.error("Failed to fetch showrooms:", error);
        setShowrooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchShowrooms();
  }, [isOpen]);

  const filteredShowrooms = useMemo(() => {
    if (loading || !showrooms || showrooms.length === 0) return [];
    let result = [...showrooms];

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.showroomName.toLowerCase().includes(lowerTerm) ||
          s.city.toLowerCase().includes(lowerTerm)
      );
    }

    result = result.sort((a, b) =>
      a.showroomName.localeCompare(b.showroomName, "fa")
    );

    return result.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [showrooms, searchTerm, loading]);

  const handleShowroomClick = (
    showroom: Showroom,
    shouldClose: boolean = true
  ) => {
    if (showroom.id) {
      router.push(`/u/${showroom.id}`);
      if (shouldClose) {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        background: "rgba(0, 0, 0, 0.52)",
        backdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{
          borderColor,
          background: isDark
            ? "linear-gradient(180deg, rgba(15, 15, 15, .98), rgba(8, 8, 8, .99))"
            : "hsl(var(--card))",
          maxHeight: "170vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-4 border-b border-border relative"
          style={{ borderColor }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 hover:rotate-90"
          >
            <X className="h-6 w-6 text-primary/70 hover:text-primary transition-colors" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو در نمایشگاه‌ها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 rounded-2xl border pl-10 pr-4 text-sm outline-none"
              style={{
                borderColor,
                background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))",
                color: "hsl(var(--foreground))",
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredShowrooms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              نمایشگاهی یافت نشد
            </div>
          ) : (
            <div className="space-y-2">
              {filteredShowrooms.map((showroom) => (
                <motion.div
                  key={showroom.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                  style={{
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.08)",
                    background: isDark
                      ? "rgba(0, 0, 0, 0.1)"
                      : "rgba(255, 255, 255, 0.1)",
                  }}
                  onClick={() => handleShowroomClick(showroom, true)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400"
                      style={{
                        boxShadow: isDark
                          ? "0 0 0 2px rgba(56, 189, 248, 0.2)"
                          : "0 0 0 2px rgba(56, 189, 248, 0.15)",
                      }}
                    >
                      #{showroom.rank}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-lg text-foreground truncate">
                        {showroom.showroomName}
                      </div>
                      <span className="text-muted-foreground text-sm">•</span>
                      <div className="text-sm text-muted-foreground truncate">
                        {showroom.city}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye
                      className="h-5 w-5 text-primary opacity-70 hover:opacity-100 transition-opacity hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowroomClick(showroom, false);
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
