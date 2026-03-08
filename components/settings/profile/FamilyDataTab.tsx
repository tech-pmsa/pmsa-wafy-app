import React from 'react';
import { View, Text } from 'react-native';
import { ProfileInfoLine } from './ProfileInfoLine';
import { User, Briefcase, Home, Shield, Users as FamilyIcon } from 'lucide-react-native';

export function FamilyDataTab({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <View className="items-center justify-center p-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 h-64">
        <FamilyIcon size={48} color="#a1a1aa" />
        <Text className="mt-4 font-bold text-zinc-700 text-lg">No Family Data</Text>
        <Text className="text-sm text-zinc-500 text-center">Family information has not been added yet.</Text>
      </View>
    );
  }

  return (
    <View className="space-y-6">
      <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
        <Text className="text-xl font-bold text-zinc-900 mb-4">Parent & Household</Text>
        <ProfileInfoLine icon={User} label="Father's Name" value={data.father_name} />
        <ProfileInfoLine icon={Briefcase} label="Father's Occupation" value={data.father_occupation} />
        <ProfileInfoLine icon={Home} label="Father's Staying Place" value={data.father_staying_place} />
        <ProfileInfoLine icon={Shield} label="Father's Public Responsibilities" value={data.father_responsibilities} isList />
        <ProfileInfoLine icon={User} label="Mother's Name" value={data.mother_name} />
        <ProfileInfoLine icon={Briefcase} label="Mother's Occupation" value={data.mother_occupation} />
        <ProfileInfoLine icon={FamilyIcon} label="Total Family Members" value={data.total_family_members?.toString()} />
        <ProfileInfoLine icon={Home} label="House Type" value={data.house_type} />
        <ProfileInfoLine icon={FamilyIcon} label="Chronically Ill Members" value={data.chronically_ill_members ? 'Yes' : 'No'} />
      </View>

      <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
        <Text className="text-xl font-bold text-zinc-900 mb-4">Sibling Information</Text>

        <Text className="font-bold text-lg text-zinc-700 mb-3">Brothers</Text>
        {data.brothers && data.brothers.length > 0 ? (
          data.brothers.map((bro: any, i: number) => (
            <View key={i} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-3">
              <Text className="font-bold text-zinc-900 text-base mb-2">{bro.name}</Text>
              <Text className="text-sm text-zinc-600"><Text className="font-bold">Education:</Text> {(bro.education || []).join(', ') || 'N/A'}</Text>
              <Text className="text-sm text-zinc-600"><Text className="font-bold">Occupation:</Text> {bro.occupation || 'N/A'}</Text>
              <Text className="text-sm text-zinc-600"><Text className="font-bold">Responsibilities:</Text> {(bro.responsibilities || []).join(', ') || 'N/A'}</Text>
            </View>
          ))
        ) : <Text className="text-sm text-zinc-500 mb-4">No brothers added.</Text>}

        <Text className="font-bold text-lg text-zinc-700 mb-3 mt-4 border-t border-zinc-100 pt-4">Sisters</Text>
        {data.sisters && data.sisters.length > 0 ? (
          data.sisters.map((sis: any, i: number) => (
            <View key={i} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-3">
              <Text className="font-bold text-zinc-900 text-base mb-2">{sis.name}</Text>
              <Text className="text-sm text-zinc-600"><Text className="font-bold">Education:</Text> {(sis.education || []).join(', ') || 'N/A'}</Text>
              <Text className="text-sm text-zinc-600"><Text className="font-bold">Occupation:</Text> {sis.occupation || 'N/A'}</Text>
            </View>
          ))
        ) : <Text className="text-sm text-zinc-500 mb-4">No sisters added.</Text>}
      </View>
    </View>
  );
}