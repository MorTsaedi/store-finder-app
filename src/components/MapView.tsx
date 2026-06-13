"use client";

import { useEffect, useRef, useState } from "react";

const TEHRAN: [number, number] = [35.6892, 51.389];

interface Props {
  onShopClick: (lat: number, lng: number) => void;
  onMapClick: () => void;
  shops: any[];
  comments: any[];
  selectedShop: any;
}

export default function MapView({ onShopClick, onMapClick, shops, comments, selectedShop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import("leaflet");
        const L = (mod as any).default || mod;
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          center: TEHRAN,
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        mapRef.current = map;
        map.on("click", () => onMapClick());

        setTimeout(() => map.invalidateSize(), 300);
      } catch (err) {
        console.error("Map init error:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mounted]);

  useEffect(() => {
    if (!mapRef.current) return;

    (async () => {
      try {
        const mod = await import("leaflet");
        const L = (mod as any).default || mod;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        function getRatingSummary(shopId: number) {
          const shopComments = comments.filter((c: any) => c.shopId === shopId);
          if (shopComments.length === 0) return { avg: 0, count: 0 };
          const sum = shopComments.reduce((a: number, c: any) => a + c.rating, 0);
          return { avg: sum / shopComments.length, count: shopComments.length };
        }

        shops.forEach((shop: any) => {
          const rating = getRatingSummary(shop.id);
          const isOpen = shop.is_open;
          const icon = L.divIcon({
            html: `
              <div style="position:relative;width:40px;height:40px;cursor:pointer;">
                <div style="
                  width:40px;height:40px;
                  background:${isOpen ? '#00b341' : '#ff4444'};
                  border-radius:50% 50% 50% 4px;
                  transform:rotate(-45deg);
                  display:flex;align-items:center;justify-content:center;
                  border:3px solid white;
                  box-shadow:0 2px 8px rgba(0,0,0,0.25);
                ">
                  <span style="transform:rotate(45deg);font-size:16px;">${shop.category_icon}</span>
                </div>
                ${rating.avg > 0 ? `
                  <div style="
                    position:absolute;top:-4px;right:-4px;
                    background:#1a1a1a;color:white;font-size:10px;font-weight:600;
                    border-radius:10px;padding:1px 5px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.2);
                    white-space:nowrap;
                    display:flex;align-items:center;gap:2px;
                  ">
                    <span style="color:#ffb300;">&#9733;</span>${rating.avg.toFixed(1)}
                  </div>
                ` : ''}
              </div>
            `,
            className: "custom-marker",
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          });
          const marker = L.marker([shop.latitude, shop.longitude], { icon })
            .addTo(mapRef.current)
            .on("click", () => onShopClick(shop.latitude, shop.longitude));
          markersRef.current.push(marker);
        });
      } catch (err) {
        console.error("Marker update error:", err);
      }
    })();
  }, [shops, comments]);

  useEffect(() => {
    if (!mapRef.current || !selectedShop) return;
    mapRef.current.flyTo([selectedShop.latitude, selectedShop.longitude], 16, { duration: 0.6 });
  }, [selectedShop]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    />
  );
}
