import { colors } from "./colors";
import { radius } from "./radius";

export const neumorphismStyles = {
  soft: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: -3, height: -3 },
    elevation: 2,
  },
};