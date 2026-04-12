/**
 * En desarrollo, las llamadas a /api se proxean por Vite a localhost:4000.
 * En producción (Vercel), VITE_API_URL apunta al backend en Render.
 *
 * Uso: import { apiUrl } from "../lib/api";
 *      fetch(apiUrl("/api/auth/login"), { ... })
 */

const BASE = import.meta.env.VITE_API_URL || "";

export function apiUrl(path) {
    return `${BASE}${path}`;
}
