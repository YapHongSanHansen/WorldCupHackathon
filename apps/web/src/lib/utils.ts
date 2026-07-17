import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function fmtClock(seconds: number | null): string {
  if (seconds == null) return "--'--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtWcdt(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} WCDT`;
}

export function fakeTxHash(): string {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 64; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}
