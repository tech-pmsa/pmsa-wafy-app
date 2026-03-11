import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { Pencil, Crown, Banknote, ShieldCheck, Users, Speaker, Save, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

const councilPositions = [
  { key: 'batch', label: 'Batch', icon: Users },
  { key: 'president', label: 'President', icon: Crown },
  { key: 'vicepresident', label: 'Vice President', icon: Users },
  { key: 'secretary', label: 'Secretary', icon: Pencil },
  { key: 'treasurer', label: 'Treasurer', icon: Banknote },
  { key: 'auditor', label: 'Auditor', icon: ShieldCheck },
  { key: 'pro', label: 'PRO', icon: Speaker },
];

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function ClassCouncil() {
  const { user, loading: userLoading } = useUserData();
  const [council, setCouncil] = useState<any>(null);
  const [originalCouncil, setOriginalCouncil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchCouncil = async () => {
      if (!user?.id) {
        if (!userLoading) setLoading(false);
        return;
      }
      const { data } = await supabase.from('class_council').select('*').eq('uid', user.id).single();

      if (data) {
        setCouncil(data); setOriginalCouncil(data);
      } else {
        const blank = councilPositions.reduce((acc, pos) => ({ ...acc, [pos.key]: '' }), { uid: user.id });
        setCouncil(blank); setOriginalCouncil(blank);
      }
      setLoading(false);
    };
    fetchCouncil();
  }, [user, userLoading]);

  const handleSubmit = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('class_council').upsert({ ...council, uid: user?.id });

    if (error) {
      NativeAlert.alert('Error', error.message);
    } else {
      NativeAlert.alert('Success', 'Class council updated successfully!');
      setOriginalCouncil(council);
      setEditMode(false);
    }
    setIsSaving(false);
  };

  if (loading || userLoading) {
    return (
      <View
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center my-2 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Council Details...</Text>
      </View>
    );
  }

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] my-2"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1">
          <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Class Council</Text>
          <Text className="text-sm font-muller text-[#475569] mt-0.5">
            {editMode ? 'Update assigned names' : `Batch: ${council?.batch || 'N/A'}`}
          </Text>
        </View>
        {!editMode && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setEditMode(true)}
            className="bg-[#F1F5F9] p-3 rounded-full"
          >
            <Pencil size={20} color="#0F172A" />
          </TouchableOpacity>
        )}
      </View>

      <View className="space-y-3.5">
        {councilPositions.map(({ key, label, icon: Icon }) => (
          <View key={key} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-4 flex-row items-center">
            <View className="bg-[#FFFFFF] p-3 rounded-[12px] border border-[#E2E8F0]">
              <Icon size={22} color="#475569" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">{label}</Text>
              {editMode ? (
                <TextInput
                  className="border-b border-[#E2E8F0] py-1.5 text-[15px] text-[#0F172A] font-muller-bold mt-1"
                  value={council?.[key] || ''}
                  onChangeText={(t) => setCouncil({ ...council, [key]: t })}
                  placeholder="Enter name"
                  placeholderTextColor="#94A3B8"
                />
              ) : (
                <Text className="text-[15px] font-muller-bold text-[#0F172A] mt-1.5 tracking-tight">
                  {council?.[key] || 'Not Assigned'}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {editMode && (
        <View className="flex-row mt-8 pt-5 border-t border-[#E2E8F0] gap-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { setCouncil(originalCouncil); setEditMode(false); }}
            className="flex-1 py-3.5 rounded-[14px] bg-[#F1F5F9] border border-[#E2E8F0] items-center justify-center"
          >
            <Text className="font-muller-bold text-[#0F172A] text-[15px] tracking-wide">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={isSaving}
            className={`flex-1 py-3.5 rounded-[14px] flex-row items-center justify-center shadow-sm ${
              isSaving ? 'bg-[#1E40AF]/60' : 'bg-[#1E40AF]'
            }`}
          >
            {isSaving ? <ActivityIndicator color="white" className="mr-2.5" /> : <Save size={18} color="white" className="mr-2.5" />}
            <Text className="font-muller-bold text-white text-[15px] tracking-wide">Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}