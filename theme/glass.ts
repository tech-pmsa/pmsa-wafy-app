import { colors } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";

export const glassStyles = {
  panel: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden" as const,
    ...shadows.medium,
  },
  softPanel: {
    backgroundColor: colors.glass,
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderRadius: radius.md,
    ...shadows.soft,
  },
};