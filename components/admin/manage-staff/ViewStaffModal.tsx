import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { User, Shield, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

export function ViewStaffModal({ isOpen, setIsOpen, staff }: any) {
  const [councilDetails, setCouncilDetails] = useState<any | null>(null);
  const [isLoadingCouncil, setIsLoadingCouncil] = useState(false);

  useEffect(() => {
    const handleViewClick = async () => {
      if (!staff) return;
      setCouncilDetails(null);
      if (staff.designation?.endsWith(' Class')) {
        setIsLoadingCouncil(true);
        try {
          const { data, error } = await supabase.from('class_council').select('*').eq('uid', staff.uid).single();
          if (data) setCouncilDetails(data);
        } catch (err: any) {
          console.error(err);
        } finally {
          setIsLoadingCouncil(false);
        }
      }
    };
    if (isOpen) handleViewClick();
  }, [staff, isOpen]);

  if (!staff) return null;

  const councilMembers = [
    { role: 'President', name: councilDetails?.president }, { role: 'Secretary', name: councilDetails?.secretary },
    { role: 'Treasurer', name: councilDetails?.treasurer }, { role: 'Auditor', name: councilDetails?.auditor },
    { role: 'Vice President', name: councilDetails?.vicepresident }, { role: 'Joint Secretary', name: councilDetails?.jointsecretary },
    { role: 'PRO', name: councilDetails?.pro },
  ];

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
      <View className="flex-1 bg-[#F8FAFC] pt-6 px-5">

        <View className="flex-row justify-end mb-4">
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            activeOpacity={0.7}
          >
            <X size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View className="items-center mb-8">
          <View className="h-28 w-28 rounded-full border-4 border-[#FFFFFF] shadow-sm overflow-hidden bg-[#F1F5F9] justify-center items-center">
            {staff.img_url ? (
              <Image source={{ uri: staff.img_url }} className="h-full w-full" />
            ) : (
              <User size={44} color="#94A3B8" />
            )}
          </View>
          <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight mt-4">{staff.name}</Text>
          <Text className="text-[15px] font-muller text-[#475569] mt-1">{staff.designation || staff.role}</Text>
        </View>

        {staff.designation?.endsWith(' Class') && (
          <View className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]">
            <View className="flex-row items-center mb-5 border-b border-[#E2E8F0] pb-4">
              <Shield size={20} color={COLORS.primary} />
              <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight ml-2.5">
                Class Council ({councilDetails?.batch || 'N/A'})
              </Text>
            </View>

            {isLoadingCouncil ? (
              <ActivityIndicator size="small" color={COLORS.primary} className="py-4" />
            ) : councilDetails ? (
              <View className="flex-row flex-wrap gap-y-5">
                {councilMembers.map(member => (
                  <View key={member.role} className="w-1/2 pr-2">
                    <Text className="text-[11px] text-[#94A3B8] font-muller-bold uppercase tracking-wider">
                      {member.role}
                    </Text>
                    <Text className="text-[15px] font-muller-bold text-[#0F172A] mt-1">
                      {member.name || 'N/A'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-center font-muller text-[#475569] py-4">No council data found.</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}