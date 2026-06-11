"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Dynamic import for Leaflet — only on client
let L: typeof import("leaflet") | null = null;
async function getLeaflet() {
  if (!L) {
    L = await import("leaflet");
    await import("leaflet/dist/leaflet.css").catch(() => {});
  }
  return L;
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
  rating: number;       // 1-5
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
  { id: "c2", shopId: 1, author: "مررضی احمدی", text: "سرویس خوبی دارن ولی کمی طول می‌کشه.", rating: 4, createdAt: "2026-06-07T14:00:00" },
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
/*  Star rating component                                              */
/* ------------------------------------------------------------------ */

function StarRating({
  value,
  onChange,
  size = "md",
  interactive = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const px = size === "sm" ? 14 : size === "lg" ? 28 : 18;

  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`transition-transform ${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
          style={{ width: px, height: px }}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <svg viewBox="0 0 24 24" width={px} height={px}>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={star <= (hover || value) ? "#f59e0b" : "#e5e7eb"}
              stroke={star <= (hover || value) ? "#f59e0b" : "#d1d5db"}
              strokeWidth="1"
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
  const [listOpen, setListOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(defaultComments);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newAuthor, setNewAuthor] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showBottomSearch, setShowBottomSearch] = useState(false);

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const leafletLoaded = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ---- Load comments from localStorage ---- */
  useEffect(() => {
    setComments(loadComments());
  }, []);

  /* ---- Load Leaflet CSS from npm ---- */
  useEffect(() => {
    if (leafletLoaded.current) return;
    leafletLoaded.current = true;
    import("leaflet/dist/leaflet.css").catch(() => {/* fallback to CDN */}
    );
  }, []);

  /* ---- Debounce search ---- */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---- Init map ---- */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const loadMap = async () => {
      const leaflet = await getLeaflet();
      const map = leaflet.map(mapContainerRef.current!, {
        center: TEHRAN,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
        .addTo(map);
      leaflet.control.zoom({ position: "bottomleft" }).addTo(map);
      mapRef.current = map;
      map.on("click", () => setSelectedShop(null));
    };
    loadMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /* ---- Fetch categories ---- */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { /* ignore */ }
  }, []);

  /* ---- Fetch shops ---- */
  const fetchShops = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        lat: String(TEHRAN[0]),
        lng: String(TEHRAN[1]),
        radius: "15000",
      });
      if (selectedCategory) params.set("category", selectedCategory);
      if (openOnly) params.set("open", "true");
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res = await fetch(`/api/shops?${params}`);
      const data = await res.json();
      setShops(data.shops || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, openOnly, debouncedQuery]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchShops(); }, [fetchShops]);

  /* ---- Update markers ---- */
  useEffect(() => {
    if (!mapRef.current) return;
    getLeaflet().then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      shops.forEach((shop) => {
        const rating = getRatingSummary(shop.id, comments);
        const color = shop.is_open ? "#16a34a" : "#dc2626";
        const stars = rating.avg > 0 ? "★".repeat(Math.round(rating.avg)) : "";
        const icon = L.divIcon({
          html: `<div style="
            position:relative;width:38px;height:38px;
            background:${color};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
            font-size:15px;border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          ">${shop.category_icon}</div>
          ${stars ? `<div style="
            position:absolute;top:-8px;left:-8px;
            background:#f59e0b;color:white;font-size:9px;
            border-radius:8px;padding:1px 4px;
            box-shadow:0 1px 3px rgba(0,0,0,0.2);
          ">${stars}</div>` : ""}`,
          className: "custom-marker",
          iconSize: [38, 38],
          iconAnchor: [19, 38],
        });
        const marker = L.marker([shop.latitude, shop.longitude], { icon })
          .addTo(mapRef.current)
          .on("click", () => {
            setSelectedShop(shop);
            setShowComments(false);
          });
        markersRef.current.push(marker);
      });
    });
  }, [shops, comments]);

  /* ---- Sort shops ---- */
  const sortedShops = [...shops].sort((a, b) => {
    if (sortBy === "rating") {
      const ra = getRatingSummary(a.id, comments).avg;
      const rb = getRatingSummary(b.id, comments).avg;
      return rb - ra;
    }
    return a.distance - b.distance;
  });

  /* ---- Submit comment ---- */
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

  /* ---- Fly to shop ---- */
  function flyToShop(shop: Shop) {
    if (mapRef.current) {
      mapRef.current.flyTo([shop.latitude, shop.longitude], 15, { duration: 0.5 });
    }
    setSelectedShop(shop);
    setShowComments(false);
    setListOpen(false);
  }

  const openShops = shops.filter((s) => s.is_open).length;

  /* ---- Autocomplete: show suggestions after 3 chars ---- */
  const suggestions = searchQuery.trim().length >= 3
    ? shops.filter((s) => s.name.includes(searchQuery.trim())).slice(0, 6)
    : [];

  /* ---- Blur overlay when panel is open ---- */
  const isPanelOpen = selectedShop !== null || showBottomSearch;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="h-full w-full relative overflow-hidden bg-gray-100" dir="rtl">

      {/* ============ MAP ============ */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ============ BLUR OVERLAY ============ */}
      {isPanelOpen && (
        <div
          className="absolute inset-0 z-[999] bg-black/30 backdrop-blur-sm transition-all duration-300"
          onClick={() => { setSelectedShop(null); setShowBottomSearch(false); }}
        />
      )}

      {/* ============ TOP BAR (Yandex style) ============ */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 pt-2 space-y-2">

        {/* Search bar — Yandex style rounded */}
        <div className="relative bg-white rounded-2xl shadow-lg flex items-center gap-2 px-4 py-3">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="جستجوی مغازه، رستوران، کافه..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowAutocomplete(true); }}
            onFocus={() => setShowAutocomplete(true)}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            className="flex-1 text-sm border-none outline-none text-gray-800 placeholder-gray-400 bg-transparent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center">✕</button>
          )}

          {/* Autocomplete dropdown */}
          {showAutocomplete && suggestions.length > 0 && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-xl overflow-hidden z-50">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 active:bg-blue-100 transition-colors text-right"
                  onMouseDown={(e) => { e.preventDefault(); flyToShop(s); setShowAutocomplete(false); }}
                >
                  <span className="text-base">{s.category_icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate block">{s.name}</span>
                    <span className="text-xs text-gray-400">{s.category_name}</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_open ? "bg-green-500" : "bg-red-500"}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category chips — Yandex style horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory("")}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              !selectedCategory ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-600 shadow-sm"
            }`}
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.name_en ? "" : cat.name_en)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.name_en ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Filter bar — Yandex style */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-white rounded-full shadow-sm px-3 py-1.5 text-xs text-gray-500">
              {loading ? "..." : `${shops.length} مغازه`}
            </span>
            <button
              onClick={() => setOpenOnly(!openOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${
                openOnly ? "bg-green-500 text-white" : "bg-white text-gray-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${openOnly ? "bg-white" : "bg-green-500"}`} />
              باز ({openShops})
            </button>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-full shadow-sm p-0.5">
            <button
              onClick={() => setSortBy("distance")}
              className={`px-3 py-1 rounded-full text-xs transition-all ${sortBy === "distance" ? "bg-blue-600 text-white" : "text-gray-500"}`}
            >
              نزدیک‌ترین
            </button>
            <button
              onClick={() => setSortBy("rating")}
              className={`px-3 py-1 rounded-full text-xs transition-all ${sortBy === "rating" ? "bg-blue-600 text-white" : "text-gray-500"}`}
            >
              بهترین امتیاز
            </button>
          </div>
        </div>
      </div>

      {/* ============ LOCATION BUTTON ============ */}
      <button
        onClick={() => {
          navigator.geolocation?.getCurrentPosition((pos) => {
            mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14);
          });
        }}
        className="absolute bottom-[160px] left-3 z-[1000] w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-xl active:scale-95 transition-transform"
      >
        📍
      </button>

      {/* ============ BOTTOM SHEET: Selected shop ============ */}
      {selectedShop && !showComments && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
          <div className="bg-white rounded-t-3xl shadow-[0_-4px_30px_rgba(0,0,0,0.15)] max-h-[75vh] overflow-y-auto">

            {/* Handle + close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
              <button onClick={() => setSelectedShop(null)} className="absolute left-4 top-2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">✕</button>
            </div>

            {/* Image */}
            <div className="relative mx-4 h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl overflow-hidden mb-4">
              <img
                src={selectedShop.image_url}
                alt={selectedShop.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedShop.is_open ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                  {selectedShop.is_open ? "باز" : "بسته"}
                </span>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs">
                  {selectedShop.category_icon} {selectedShop.category_name}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="px-4 pb-2">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{selectedShop.name}</h2>
              <p className="text-sm text-gray-500 mb-3">{selectedShop.description}</p>

              {/* Rating summary */}
              {(() => {
                const r = getRatingSummary(selectedShop.id, comments);
                return (
                  <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-xl px-3 py-2">
                    <StarRating value={Math.round(r.avg)} size="sm" />
                    <span className="text-sm font-bold text-amber-700">{r.avg > 0 ? r.avg.toFixed(1) : "بدون امتیاز"}</span>
                    <span className="text-xs text-amber-600">({r.count} نظر)</span>
                    <button
                      onClick={() => setShowComments(true)}
                      className="mr-auto text-xs text-blue-600 font-medium"
                    >
                      مشاهده نظرات ←
                    </button>
                  </div>
                );
              })()}

              {/* Details */}
              <div className="text-sm text-gray-500 space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span>{selectedShop.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📞</span>
                  <span dir="ltr" className="text-blue-600">{selectedShop.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📏</span>
                  <span>{formatDistance(selectedShop.distance)}</span>
                </div>
              </div>

              {/* Action buttons — Yandex style */}
              <div className="flex gap-2 mb-4">
                <a
                  href={`tel:${selectedShop.phone}`}
                  className="flex-1 bg-blue-600 text-white text-center py-3 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
                >
                  📞 تماس
                </a>
                <a
                  href={`https://www.google.com/maps?q=${selectedShop.latitude},${selectedShop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
                >
                  🗺️ مسیریابی
                </a>
              </div>

              {/* Quick comment teaser */}
              {(() => {
                const shopComments = comments.filter((c) => c.shopId === selectedShop.id).slice(0, 2);
                if (shopComments.length === 0) return null;
                return (
                  <div className="border-t border-gray-100 pt-3 mb-3">
                    <p className="text-xs text-gray-400 mb-2">آخرین نظرات:</p>
                    {shopComments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-xl p-2.5 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{c.author}</span>
                          <StarRating value={c.rating} size="sm" />
                        </div>
                        <p className="text-xs text-gray-500">{c.text}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ============ COMMENTS PANEL ============ */}
      {selectedShop && showComments && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
          <div className="bg-white rounded-t-3xl shadow-[0_-4px_30px_rgba(0,0,0,0.15)] max-h-[80vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white px-4 pt-3 pb-2 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between">
                <button onClick={() => setShowComments(false)} className="text-blue-600 text-sm font-medium">
                  → بازگشت
                </button>
                <h3 className="text-sm font-bold text-gray-800">نظرات {selectedShop.name}</h3>
                <div className="w-12" />
              </div>
              {(() => {
                const r = getRatingSummary(selectedShop.id, comments);
                return (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold text-amber-600">{r.avg > 0 ? r.avg.toFixed(1) : "—"}</span>
                    <StarRating value={Math.round(r.avg)} size="md" />
                    <span className="text-xs text-gray-400">({r.count} نظر)</span>
                  </div>
                );
              })()}
            </div>

            {/* New comment form */}
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50">
              <p className="text-xs font-medium text-gray-600 mb-2">نظر خود را بنویسید:</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">امتیاز:</span>
                <StarRating value={newRating} onChange={setNewRating} size="md" interactive />
              </div>
              <input
                type="text"
                placeholder="نام شما"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                className="w-full mb-2 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
              />
              <textarea
                placeholder="تجربه خود را بنویسید..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none bg-white"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || !newAuthor.trim()}
                className="mt-2 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              >
                ثبت نظر
              </button>
            </div>

            {/* Comments list */}
            <div className="px-4 py-3">
              {comments.filter((c) => c.shopId === selectedShop.id).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  هنوز نظری ثبت نشده. اولین نفر باشید!
                </div>
              ) : (
                comments
                  .filter((c) => c.shopId === selectedShop.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => (
                    <div key={c.id} className="py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {c.author.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{c.author}</span>
                        </div>
                        <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                      </div>
                      <div className="mr-10">
                        <StarRating value={c.rating} size="sm" />
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ BOTTOM SEARCH + LIST (Yandex style with blur) ============ */}
      {!selectedShop && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000]">
          {/* Search bar at bottom */}
          <div className="px-3 pb-2">
            <div
              className="bg-white rounded-2xl shadow-lg flex items-center gap-2 px-4 py-3 active:scale-[0.98] transition-transform cursor-pointer"
              onClick={() => setShowBottomSearch(true)}
            >
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="flex-1 text-sm text-gray-400">{searchQuery || "جستجوی مغازه..."}</span>
              <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{shops.length}</span>
            </div>
          </div>

          {/* Full-screen search overlay with blur */}
          {showBottomSearch && (
            <div className="fixed inset-0 z-[2000] animate-slide-up">
              <div className="bg-white h-full flex flex-col">
                {/* Search header */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                  <button onClick={() => setShowBottomSearch(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="جستجوی مغازه، رستوران، کافه..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center">✕</button>
                    )}
                  </div>
                </div>

                {/* Category chips */}
                <div className="flex gap-2 px-3 py-2 overflow-x-auto no-scrollbar border-b border-gray-50">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedCategory ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    همه
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name_en ? "" : cat.name_en)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat.name_en ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>

                {/* Sort + filter bar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
                  <button
                    onClick={() => setOpenOnly(!openOnly)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${openOnly ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${openOnly ? "bg-white" : "bg-green-500"}`} />
                    باز ({openShops})
                  </button>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
                    <button onClick={() => setSortBy("distance")} className={`px-3 py-1 rounded-full text-xs transition-all ${sortBy === "distance" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>نزدیک‌ترین</button>
                    <button onClick={() => setSortBy("rating")} className={`px-3 py-1 rounded-full text-xs transition-all ${sortBy === "rating" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>بهترین امتیاز</button>
                  </div>
                </div>

                {/* Autocomplete hint */}
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
                  <div className="px-4 py-2 text-xs text-gray-400 text-center bg-gray-50">حداقل ۳ حرف برای جستجو تایپ کنید</div>
                )}

                {/* Results list */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-3 flex gap-3 border-b border-gray-50">
                        <div className="w-14 h-14 rounded-xl skeleton flex-shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3.5 rounded skeleton w-3/4" />
                          <div className="h-2.5 rounded skeleton w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : sortedShops.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">مغازه‌ای یافت نشد</div>
                  ) : (
                    sortedShops.map((shop) => {
                      const r = getRatingSummary(shop.id, comments);
                      return (
                        <div
                          key={shop.id}
                          onClick={() => flyToShop(shop)}
                          className="p-3 flex gap-3 border-b border-gray-50 active:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                            <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900 truncate">{shop.name}</span>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${shop.is_open ? "bg-green-500" : "bg-red-500"}`} />
                            </div>
                            <p className="text-xs text-gray-400 mb-1">{shop.category_icon} {shop.category_name}</p>
                            <div className="flex items-center gap-2">
                              {r.count > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">★</span>
                                  <span className="text-xs font-medium text-amber-600">{r.avg.toFixed(1)}</span>
                                  <span className="text-xs text-gray-400">({r.count})</span>
                                </div>
                              )}
                              <span className="text-xs text-gray-400">📍 {formatDistance(shop.distance)}</span>
                            </div>
                          </div>
                          <a
                            href={`tel:${shop.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm self-center"
                          >
                            📞
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compact list toggle (only when bottom search is closed) */}
          {!showBottomSearch && (
            <div className="px-3 pb-4">
              <button
                onClick={() => setListOpen(!listOpen)}
                className="w-full bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <span className="text-sm font-medium text-gray-700">لیست مغازه‌ها</span>
                  <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{shops.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${listOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>

              {listOpen && (
                <div className="mt-2 bg-white rounded-2xl shadow-lg max-h-[45vh] overflow-y-auto">
                  {sortedShops.map((shop) => {
                    const r = getRatingSummary(shop.id, comments);
                    return (
                      <div key={shop.id} onClick={() => flyToShop(shop)} className="p-3 flex gap-3 border-b border-gray-50 active:bg-gray-50 cursor-pointer transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                          <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900 truncate">{shop.name}</span>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${shop.is_open ? "bg-green-500" : "bg-red-500"}`} />
                          </div>
                          <div className="flex items-center gap-2">
                            {r.count > 0 && <span className="text-xs font-medium text-amber-600">★ {r.avg.toFixed(1)}</span>}
                            <span className="text-xs text-gray-400">📍 {formatDistance(shop.distance)}</span>
                          </div>
                        </div>
                        <a href={`tel:${shop.phone}`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm self-center">📞</a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
