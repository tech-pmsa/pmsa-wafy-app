import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { Pencil, Crown, Banknote, ShieldCheck, Users, Speaker, Save, X } from 'lucide-react-native';

const councilPositions = [
  { key: 'batch', label: 'Batch', icon: Users },
  { key: 'president', label: 'President', icon: Crown },
  { key: 'vicepresident', label: 'Vice President', icon: Users },
  { key: 'secretary', label: 'Secretary', icon: Pencil },
  { key: 'treasurer', label: 'Treasurer', icon: Banknote },
  { key: 'auditor', label: 'Auditor', icon: ShieldCheck },
  { key: 'pro', label: 'PRO', icon: Speaker },
];

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

  if (loading || userLoading) return <ActivityIndicator size="large" color="#09090b" className="my-10" />;

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1">
          <Text className="text-xl font-bold text-zinc-900">Class Council</Text>
          <Text className="text-sm text-zinc-500 mt-1">{editMode ? 'Update names' : `Batch: ${council?.batch || 'N/A'}`}</Text>
        </View>
        {!editMode && (
          <TouchableOpacity onPress={() => setEditMode(true)} className="bg-zinc-100 p-3 rounded-full">
            <Pencil size={20} color="#09090b" />
          </TouchableOpacity>
        )}
      </View>

      <View className="space-y-3">
        {councilPositions.map(({ key, label, icon: Icon }) => (
          <View key={key} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex-row items-center">
            <View className="bg-white p-3 rounded-xl border border-zinc-200">
              <Icon size={24} color="#71717a" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xs font-bold text-zinc-500 uppercase">{label}</Text>
              {editMode ? (
                <TextInput
                  className="border-b border-zinc-300 py-1 text-base text-zinc-900 font-semibold"
                  value={council?.[key] || ''}
                  onChangeText={(t) => setCouncil({ ...council, [key]: t })}
                  placeholder="Enter name"
                />
              ) : (
                <Text className="text-base font-semibold text-zinc-900 mt-0.5">{council?.[key] || 'Not Assigned'}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {editMode && (
        <View className="flex-row mt-6 pt-4 border-t border-zinc-100 gap-3">
          <TouchableOpacity onPress={() => { setCouncil(originalCouncil); setEditMode(false); }} className="flex-1 py-4 rounded-xl bg-zinc-100 items-center justify-center">
            <Text className="font-bold text-zinc-900">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} disabled={isSaving} className="flex-1 py-4 rounded-xl bg-zinc-900 flex-row items-center justify-center">
            {isSaving ? <ActivityIndicator color="white" /> : <Save size={20} color="white" className="mr-2" />}
            <Text className="font-bold text-white">Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}