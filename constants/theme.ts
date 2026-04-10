import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

export const COLORS = {
  primary: colors.primary,
  secondary: colors.secondary,
  accent: colors.accent,

  background: colors.background,
  surface: colors.surface,
  surfaceSoft: colors.surfaceSoft,

  textPrimary: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,

  border: colors.border,

  success: colors.success,
  warning: colors.warning,
  danger: colors.error,

  primaryLight: colors.primaryTint,
  dangerLight: colors.errorSoft,
};

export const RADIUS = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
};

export const SPACING = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  "2xl": spacing.xxl,
  "3xl": spacing.xxxl,
};