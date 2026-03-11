import React from 'react';
import { View, Text } from 'react-native';
import { ProfileInfoLine } from './ProfileInfoLine';
import {
  User,
  Briefcase,
  Home,
  Shield,
  Users as FamilyIcon,
} from 'lucide-react-native';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export function FamilyDataTab({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <View className="items-center justify-center p-8 bg-[#F8FAFC] rounded-[16px] border border-dashed border-[#E2E8F0] h-64">
        <FamilyIcon size={48} color="#94A3B8" />
        <Text className="mt-5 font-muller-bold text-[#0F172A] text-lg tracking-tight">No Family Data</Text>
        <Text className="text-[14px] text-[#475569] font-muller mt-1.5 text-center">
          Family information has not been added yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View
        className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
        style={cardShadow()}
      >
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mb-5">
          Parent & Household
        </Text>

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
          label="Father's Public Responsibilities"
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
        <ProfileInfoLine icon={Home} label="House Type" value={data.house_type} />
        <ProfileInfoLine
          icon={FamilyIcon}
          label="Chronically Ill Members"
          value={data.chronically_ill_members ? 'Yes' : 'No'}
        />
      </View>

      <View
        className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mb-5">
          Sibling Information
        </Text>

        <Text className="font-muller-bold text-lg text-[#0F172A] tracking-tight mb-4">Brothers</Text>

        {data.brothers && data.brothers.length > 0 ? (
          data.brothers.map((bro: any, i: number) => (
            <View
              key={i}
              className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] mb-3.5"
            >
              <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-3">
                {bro.name}
              </Text>

              <Text className="text-[13px] font-muller text-[#475569] mb-1.5 leading-relaxed">
                <Text className="font-muller-bold text-[#0F172A]">Education: </Text>
                {(bro.education || []).join(', ') || 'N/A'}
              </Text>

              <Text className="text-[13px] font-muller text-[#475569] mb-1.5 leading-relaxed">
                <Text className="font-muller-bold text-[#0F172A]">Occupation: </Text>
                {bro.occupation || 'N/A'}
              </Text>

              <Text className="text-[13px] font-muller text-[#475569] leading-relaxed">
                <Text className="font-muller-bold text-[#0F172A]">Responsibilities: </Text>
                {(bro.responsibilities || []).join(', ') || 'N/A'}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-[13px] font-muller text-[#94A3B8] mb-5">No brothers added.</Text>
        )}

        <Text className="font-muller-bold text-lg text-[#0F172A] tracking-tight mb-4 mt-5 border-t border-[#E2E8F0] pt-5">
          Sisters
        </Text>

        {data.sisters && data.sisters.length > 0 ? (
          data.sisters.map((sis: any, i: number) => (
            <View
              key={i}
              className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] mb-3.5"
            >
              <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-3">
                {sis.name}
              </Text>

              <Text className="text-[13px] font-muller text-[#475569] mb-1.5 leading-relaxed">
                <Text className="font-muller-bold text-[#0F172A]">Education: </Text>
                {(sis.education || []).join(', ') || 'N/A'}
              </Text>

              <Text className="text-[13px] font-muller text-[#475569] leading-relaxed">
                <Text className="font-muller-bold text-[#0F172A]">Occupation: </Text>
                {sis.occupation || 'N/A'}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-[13px] font-muller text-[#94A3B8] mb-2">No sisters added.</Text>
        )}
      </View>
    </View>
  );
}