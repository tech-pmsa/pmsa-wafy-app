/**
 * Core Design System Tokens for PMSA Wafy College App
 * Use these constants when inline Tailwind classes aren't sufficient,
 * or when passing color values directly to native components (like Lucide icons).
 */

export const COLORS = {
  // Brand
  primary: '#1E40AF',
  secondary: '#0F766E',
  accent: '#F59E0B',

  // Layout & Surfaces
  background: '#F8FAFC',     // App shell, screens
  surface: '#FFFFFF',        // Cards, primary drawer content
  surfaceSoft: '#F1F5F9',    // Secondary cards, nested areas

  // Typography
  textPrimary: '#0F172A',    // Headings, primary content
  textSecondary: '#475569',  // Subtitles, metadata
  textMuted: '#94A3B8',      // Inactive states, placeholders

  // Structural
  border: '#E2E8F0',

  // Status
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',

  // Opacity Overlays (Often used for active states or soft buttons)
  primaryLight: 'rgba(30, 64, 175, 0.1)', // bg-[#1E40AF]/10
  dangerLight: 'rgba(220, 38, 38, 0.1)',  // bg-[#DC2626]/10
};

export const RADIUS = {
  sm: 12, // Avatars, small badges
  md: 14, // Buttons, interactive items
  lg: 16, // Soft nested blocks
  xl: 18, // Main structural cards
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};