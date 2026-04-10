import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/theme/theme";

export function ProfileInfoLine({
  icon: Icon,
  label,
  value,
  isList = false,
}: any) {
  const hasValue = Array.isArray(value) ? value.length > 0 : !!value;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon size={18} color={theme.colors.textMuted} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>

        {isList && Array.isArray(value) && value.length > 0 ? (
          <View style={styles.listWrap}>
            {value.map((item: string, index: number) => (
              <Text key={`${item}-${index}`} style={styles.listItem}>
                • {item}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={[styles.value, !hasValue && styles.valueMuted]}>
            {hasValue ? String(value) : "Not Provided"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
    marginBottom: 4,
  },
  value: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  valueMuted: {
    color: theme.colors.textSecondary,
    fontFamily: "MullerMedium",
  },
  listWrap: {
    gap: 5,
  },
  listItem: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
});