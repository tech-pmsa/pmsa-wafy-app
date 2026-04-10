import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ProfileInfoLine } from "./ProfileInfoLine";
import {
  User,
  Briefcase,
  Home,
  Shield,
  Users as FamilyIcon,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function FamilyDataTab({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <FamilyIcon size={42} color={theme.colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Family Data</Text>
        <Text style={styles.emptyText}>
          Family information has not been added yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <SectionCard title="Parent & Household">
        <ProfileInfoLine icon={User} label="Father's Name" value={data.father_name} />
        <ProfileInfoLine
          icon={Briefcase}
          label="Father's Occupation"
          value={data.father_occupation}
        />
        <ProfileInfoLine
          icon={Home}
          label="Father's Staying Place"
          value={data.father_staying_place}
        />
        <ProfileInfoLine
          icon={Shield}
          label="Father's Responsibilities"
          value={data.father_responsibilities}
          isList
        />
        <ProfileInfoLine icon={User} label="Mother's Name" value={data.mother_name} />
        <ProfileInfoLine
          icon={Briefcase}
          label="Mother's Occupation"
          value={data.mother_occupation}
        />
        <ProfileInfoLine
          icon={FamilyIcon}
          label="Total Family Members"
          value={data.total_family_members?.toString()}
        />
        <ProfileInfoLine
          icon={Home}
          label="House Type"
          value={data.house_type}
        />
        <ProfileInfoLine
          icon={Shield}
          label="Chronically Ill Members"
          value={
            typeof data.chronically_ill_members === "boolean"
              ? data.chronically_ill_members
                ? "Yes"
                : "No"
              : data.chronically_ill_members
          }
        />
      </SectionCard>

      <SectionCard title="Brothers">
        {data.brothers && data.brothers.length > 0 ? (
          data.brothers.map((bro: any, i: number) => (
            <View key={i} style={styles.siblingCard}>
              <Text style={styles.siblingName}>{bro.name || "Unnamed"}</Text>

              <Text style={styles.siblingLine}>
                <Text style={styles.siblingLabel}>Education: </Text>
                {(bro.education || []).join(", ") || "N/A"}
              </Text>

              <Text style={styles.siblingLine}>
                <Text style={styles.siblingLabel}>Occupation: </Text>
                {bro.occupation || "N/A"}
              </Text>

              <Text style={styles.siblingLine}>
                <Text style={styles.siblingLabel}>Responsibilities: </Text>
                {(bro.responsibilities || []).join(", ") || "N/A"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyInlineText}>No brothers added.</Text>
        )}
      </SectionCard>

      <SectionCard title="Sisters">
        {data.sisters && data.sisters.length > 0 ? (
          data.sisters.map((sis: any, i: number) => (
            <View key={i} style={styles.siblingCard}>
              <Text style={styles.siblingName}>{sis.name || "Unnamed"}</Text>

              <Text style={styles.siblingLine}>
                <Text style={styles.siblingLabel}>Education: </Text>
                {(sis.education || []).join(", ") || "N/A"}
              </Text>

              <Text style={styles.siblingLine}>
                <Text style={styles.siblingLabel}>Occupation: </Text>
                {sis.occupation || "N/A"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyInlineText}>No sisters added.</Text>
        )}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    marginBottom: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSoft,
  },
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  siblingCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  siblingName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  siblingLine: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
    marginBottom: 4,
  },
  siblingLabel: {
    color: theme.colors.text,
    fontFamily: "MullerBold",
  },
  emptyInlineText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textAlign: "center",
    paddingVertical: 8,
  },
});