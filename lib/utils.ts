import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}
export function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-PK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatCurrency(n: number) {
  return `PKR ${n.toLocaleString('en-PK')}`;
}
export function generateReceiptNumber() {
  return `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}
export function generateCertNumber() {
  return `DC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}
