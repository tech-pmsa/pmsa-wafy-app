import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { Briefcase, ChevronDown, ChevronUp, User, Mail, Eye, Edit } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

// Import our Modals
import { ViewStaffModal } from '@/components/admin/manage-staff/ViewStaffModal';
import { EditStaffModal } from '@/components/admin/manage-staff/EditStaffModal';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function ManageStaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      setStaffList(data || []);

      // Auto-expand first group if exists
      if (data && data.length > 0) {
        const firstGroup = data[0].designation || data[0].role || 'Other';
        setExpandedGroup(firstGroup.replace(' Class', '').trim());
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleViewClick = (staff: any) => { setSelectedStaff(staff); setIsViewModalOpen(true); };
  const handleEditClick = (staff: any) => { setSelectedStaff(staff); setIsEditModalOpen(true); };

  const groupedStaff = useMemo(() => {
    return staffList.reduce((acc: Record<string, any[]>, staff: any) => {
      let key = staff.designation || staff.role || 'Other';
      if (key.endsWith(' Class')) key = key.replace(' Class', '').trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(staff);
      return acc;
    }, {} as Record<string, any[]>);
  }, [staffList]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-[#475569] font-muller mt-4">Loading Staff Directory...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="px-6 pt-4 pb-5">
        <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">Manage Staff</Text>
        <Text className="text-[#475569] font-muller mt-1.5">View and manage staff profiles.</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedStaff).sort().map(([groupName, staffInGroup]: [string, any[]]) => {
          const isExpanded = expandedGroup === groupName;

          return (
            <View
              key={groupName}
              className="bg-[#FFFFFF] rounded-[18px] mb-5 border border-[#E2E8F0] overflow-hidden"
              style={cardShadow()}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExpandedGroup(isExpanded ? null : groupName)}
                className="flex-row items-center justify-between p-5 bg-[#F8FAFC] border-b border-[#E2E8F0]"
              >
                <View className="flex-row items-center flex-1 pr-4">
                  <Text className="text-[17px] font-muller-bold text-[#0F172A] tracking-tight truncate" numberOfLines={1}>
                    {groupName}
                  </Text>
                  <View className="bg-[#E2E8F0]/60 px-2.5 py-1 rounded-[8px] ml-3 border border-[#E2E8F0]">
                    <Text className="text-xs font-muller-bold text-[#475569]">{staffInGroup.length}</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp size={22} color="#94A3B8" /> : <ChevronDown size={22} color="#94A3B8" />}
              </TouchableOpacity>

              {isExpanded && (
                <View className="p-4 space-y-3.5 gap-1 bg-[#FFFFFF]">
                  {staffInGroup.map(staff => (
                    <View key={staff.uid} className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] overflow-hidden">
                      <View className="p-4 flex-row items-center border-b border-[#E2E8F0]">
                        <View className="h-14 w-14 rounded-[12px] bg-[#F1F5F9] items-center justify-center overflow-hidden border border-[#E2E8F0]">
                          {staff.img_url ? (
                            <Image source={{ uri: staff.img_url }} className="h-full w-full" />
                          ) : (
                            <User size={24} color="#94A3B8" />
                          )}
                        </View>
                        <View className="ml-4 flex-1">
                          <Text className="font-muller-bold text-[#0F172A] text-[16px] tracking-tight truncate" numberOfLines={1}>
                            {staff.name}
                          </Text>
                          <Text className="text-[13px] font-muller text-[#475569] capitalize mt-0.5">
                            {staff.role}
                          </Text>
                        </View>
                      </View>

                      <View className="px-4 py-3.5 flex-row flex-wrap gap-y-2.5 bg-[#F8FAFC]">
                        <View className="w-1/2 flex-row items-center pr-2">
                          <Briefcase size={14} color="#94A3B8" />
                          <Text className="text-[13px] font-muller text-[#475569] ml-2 truncate" numberOfLines={1}>
                            {staff.designation || 'N/A'}
                          </Text>
                        </View>
                        <View className="w-1/2 flex-row items-center">
                          <Mail size={14} color="#94A3B8" />
                          <Text className="text-[13px] font-muller text-[#475569] ml-2 truncate" numberOfLines={1}>
                            {staff.email || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row border-t border-[#E2E8F0] bg-[#FFFFFF]">
                        <TouchableOpacity
                          onPress={() => handleViewClick(staff)}
                          activeOpacity={0.7}
                          className="flex-1 py-3.5 items-center justify-center flex-row border-r border-[#E2E8F0]"
                        >
                          <Eye size={16} color={COLORS.primary} />
                          <Text className="ml-2 font-muller-bold text-[#1E40AF] text-[13px] uppercase tracking-wider">View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleEditClick(staff)}
                          activeOpacity={0.7}
                          className="flex-1 py-3.5 items-center justify-center flex-row"
                        >
                          <Edit size={16} color={COLORS.warning} />
                          <Text className="ml-2 font-muller-bold text-[#D97706] text-[13px] uppercase tracking-wider">Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <ViewStaffModal isOpen={isViewModalOpen} setIsOpen={setIsViewModalOpen} staff={selectedStaff} />
      <EditStaffModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} staff={selectedStaff} onSave={fetchStaff} />

    </SafeAreaView>
  );
}