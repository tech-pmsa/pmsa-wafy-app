import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { Briefcase, ChevronDown, ChevronUp, User, Mail, Eye, Edit } from 'lucide-react-native';

// Import our Modals
import { ViewStaffModal } from '@/components/admin/manage-staff/ViewStaffModal';
import { EditStaffModal } from '@/components/admin/manage-staff/EditStaffModal';

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

  if (loading) return <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center"><ActivityIndicator size="large" color="#09090b" /></SafeAreaView>;

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-bold text-zinc-900">Manage Staff</Text>
        <Text className="text-zinc-500 mt-1">View and manage staff profiles.</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedStaff).sort().map(([groupName, staffInGroup]: [string, any[]]) => {
          const isExpanded = expandedGroup === groupName;

          return (
            <View key={groupName} className="bg-white rounded-3xl mb-4 shadow-sm border border-zinc-200 overflow-hidden">
              <TouchableOpacity
                onPress={() => setExpandedGroup(isExpanded ? null : groupName)}
                className="flex-row items-center justify-between p-5 bg-zinc-50 border-b border-zinc-100"
              >
                <View className="flex-row items-center flex-1 pr-4">
                  <Text className="text-xl font-bold text-zinc-900 truncate" numberOfLines={1}>{groupName}</Text>
                  <View className="bg-zinc-200 px-2 py-0.5 rounded-full ml-3">
                    <Text className="text-xs font-bold text-zinc-700">{staffInGroup.length}</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp size={24} color="#71717a" /> : <ChevronDown size={24} color="#71717a" />}
              </TouchableOpacity>

              {isExpanded && (
                <View className="p-4 space-y-3">
                  {staffInGroup.map(staff => (
                    <View key={staff.uid} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                      <View className="p-4 flex-row items-center border-b border-zinc-100">
                        <View className="h-14 w-14 rounded-full bg-zinc-100 items-center justify-center overflow-hidden border border-zinc-200">
                          {staff.img_url ? <Image source={{ uri: staff.img_url }} className="h-full w-full" /> : <User size={24} color="#a1a1aa" />}
                        </View>
                        <View className="ml-4 flex-1">
                          <Text className="font-bold text-zinc-900 text-lg truncate" numberOfLines={1}>{staff.name}</Text>
                          <Text className="text-sm text-zinc-500 capitalize">{staff.role}</Text>
                        </View>
                      </View>

                      <View className="px-4 py-3 flex-row flex-wrap gap-y-2 bg-zinc-50">
                        <View className="w-1/2 flex-row items-center pr-2"><Briefcase size={14} color="#71717a" /><Text className="text-xs text-zinc-600 ml-1.5 truncate" numberOfLines={1}>{staff.designation || 'N/A'}</Text></View>
                        <View className="w-1/2 flex-row items-center"><Mail size={14} color="#71717a" /><Text className="text-xs text-zinc-600 ml-1.5 truncate" numberOfLines={1}>{staff.email || 'N/A'}</Text></View>
                      </View>

                      <View className="flex-row border-t border-zinc-100">
                        <TouchableOpacity onPress={() => handleViewClick(staff)} className="flex-1 py-3 items-center justify-center flex-row border-r border-zinc-100">
                          <Eye size={16} color="#3b82f6" /><Text className="ml-1 font-semibold text-blue-600 text-xs">View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEditClick(staff)} className="flex-1 py-3 items-center justify-center flex-row">
                          <Edit size={16} color="#eab308" /><Text className="ml-1 font-semibold text-yellow-600 text-xs">Edit</Text>
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