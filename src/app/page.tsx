"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import jalaali from "jalaali-js";

/* ------------------------------------------------------------------ */
/*  Jalali helpers                                                     */
/* ------------------------------------------------------------------ */

const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const JALALI_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function gregorianToJalali(y: number, m: number, d: number) {
  return jalaali.toJalaali(y, m, d);
}

function jalaliToGregorian(jy: number, jm: number, jd: number) {
  return jalaali.toGregorian(jy, jm, jd);
}

function formatJalaliDate(jy: number, jm: number, jd: number) {
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

function formatJalaliDateFull(jy: number, jm: number, jd: number) {
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}

function daysInJalaliMonth(jy: number, jm: number) {
  return jalaali.jalaaliMonthLength(jy, jm);
}

function jalaliDayOfWeek(jy: number, jm: number, jd: number) {
  const g = jalaliToGregorian(jy, jm, jd);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Shop {
  id: number;
  name: string;
  description: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  is_available: number;
  is_open: boolean;
  category_name: string;
  category_icon: string;
  category_slug: string;
  distance: number;
  image_url: string;
  telegram: string | null;
  instagram: string | null;
  whatsapp: string | null;
  about: string | null;
  is_bookable: number;
  slot_duration: number;
  working_hours?: { day: string; day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[];
}

interface Category {
  id: number;
  name: string;
  name_en: string;
  icon: string;
}

interface Comment {
  id: string;
  shopId: number;
  author: string;
  text: string;
  rating: number;
  createdAt: string;
}

interface RatingSummary {
  avg: number;
  count: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TEHRAN: [number, number] = [35.6892, 51.389];
const COMMENTS_KEY = "sf_comments";

const defaultComments: Comment[] = [
  { id: "c1", shopId: 1, author: "علی محمدی", text: "محصولات باکیفیت و قیمت مناسب. حتماً پیشنهاد می‌کنم.", rating: 5, createdAt: "2026-06-08T10:30:00" },
  { id: "c2", shopId: 1, author: "مرتضی احمدی", text: "سرویس خوبی دارن ولی کمی طول می‌کشه.", rating: 4, createdAt: "2026-06-07T14:00:00" },
  { id: "c3", shopId: 2, author: "سارا کریمی", text: "بهترین کافه منطقه! قهوه عالیه.", rating: 5, createdAt: "2026-06-09T09:00:00" },
  { id: "c4", shopId: 3, author: "محمد رضایی", text: "قیمت‌ها کمی بالاست.", rating: 3, createdAt: "2026-06-06T16:00:00" },
  { id: "c5", shopId: 4, author: "زهرا حسینی", text: "نظافت عالی و پرسنل خوش‌برخورد.", rating: 5, createdAt: "2026-06-05T11:00:00" },
  { id: "c6", shopId: 5, author: "امیر نوری", text: "تجربه متوسطی داشتم.", rating: 3, createdAt: "2026-06-04T13:00:00" },
  { id: "c7", shopId: 6, author: "فاطمه موسوی", text: "عالیه! هر روز میام اینجا.", rating: 5, createdAt: "2026-06-03T08:00:00" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadComments(): Comment[] {
  if (typeof window === "undefined") return defaultComments;
  try {
    const raw = window.localStorage.getItem(COMMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  try { window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(defaultComments)); } catch { /* ignore */ }
  return defaultComments;
}

function saveComments(comments: Comment[]) {
  try { window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments)); } catch { /* ignore */ }
}

function getRatingSummary(shopId: number, comments: Comment[]): RatingSummary {
  const shopComments = comments.filter((c) => c.shopId === shopId);
  if (shopComments.length === 0) return { avg: 0, count: 0 };
  const sum = shopComments.reduce((a, c) => a + c.rating, 0);
  return { avg: sum / shopComments.length, count: shopComments.length };
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} متر`;
  return `${(meters / 1000).toFixed(1)} کیلومتر`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  return `${days} روز پیش`;
}

/* ------------------------------------------------------------------ */
/*  Star rating                                                        */
/* ------------------------------------------------------------------ */

function Stars({
  value,
  onChange,
  size = 16,
  interactive = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  interactive?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-px" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`transition-transform ${interactive ? "cursor-pointer active:scale-110" : "cursor-default"}`}
          style={{ width: size, height: size }}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={star <= (hover || value) ? "#ffb300" : "#e0e0e0"}
              stroke={star <= (hover || value) ? "#ffb300" : "#ccc"}
              strokeWidth="0.5"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(defaultComments);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newAuthor, setNewAuthor] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [commentsDragY, setCommentsDragY] = useState(0);
  const [shopDetail, setShopDetail] = useState<Shop | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingJalali, setBookingJalali] = useState(() => {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  });
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingSlots, setBookingSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const sheetStartY = useRef(0);
  const commentsStartY = useRef(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setComments(loadComments()); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { /* ignore */ }
  }, []);

  const fetchShops = useCallback(async () => {
    try {
      const params = new URLSearchParams({ lat: String(TEHRAN[0]), lng: String(TEHRAN[1]), radius: "15000" });
      if (selectedCategory) params.set("category", selectedCategory);
      if (openOnly) params.set("open", "true");
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res = await fetch(`/api/shops?${params}`);
      const data = await res.json();
      setShops(data.shops || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedCategory, openOnly, debouncedQuery]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchShops(); }, [fetchShops]);

  useEffect(() => {
    if (!selectedShop) { setShopDetail(null); return; }
    fetch(`/api/shops/${selectedShop.id}`)
      .then((r) => r.json())
      .then((d) => setShopDetail(d))
      .catch(() => {});
  }, [selectedShop?.id]);

  useEffect(() => {
    if (!showBooking || !selectedShop) return;
    fetch(`/api/shops/${selectedShop.id}/slots?date=${bookingDate}`)
      .then((r) => r.json())
      .then((d) => setBookingSlots(d.slots || []))
      .catch(() => {});
  }, [showBooking, bookingDate, selectedShop?.id]);

  const sortedShops = [...shops].sort((a, b) => {
    if (sortBy === "rating") {
      const ra = getRatingSummary(a.id, comments).avg;
      const rb = getRatingSummary(b.id, comments).avg;
      return rb - ra;
    }
    return a.distance - b.distance;
  });

  function submitComment() {
    if (!selectedShop || !newComment.trim() || !newAuthor.trim()) return;
    const c: Comment = {
      id: `c_${Date.now()}`,
      shopId: selectedShop.id,
      author: newAuthor.trim(),
      text: newComment.trim(),
      rating: newRating,
      createdAt: new Date().toISOString(),
    };
    const updated = [c, ...comments];
    setComments(updated);
    saveComments(updated);
    setNewComment("");
    setNewRating(5);
  }

  async function submitBooking() {
    if (!selectedShop || !bookingName.trim() || !bookingPhone.trim() || !selectedSlot) return;
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: selectedShop.id,
          customer_name: bookingName.trim(),
          customer_phone: bookingPhone.trim(),
          date: bookingDate,
          time_slot: selectedSlot,
        }),
      });
      if (res.ok) {
        setBookingSuccess(true);
        setTimeout(() => {
          setShowBooking(false);
          setBookingSuccess(false);
          setSelectedSlot("");
          setBookingName("");
          setBookingPhone("");
        }, 2000);
      }
    } catch { /* ignore */ }
  }

  function flyToShop(shop: Shop) {
    setSelectedShop(shop);
    setShowComments(false);
    setShowSearchOverlay(false);
  }

  function handleMapShopClick(lat: number, lng: number) {
    const shop = shops.find((s) => s.latitude === lat && s.longitude === lng);
    if (shop) {
      setSelectedShop(shop);
      setShowComments(false);
    }
  }

  const openShops = shops.filter((s) => s.is_open).length;

  const suggestions = searchQuery.trim().length >= 2
    ? shops.filter((s) => s.name.includes(searchQuery.trim())).slice(0, 8)
    : [];

  const isPanelOpen = selectedShop !== null || showSearchOverlay || showBooking;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#f0f0f0]" dir="rtl">

      {/* MAP */}
      <div className="absolute inset-0 w-full h-full">
        <MapView
          onShopClick={handleMapShopClick}
          onMapClick={() => { setSelectedShop(null); setShowComments(false); }}
          shops={shops}
          comments={comments}
          selectedShop={selectedShop}
        />
      </div>

      {/* BACKDROP */}
      {isPanelOpen && (
        <div
          className="absolute inset-0 z-[999] bg-black/20 animate-fade-in"
          onClick={() => { setSelectedShop(null); setShowComments(false); setShowSearchOverlay(false); setShowBooking(false); }}
        />
      )}

      {/* ============================================================ */}
      {/*  TOP BAR                                                      */}
      {/* ============================================================ */}
      <div className={`absolute top-0 left-0 right-0 z-[1000] px-3 pt-[calc(var(--top-safe)+8px)] ${showSearchOverlay ? "hidden" : ""}`}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2.5 px-0.5">
          <button
            onClick={() => setSelectedCategory("")}
            className={`flex-shrink-0 h-[34px] px-4 rounded-full text-[13px] font-medium transition-all btn-press ${
              !selectedCategory
                ? "bg-[#fc3f1d] text-white shadow-sm"
                : "bg-white text-[#333] shadow-[var(--yandex-shadow)]"
            }`}
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.name_en ? "" : cat.name_en)}
              className={`flex-shrink-0 h-[34px] px-4 rounded-full text-[13px] font-medium whitespace-nowrap transition-all btn-press flex items-center gap-1.5 ${
                selectedCategory === cat.name_en
                  ? "bg-[#fc3f1d] text-white shadow-sm"
                  : "bg-white text-[#333] shadow-[var(--yandex-shadow)]"
              }`}
            >
              <span className="text-[14px]">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-white rounded-full shadow-[var(--yandex-shadow)] px-3 h-[30px] flex items-center text-[12px] text-[#666]">
              {loading ? (
                <span className="skeleton w-12 h-3" />
              ) : (
                <>{shops.length} مغازه</>
              )}
            </span>
            <button
              onClick={() => setOpenOnly(!openOnly)}
              className={`flex items-center gap-1.5 h-[30px] px-3 rounded-full text-[12px] font-medium transition-all btn-press ${
                openOnly
                  ? "bg-[#00b341] text-white shadow-sm"
                  : "bg-white text-[#666] shadow-[var(--yandex-shadow)]"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openOnly ? "bg-white" : "bg-[#00b341]"}`} />
              باز
            </button>
          </div>
          <div className="flex items-center bg-white rounded-full shadow-[var(--yandex-shadow)] p-0.5 h-[30px]">
            <button
              onClick={() => setSortBy("distance")}
              className={`px-3 h-full rounded-full text-[12px] font-medium transition-all ${
                sortBy === "distance" ? "bg-[#fc3f1d] text-white" : "text-[#666]"
              }`}
            >
              نزدیک‌ترین
            </button>
            <button
              onClick={() => setSortBy("rating")}
              className={`px-3 h-full rounded-full text-[12px] font-medium transition-all ${
                sortBy === "rating" ? "bg-[#fc3f1d] text-white" : "text-[#666]"
              }`}
            >
              بهترین
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SHOP DETAIL BOTTOM SHEET                                     */}
      {/* ============================================================ */}
      {selectedShop && !showComments && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up"
          style={{ transform: sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined, transition: sheetDragY === 0 ? "transform 0.2s ease" : undefined }}
        >
          <div className="bg-white rounded-t-[20px] shadow-[0_-2px_20px_rgba(0,0,0,0.1)] max-h-[70vh] overflow-hidden flex flex-col">
            {/* Handle */}
            <div
              className="flex-shrink-0 cursor-grab py-2"
              onTouchStart={(e) => { sheetStartY.current = e.touches[0].clientY; }}
              onTouchMove={(e) => {
                const dy = e.touches[0].clientY - sheetStartY.current;
                if (dy > 0) setSheetDragY(dy);
              }}
              onTouchEnd={() => {
                if (sheetDragY > 100) {
                  setSelectedShop(null);
                }
                setSheetDragY(0);
              }}
            >
              <div className="sheet-handle" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {/* Hero image */}
              <div className="relative mx-3 h-[160px] rounded-2xl overflow-hidden bg-[#f0f0f0]">
                <img
                  src={selectedShop.image_url}
                  alt={selectedShop.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm ${
                    selectedShop.is_open
                      ? "bg-[#00b341]/90 text-white"
                      : "bg-[#ff4444]/90 text-white"
                  }`}>
                    {selectedShop.is_open ? "باز" : "بسته"}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-medium">
                    {selectedShop.category_icon} {selectedShop.category_name}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="px-4 pt-3 pb-2">
                <h2 className="text-[18px] font-bold text-[#1a1a1a] leading-tight">{selectedShop.name}</h2>
                <p className="text-[13px] text-[#666] mt-1 leading-relaxed">{selectedShop.description}</p>

                {/* About */}
                {(shopDetail?.about || selectedShop.about) && (
                  <div className="mt-3 bg-[#f9f9f9] rounded-xl px-3 py-2.5">
                    <p className="text-[11px] font-medium text-[#999] mb-1 uppercase tracking-wider">درباره ما</p>
                    <p className="text-[12px] text-[#555] leading-relaxed">{shopDetail?.about || selectedShop.about}</p>
                  </div>
                )}

                {/* Rating */}
                {(() => {
                  const r = getRatingSummary(selectedShop.id, comments);
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowComments(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowComments(true); }}
                      className="w-full flex items-center gap-2.5 mt-3 bg-[#fff8e1] rounded-xl px-3 py-2.5 btn-press cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[18px] font-bold text-[#f57f17]">
                          {r.avg > 0 ? r.avg.toFixed(1) : "—"}
                        </span>
                        <Stars value={Math.round(r.avg)} size={14} />
                      </div>
                      <span className="text-[12px] text-[#999]">({r.count} نظر)</span>
                      <span className="mr-auto text-[12px] font-medium text-[#fc3f1d]">مشاهده نظرات</span>
                    </div>
                  );
                })()}

                {/* Details */}
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[14px] flex-shrink-0 mt-0.5">📍</span>
                    <span className="text-[13px] text-[#333] leading-relaxed">{selectedShop.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[14px] flex-shrink-0">📞</span>
                    <span dir="ltr" className="text-[13px] text-[#fc3f1d] font-medium">{selectedShop.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[14px] flex-shrink-0">📏</span>
                    <span className="text-[13px] text-[#666]">{formatDistance(selectedShop.distance)}</span>
                  </div>
                </div>

                {/* Working Hours */}
                {shopDetail?.working_hours && (
                  <div className="mt-4 border-t border-[#f0f0f0] pt-3">
                    <p className="text-[11px] font-medium text-[#999] mb-2 uppercase tracking-wider">ساعات کاری</p>
                    <div className="space-y-1">
                      {shopDetail.working_hours.map((h) => (
                        <div key={h.day_of_week} className={`flex items-center justify-between text-[12px] px-2 py-1 rounded-lg ${h.day_of_week === new Date().getDay() ? "bg-[#fc3f1d]/10 font-medium" : ""}`}>
                          <span className={`${h.day_of_week === new Date().getDay() ? "text-[#fc3f1d]" : "text-[#333]"}`}>{h.day}</span>
                          {h.is_closed ? (
                            <span className="text-[#ff4444]">تعطیل</span>
                          ) : (
                            <span className="text-[#666]" dir="ltr">{h.open_time} – {h.close_time}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {(selectedShop.telegram || selectedShop.instagram || selectedShop.whatsapp) && (
                  <div className="mt-4 border-t border-[#f0f0f0] pt-3">
                    <p className="text-[11px] font-medium text-[#999] mb-2 uppercase tracking-wider">شبکه‌های اجتماعی</p>
                    <div className="flex gap-2">
                      {selectedShop.telegram && (
                        <a href={selectedShop.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#229ED9]/10 text-[#229ED9] text-[12px] font-medium btn-press">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                          تلگرام
                        </a>
                      )}
                      {selectedShop.instagram && (
                        <a href={`https://instagram.com/${selectedShop.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E4405F]/10 text-[#E4405F] text-[12px] font-medium btn-press">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          اینستاگرام
                        </a>
                      )}
                      {selectedShop.whatsapp && (
                        <a href={`https://wa.me/${selectedShop.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] text-[12px] font-medium btn-press">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          واتساپ
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2.5 mt-4 mb-2">
                  <a
                    href={`tel:${selectedShop.phone}`}
                    className="flex-1 bg-[#fc3f1d] text-white text-center py-3 rounded-xl text-[14px] font-semibold btn-press flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    تماس
                  </a>
                  <a
                    href={`https://www.google.com/maps?q=${selectedShop.latitude},${selectedShop.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#f5f5f5] text-[#333] text-center py-3 rounded-xl text-[14px] font-semibold btn-press flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    مسیریابی
                  </a>
                </div>

                {/* Book Appointment Button */}
                {(shopDetail?.is_bookable || selectedShop.is_bookable) ? (
                  <button
                    onClick={() => { setShowBooking(true); setSelectedSlot(""); setBookingSuccess(false); }}
                    className="w-full bg-[#7c3aed] text-white text-center py-3 rounded-xl text-[14px] font-semibold btn-press flex items-center justify-center gap-2 mt-2.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    نوبت‌دهی آنلاین
                  </button>
                ) : null}

                {/* Recent comments preview */}
                {(() => {
                  const shopComments = comments.filter((c) => c.shopId === selectedShop.id).slice(0, 2);
                  if (shopComments.length === 0) return null;
                  return (
                    <div className="border-t border-[#f0f0f0] pt-3 mt-2">
                      <p className="text-[11px] font-medium text-[#999] mb-2 uppercase tracking-wider">آخرین نظرات</p>
                      {shopComments.map((c) => (
                        <div key={c.id} className="bg-[#f9f9f9] rounded-xl p-3 mb-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#fc3f1d] to-[#ff6b35] flex items-center justify-center text-white text-[10px] font-bold">
                                {c.author.charAt(0)}
                              </div>
                              <span className="text-[12px] font-medium text-[#333]">{c.author}</span>
                            </div>
                            <Stars value={c.rating} size={12} />
                          </div>
                          <p className="text-[12px] text-[#666] leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  COMMENTS BOTTOM SHEET                                         */}
      {/* ============================================================ */}
      {selectedShop && showComments && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up"
          style={{ transform: commentsDragY > 0 ? `translateY(${commentsDragY}px)` : undefined, transition: commentsDragY === 0 ? "transform 0.2s ease" : undefined }}
        >
          <div className="bg-white rounded-t-[20px] shadow-[0_-2px_20px_rgba(0,0,0,0.1)] max-h-[80vh] flex flex-col">
            {/* Handle */}
            <div
              className="flex-shrink-0 py-2 cursor-grab"
              onTouchStart={(e) => { commentsStartY.current = e.touches[0].clientY; }}
              onTouchMove={(e) => {
                const dy = e.touches[0].clientY - commentsStartY.current;
                if (dy > 0) setCommentsDragY(dy);
              }}
              onTouchEnd={() => {
                if (commentsDragY > 100) {
                  setShowComments(false);
                }
                setCommentsDragY(0);
              }}
            >
              <div className="sheet-handle" />
            </div>

            {/* Sticky header */}
            <div className="flex-shrink-0 sticky top-0 bg-white border-b border-[#f0f0f0] z-10">
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => setShowComments(false)} className="text-[#fc3f1d] text-[13px] font-medium btn-press">
                  بازگشت
                </button>
                <h3 className="text-[14px] font-bold text-[#1a1a1a] truncate max-w-[200px]">نظرات {selectedShop.name}</h3>
                <div className="w-16" />
              </div>
              {(() => {
                const r = getRatingSummary(selectedShop.id, comments);
                return (
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <span className="text-[24px] font-bold text-[#f57f17]">
                      {r.avg > 0 ? r.avg.toFixed(1) : "—"}
                    </span>
                    <Stars value={Math.round(r.avg)} size={18} />
                    <span className="text-[12px] text-[#999]">({r.count} نظر)</span>
                  </div>
                );
              })()}
            </div>

            {/* Scrollable */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {/* New comment form */}
              <div className="px-4 py-3 border-b border-[#f0f0f0] bg-[#fafafa]">
                <p className="text-[12px] font-medium text-[#666] mb-2">نظر خود را بنویسید</p>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[12px] text-[#999]">امتیاز:</span>
                  <Stars value={newRating} onChange={setNewRating} size={20} interactive />
                </div>
                <input
                  type="text"
                  placeholder="نام شما"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full mb-2 px-3 py-2.5 rounded-xl border border-[#e0e0e0] text-[16px] outline-none focus:border-[#fc3f1d] bg-white transition-colors"
                />
                <textarea
                  placeholder="تجربه خود را بنویسید..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e0e0e0] text-[16px] outline-none focus:border-[#fc3f1d] resize-none bg-white transition-colors"
                />
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || !newAuthor.trim()}
                  className="mt-2.5 w-full bg-[#fc3f1d] text-white py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-30 btn-press"
                >
                  ثبت نظر
                </button>
              </div>

              {/* Comments list */}
              <div className="px-4 py-2">
                {comments.filter((c) => c.shopId === selectedShop.id).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-[32px] mb-2">💬</div>
                    <p className="text-[13px] text-[#999]">هنوز نظری ثبت نشده</p>
                    <p className="text-[12px] text-[#bbb] mt-1">اولین نفر باشید!</p>
                  </div>
                ) : (
                  comments
                    .filter((c) => c.shopId === selectedShop.id)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((c) => (
                      <div key={c.id} className="py-3 border-b border-[#f5f5f5] last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fc3f1d] to-[#ff6b35] flex items-center justify-center text-white text-[11px] font-bold">
                              {c.author.charAt(0)}
                            </div>
                            <div>
                              <span className="text-[13px] font-medium text-[#1a1a1a] block">{c.author}</span>
                              <span className="text-[11px] text-[#999]">{timeAgo(c.createdAt)}</span>
                            </div>
                          </div>
                          <Stars value={c.rating} size={12} />
                        </div>
                        <p className="text-[13px] text-[#444] leading-relaxed pr-10">{c.text}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  BOOKING PANEL                                                */}
      {/* ============================================================ */}
      {selectedShop && showBooking && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
          <div className="bg-white rounded-t-[20px] shadow-[0_-2px_20px_rgba(0,0,0,0.1)] max-h-[80vh] flex flex-col">
            <div className="flex-shrink-0 py-2 cursor-grab">
              <div className="sheet-handle" />
            </div>

            <div className="flex-shrink-0 sticky top-0 bg-white border-b border-[#f0f0f0] z-10">
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => setShowBooking(false)} className="text-[#fc3f1d] text-[13px] font-medium btn-press">
                  بازگشت
                </button>
                <h3 className="text-[14px] font-bold text-[#1a1a1a]">نوبت‌دهی {selectedShop.name}</h3>
                <div className="w-16" />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 overscroll-contain p-4">
              {bookingSuccess ? (
                <div className="text-center py-10">
                  <div className="text-[48px] mb-3">✅</div>
                  <p className="text-[16px] font-bold text-[#00b341]">نوبت شما با موفقیت ثبت شد!</p>
                  <p className="text-[13px] text-[#666] mt-2">{formatJalaliDateFull(bookingJalali.jy, bookingJalali.jm, bookingJalali.jd)} — {selectedSlot}</p>
                </div>
              ) : (
                <>
                  {/* Jalali Date Picker */}
                  <div className="mb-4">
                    <p className="text-[11px] font-medium text-[#999] mb-2 uppercase tracking-wider">انتخاب تاریخ</p>
                    <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
                      {/* Month header */}
                      <div className="flex items-center justify-between px-3 py-2.5 bg-[#f9f9f9]">
                        <button
                          onClick={() => {
                            let newM = bookingJalali.jm - 1;
                            let newY = bookingJalali.jy;
                            if (newM < 1) { newM = 12; newY--; }
                            setBookingJalali({ jy: newY, jm: newM, jd: 1 });
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] btn-press"
                        >
                          ▸
                        </button>
                        <span className="text-[14px] font-semibold text-[#333]">
                          {JALALI_MONTHS[bookingJalali.jm - 1]} {bookingJalali.jy}
                        </span>
                        <button
                          onClick={() => {
                            let newM = bookingJalali.jm + 1;
                            let newY = bookingJalali.jy;
                            if (newM > 12) { newM = 1; newY++; }
                            setBookingJalali({ jy: newY, jm: newM, jd: 1 });
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] btn-press"
                        >
                          ◂
                        </button>
                      </div>

                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 border-b border-[#f0f0f0]">
                        {JALALI_WEEKDAYS.map((d) => (
                          <div key={d} className="text-center py-1.5 text-[10px] font-medium text-[#999]">
                            {d === "جمعه" ? "ج" : d.slice(0, 1)}
                          </div>
                        ))}
                      </div>

                      {/* Days grid */}
                      {(() => {
                        const daysCount = daysInJalaliMonth(bookingJalali.jy, bookingJalali.jm);
                        const firstDayJalali = jalaliDayOfWeek(bookingJalali.jy, bookingJalali.jm, 1);
                        const today = new Date();
                        const todayJalali = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
                        const isCurrentMonth = todayJalali.jy === bookingJalali.jy && todayJalali.jm === bookingJalali.jm;

                        const cells: (number | null)[] = [];
                        for (let i = 0; i < firstDayJalali; i++) cells.push(null);
                        for (let d = 1; d <= daysCount; d++) cells.push(d);

                        return (
                          <div className="grid grid-cols-7">
                            {cells.map((day, i) => {
                              if (day === null) return <div key={`e${i}`} />;
                              const isToday = isCurrentMonth && day === todayJalali.jd;
                              const isSelected = day === bookingJalali.jd;
                              const isPast = isCurrentMonth && day < todayJalali.jd;
                              return (
                                <button
                                  key={day}
                                  disabled={isPast}
                                  onClick={() => {
                                    const newJ = { jy: bookingJalali.jy, jm: bookingJalali.jm, jd: day };
                                    setBookingJalali(newJ);
                                    const g = jalaliToGregorian(newJ.jy, newJ.jm, newJ.jd);
                                    setBookingDate(`${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`);
                                    setSelectedSlot("");
                                  }}
                                  className={`h-9 text-[12px] font-medium rounded-lg mx-0.5 my-0.5 transition-all ${
                                    isPast
                                      ? "text-[#ccc] cursor-not-allowed"
                                      : isSelected
                                      ? "bg-[#7c3aed] text-white shadow-sm"
                                      : isToday
                                      ? "bg-[#7c3aed]/10 text-[#7c3aed] font-bold"
                                      : "text-[#333] active:bg-[#f0f0f0]"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Selected date display */}
                    <div className="mt-2 text-center text-[12px] text-[#666]">
                      {formatJalaliDateFull(bookingJalali.jy, bookingJalali.jm, bookingJalali.jd)}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="mb-4">
                    <p className="text-[11px] font-medium text-[#999] mb-2 uppercase tracking-wider">ساعات موجود</p>
                    {bookingSlots.length === 0 ? (
                      <p className="text-[13px] text-[#999] py-4 text-center">ساعتی موجود نیست</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {bookingSlots.map((slot) => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`py-2 rounded-xl text-[13px] font-medium transition-all ${
                              !slot.available
                                ? "bg-[#f5f5f5] text-[#ccc] cursor-not-allowed"
                                : selectedSlot === slot.time
                                ? "bg-[#7c3aed] text-white shadow-sm"
                                : "bg-[#f0f0f0] text-[#333] active:bg-[#e0e0e0]"
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booking form */}
                  {selectedSlot && (
                    <div className="border-t border-[#f0f0f0] pt-4">
                      <p className="text-[11px] font-medium text-[#999] mb-2 uppercase tracking-wider">اطلاعات شما</p>
                      <input
                        type="text"
                        placeholder="نام و نام خانوادگی"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        className="w-full mb-2 px-3 py-2.5 rounded-xl border border-[#e0e0e0] text-[16px] outline-none focus:border-[#7c3aed] bg-white"
                      />
                      <input
                        type="tel"
                        placeholder="شماره تلفن"
                        dir="ltr"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        className="w-full mb-3 px-3 py-2.5 rounded-xl border border-[#e0e0e0] text-[16px] outline-none focus:border-[#7c3aed] bg-white text-left"
                      />

                      <div className="bg-[#f5f0ff] rounded-xl px-3 py-2 mb-3">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-[#666]">تاریخ:</span>
                          <span className="font-medium text-[#333]">{formatJalaliDateFull(bookingJalali.jy, bookingJalali.jm, bookingJalali.jd)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px] mt-1">
                          <span className="text-[#666]">ساعت:</span>
                          <span className="font-medium text-[#7c3aed]">{selectedSlot}</span>
                        </div>
                      </div>

                      <button
                        onClick={submitBooking}
                        disabled={!bookingName.trim() || !bookingPhone.trim()}
                        className="w-full bg-[#7c3aed] text-white py-3 rounded-xl text-[14px] font-semibold disabled:opacity-30 btn-press"
                      >
                        ثبت نوبت
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SEARCH OVERLAY                                                */}
      {/* ============================================================ */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-[2000] bg-white animate-slide-up flex flex-col">
          {/* Search header */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 pt-[calc(var(--top-safe)+8px)] pb-2 border-b border-[#f0f0f0]">
            <button
              onClick={() => { setShowSearchOverlay(false); setSearchQuery(""); }}
              className="w-10 h-10 rounded-xl bg-[#f5f5f5] flex items-center justify-center text-[#666] btn-press flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="جستجوی مغازه، رستوران، کافه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f5f5f5] rounded-xl px-4 py-2.5 text-[16px] outline-none focus:ring-2 focus:ring-[#fc3f1d]/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#ddd] text-white text-[10px] flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category chips in overlay */}
          <div className="flex-shrink-0 flex gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar border-b border-[#f0f0f0]">
            <button
              onClick={() => setSelectedCategory("")}
              className={`flex-shrink-0 h-[30px] px-3.5 rounded-full text-[12px] font-medium transition-all btn-press ${
                !selectedCategory ? "bg-[#fc3f1d] text-white" : "bg-[#f5f5f5] text-[#666]"
              }`}
            >
              همه
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.name_en ? "" : cat.name_en)}
                className={`flex-shrink-0 h-[30px] px-3.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all btn-press flex items-center gap-1 ${
                  selectedCategory === cat.name_en ? "bg-[#fc3f1d] text-white" : "bg-[#f5f5f5] text-[#666]"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort + filter */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenOnly(!openOnly)}
                className={`flex items-center gap-1.5 h-[28px] px-3 rounded-full text-[11px] font-medium transition-all btn-press ${
                  openOnly ? "bg-[#00b341] text-white" : "bg-[#f5f5f5] text-[#666]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${openOnly ? "bg-white" : "bg-[#00b341]"}`} />
                فقط باز
              </button>
            </div>
            <div className="flex items-center bg-[#f5f5f5] rounded-full p-0.5 h-[28px]">
              <button onClick={() => setSortBy("distance")} className={`px-2.5 h-full rounded-full text-[11px] font-medium transition-all ${sortBy === "distance" ? "bg-white text-[#fc3f1d] shadow-sm" : "text-[#999]"}`}>
                نزدیک‌ترین
              </button>
              <button onClick={() => setSortBy("rating")} className={`px-2.5 h-full rounded-full text-[11px] font-medium transition-all ${sortBy === "rating" ? "bg-white text-[#fc3f1d] shadow-sm" : "text-[#999]"}`}>
                بهترین
              </button>
            </div>
          </div>

          {/* Hint */}
          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <div className="px-4 py-2 text-[11px] text-[#999] text-center bg-[#fafafa]">
              حداقل ۲ حرف تایپ کنید
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-white rounded-xl">
                    <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 rounded skeleton w-3/4" />
                      <div className="h-2.5 rounded skeleton w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedShops.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-[40px] mb-3">🔍</div>
                <p className="text-[14px] text-[#999]">مغازه‌ای یافت نشد</p>
              </div>
            ) : (
              <div className="p-2">
                {sortedShops.map((shop) => {
                  const r = getRatingSummary(shop.id, comments);
                  return (
                    <button
                      key={shop.id}
                      onClick={() => flyToShop(shop)}
                      className="w-full flex gap-3 p-3 rounded-xl active:bg-[#f5f5f5] transition-colors text-right"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#f0f0f0] overflow-hidden flex-shrink-0">
                        <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[14px] font-semibold text-[#1a1a1a] truncate">{shop.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${shop.is_open ? "bg-[#00b341]" : "bg-[#ff4444]"}`} />
                        </div>
                        <p className="text-[11px] text-[#999] mb-1">{shop.category_icon} {shop.category_name}</p>
                        <div className="flex items-center gap-2">
                          {r.count > 0 && (
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] text-[#ffb300]">★</span>
                              <span className="text-[11px] font-medium text-[#f57f17]">{r.avg.toFixed(1)}</span>
                              <span className="text-[10px] text-[#bbb]">({r.count})</span>
                            </div>
                          )}
                          <span className="text-[11px] text-[#bbb]">📍 {formatDistance(shop.distance)}</span>
                        </div>
                      </div>
                      <a
                        href={`tel:${shop.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-xl bg-[#fc3f1d]/10 flex items-center justify-center text-[14px] self-center flex-shrink-0 btn-press"
                      >
                        📞
                      </a>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  BOTTOM BAR (when no shop selected)                            */}
      {/* ============================================================ */}
      {!selectedShop && !showSearchOverlay && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] pb-[var(--bottom-safe)]">
          <div className="px-3 pb-3">
            <button
              onClick={() => setShowSearchOverlay(true)}
              className="w-full bg-white rounded-2xl shadow-[var(--yandex-shadow-lg)] px-4 h-[52px] flex items-center justify-between btn-press"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#fc3f1d]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#fc3f1d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="text-[14px] font-medium text-[#333]">
                  {searchQuery || "جستجوی مغازه..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#f5f5f5] text-[#666] text-[12px] font-semibold px-2.5 py-1 rounded-full">{shops.length}</span>
                <svg className="w-4 h-4 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
