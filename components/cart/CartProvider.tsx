"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  productId: string;
  name: string;
  hargaJual: number;
  hargaMinimum: number;
  /** Optional — custom items have no real "recommended" price. Powers the Pakai Minimum/Rekomendasi shortcut buttons in ItemRowEditor. */
  hargaRekomendasi?: number;
  komisiNominal: number;
  stok: number;
  qty: number;
  diskonPerUnit: number;
  fotoUrl?: string;
  isCustom?: boolean;
  /** Product condition, used for the live commission preview (see lib/commission.ts). */
  kondisi?: "baru" | "bekas";
  /** Was this line added while the product's Flash Sale was active — see ProductCard.tsx. Per the user's request 2026-08-29. */
  isFlashSale?: boolean;
  /** Snapshot fields captured at add-to-cart time, used for the printable catalog PDF. */
  kondisiLabel?: string;
  stockStatusLabel?: string;
  specsText?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty" | "diskonPerUnit">, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateItem: (productId: string, patch: Partial<Pick<CartItem, "hargaJual" | "diskonPerUnit" | "qty">>) => void;
  clear: () => void;
  /** Wholesale-replaces the cart — used to pre-load an existing invoice's items when editing it. */
  loadItems: (items: CartItem[]) => void;
  count: number;
  totalEstimate: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "horeca-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "qty" | "diskonPerUnit">, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) => (i.productId === item.productId ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { ...item, qty, diskonPerUnit: 0 }];
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i)));
  }

  function updateItem(productId: string, patch: Partial<Pick<CartItem, "hargaJual" | "diskonPerUnit" | "qty">>) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  }

  function clear() {
    setItems([]);
  }

  function loadItems(newItems: CartItem[]) {
    setItems(newItems);
  }

  const count = items.reduce((s, i) => s + i.qty, 0);
  const totalEstimate = items.reduce((s, i) => s + (i.hargaJual - (i.diskonPerUnit ?? 0)) * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, updateItem, clear, loadItems, count, totalEstimate }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
