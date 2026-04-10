import React from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { theme } from "@/theme/theme";

type Props = {
  direction: "up" | "down";
  onPress: () => void;
  style?: ViewStyle;
};

export default function FloatingScrollToggle({
  direction,
  onPress,
  style,
}: Props) {
  const isUp = direction === "up";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.button, style]}
    >
      {isUp ? (
        <ArrowUp size={22} color={theme.colors.textOnDark} />
      ) : (
        <ArrowDown size={22} color={theme.colors.textOnDark} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 18,
    bottom: 22,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    ...theme.shadows.floating,
    zIndex: 50,
    elevation: 12,
  },
});