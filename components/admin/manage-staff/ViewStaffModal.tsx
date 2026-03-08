import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { User, Shield, X } from 'lucide-react-native';

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
      <View className="flex-1 bg-zinc-100 pt-6 px-4">

        <View className="flex-row justify-end mb-2">
          <TouchableOpacity onPress={() => setIsOpen(false)} className="bg-zinc-200 p-2 rounded-full"><X size={20} color="#09090b" /></TouchableOpacity>
        </View>

        <View className="items-center mb-6">
          <View className="h-24 w-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-zinc-200 justify-center items-center">
            {staff.img_url ? <Image source={{ uri: staff.img_url }} className="h-full w-full" /> : <User size={40} color="#a1a1aa" />}
          </View>
          <Text className="text-2xl font-bold text-zinc-900 mt-3">{staff.name}</Text>
          <Text className="text-sm text-zinc-500">{staff.designation || staff.role}</Text>
        </View>

        {staff.designation?.endsWith(' Class') && (
          <View className="bg-white rounded-3xl p-5 border border-zinc-200">
            <View className="flex-row items-center mb-4 border-b border-zinc-100 pb-3">
              <Shield size={20} color="#2563eb" />
              <Text className="text-lg font-bold text-zinc-900 ml-2">Class Council ({councilDetails?.batch || 'N/A'})</Text>
            </View>

            {isLoadingCouncil ? (
              <ActivityIndicator size="small" color="#09090b" className="py-4" />
            ) : councilDetails ? (
              <View className="flex-row flex-wrap">
                {councilMembers.map(member => (
                  <View key={member.role} className="w-1/2 mb-4 pr-2">
                    <Text className="text-xs text-zinc-500 font-bold uppercase">{member.role}</Text>
                    <Text className="text-base font-medium text-zinc-900 mt-0.5">{member.name || 'N/A'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-center text-zinc-500 py-4">No council data found.</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}