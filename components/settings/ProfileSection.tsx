import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert as NativeAlert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import {
  User,
  Briefcase,
  Building,
  Shield,
  UserCheck,
  Phone,
  PhoneCall,
  Home,
  Pencil,
  Camera,
  Save,
  X,
} from 'lucide-react-native';

import { ProfileInfoLine } from './profile/ProfileInfoLine';
import { FamilyDataTab } from './profile/FamilyDataTab';
import { AcademicsTab } from './profile/AcademicsTab';
import { MarkEditorModal } from './profile/MarkEditorModal';
import { EmailChangeModal } from './profile/EmailChangeModal';

function cardShadow() {
  return {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={active ? 'flex-1 py-3 rounded-lg items-center bg-white' : 'flex-1 py-3 rounded-lg items-center'}
      style={active ? cardShadow() : undefined}
    >
      <Text className={active ? 'font-semibold text-zinc-900' : 'font-semibold text-zinc-500'}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileSection() {
  const { user, details, role, loading } = useUserData();
  const isStudent = role === 'student';

  const [activeTab, setActiveTab] = useState<'personal' | 'academics' | 'family'>('personal');

  const [editOpen, setEditOpen] = useState(false);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedAcademicEntry, setSelectedAcademicEntry] = useState<any | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [personalForm, setPersonalForm] = useState<any>({});
  const [familyData, setFamilyData] = useState<any>({});
  const [academicEntries, setAcademicEntries] = useState<any[]>([]);

  const fetchExtraData = useCallback(async () => {
    if (!user || !isStudent) return;

    const [academicRes, familyRes] = await Promise.all([
      supabase
        .from('academic_entries')
        .select('*, subject_marks(*)')
        .eq('student_uid', user.id)
        .order('created_at'),
      supabase.from('family_data').select('*').eq('student_uid', user.id).single(),
    ]);

    if (academicRes.data) setAcademicEntries(academicRes.data);
    if (familyRes.data) setFamilyData(familyRes.data);
  }, [user, isStudent]);

  useEffect(() => {
    if (details) {
      setPersonalForm(details);
    }
    fetchExtraData();
  }, [details, fetchExtraData]);

  const handleAvatarUpdate = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsSaving(true);

        const imageUri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const filePath = `avatars/${user?.id}/${Date.now()}-avatar.png`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        const table = isStudent ? 'students' : 'profiles';
        const { error: updateError } = await supabase
          .from(table)
          .update({ img_url: newUrl })
          .eq('uid', user?.id);

        if (updateError) throw updateError;

        setPersonalForm((prev: any) => ({ ...prev, img_url: newUrl }));
        NativeAlert.alert('Success', 'Profile picture updated.');
      }
    } catch (error: any) {
      NativeAlert.alert('Error', error.message || 'Failed to update image.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const table = isStudent ? 'students' : 'profiles';
      const { name, phone, guardian, g_phone, address, designation, batch } = personalForm;

      const updatedData = isStudent
        ? { name, phone, guardian, g_phone, address }
        : { name, designation, batch };

      const { error: updateError } = await supabase
        .from(table)
        .update(updatedData)
        .eq('uid', user.id);

      if (updateError) throw updateError;

      NativeAlert.alert('Success', 'Profile updated successfully.');
      setEditOpen(false);
    } catch (error: any) {
      NativeAlert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAcademicEntry = async (id: number) => {
    const { error } = await supabase.from('academic_entries').delete().eq('id', id);

    if (!error) {
      fetchExtraData();
      NativeAlert.alert('Deleted', 'Academic record deleted.');
    } else {
      NativeAlert.alert('Error', 'Failed to delete record.');
    }
  };

  if (loading || !details) {
    return <ActivityIndicator size="large" color="#09090b" style={{ marginVertical: 40 }} />;
  }

  return (
    <View className="pb-10">
      <View
        className="bg-white rounded-3xl p-6 border border-zinc-200 items-center mb-6"
        style={cardShadow()}
      >
        <TouchableOpacity
          onPress={handleAvatarUpdate}
          disabled={isSaving}
          className="relative mb-4"
        >
          <View
            className="h-32 w-32 rounded-full border-4 border-zinc-50 items-center justify-center overflow-hidden bg-zinc-100"
            style={cardShadow()}
          >
            {personalForm.img_url ? (
              <Image source={{ uri: personalForm.img_url }} className="h-full w-full" />
            ) : (
              <User size={48} color="#a1a1aa" />
            )}
          </View>

          <View className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full border-2 border-white">
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Camera size={16} color="white" />
            )}
          </View>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-zinc-900">{details.name}</Text>

        <View className="bg-zinc-100 px-3 py-1 rounded-full mt-2">
          <Text className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
            {details.role}
          </Text>
        </View>

        <Text className="text-sm text-zinc-500 mt-2">{details.email}</Text>
      </View>

      <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-6">
        <TabButton
          label="Personal"
          active={activeTab === 'personal'}
          onPress={() => setActiveTab('personal')}
        />

        {isStudent && (
          <>
            <TabButton
              label="Academics"
              active={activeTab === 'academics'}
              onPress={() => setActiveTab('academics')}
            />
            <TabButton
              label="Family"
              active={activeTab === 'family'}
              onPress={() => setActiveTab('family')}
            />
          </>
        )}
      </View>

      <View
        className="bg-white rounded-3xl p-5 border border-zinc-200"
        style={cardShadow()}
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-bold text-zinc-900">
            {activeTab === 'personal'
              ? 'Personal Details'
              : activeTab === 'academics'
              ? 'Academic Records'
              : 'Family Data'}
          </Text>

          {activeTab === 'personal' && (
            <TouchableOpacity
              onPress={() => setEditOpen(true)}
              className="bg-zinc-100 p-2.5 rounded-full"
            >
              <Pencil size={18} color="#09090b" />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === 'personal' && (
          <View>
            {isStudent ? (
              <>
                <ProfileInfoLine icon={UserCheck} label="CIC Number" value={details.cic} />
                <ProfileInfoLine icon={Building} label="Class" value={details.class_id} />
                <ProfileInfoLine icon={Shield} label="Council" value={details.council} />
                <ProfileInfoLine icon={Phone} label="Phone" value={details.phone} />
                <ProfileInfoLine icon={User} label="Guardian" value={details.guardian} />
                <ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={details.g_phone} />
                <ProfileInfoLine icon={Home} label="Address" value={details.address} />
              </>
            ) : (
              <>
                <ProfileInfoLine icon={Briefcase} label="Designation" value={details.designation} />
                <ProfileInfoLine icon={Building} label="Related to" value={details.batch} />
              </>
            )}
          </View>
        )}

        {activeTab === 'academics' && (
          <AcademicsTab
            entries={academicEntries}
            onAdd={() => {
              setSelectedAcademicEntry(null);
              setIsMarkModalOpen(true);
            }}
            onEdit={(entry: any) => {
              setSelectedAcademicEntry(entry);
              setIsMarkModalOpen(true);
            }}
            onDelete={handleDeleteAcademicEntry}
          />
        )}

        {activeTab === 'family' && <FamilyDataTab data={familyData} />}
      </View>

      <Modal
        visible={editOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditOpen(false)}
      >
        <View className="flex-1 bg-zinc-100 pt-14 px-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-zinc-900">Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditOpen(false)}>
              <X size={24} color="#09090b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <View>
              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Full Name</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.name}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, name: t })}
                />
              </View>

              {isStudent ? (
                <>
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-zinc-700 mb-1">Phone Number</Text>
                    <TextInput
                      className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                      value={personalForm.phone}
                      keyboardType="phone-pad"
                      onChangeText={(t) => setPersonalForm({ ...personalForm, phone: t })}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-zinc-700 mb-1">Guardian Name</Text>
                    <TextInput
                      className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                      value={personalForm.guardian}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, guardian: t })}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-zinc-700 mb-1">Guardian Phone</Text>
                    <TextInput
                      className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                      value={personalForm.g_phone}
                      keyboardType="phone-pad"
                      onChangeText={(t) => setPersonalForm({ ...personalForm, g_phone: t })}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-zinc-700 mb-1">Address</Text>
                    <TextInput
                      className="bg-white border border-zinc-200 rounded-xl p-4 text-base h-24"
                      multiline
                      textAlignVertical="top"
                      value={personalForm.address}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, address: t })}
                    />
                  </View>
                </>
              ) : (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-zinc-700 mb-1">Designation</Text>
                  <TextInput
                    className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                    value={personalForm.designation}
                    onChangeText={(t) => setPersonalForm({ ...personalForm, designation: t })}
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-4 rounded-xl flex-row justify-center items-center bg-zinc-900 mt-4"
              >
                {isSaving ? (
                  <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                ) : (
                  <Save size={20} color="white" />
                )}
                <Text className="text-white font-bold text-lg ml-2">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {isStudent && (
        <MarkEditorModal
          isOpen={isMarkModalOpen}
          setIsOpen={setIsMarkModalOpen}
          entry={selectedAcademicEntry}
          onSave={fetchExtraData}
        />
      )}

      <EmailChangeModal />
    </View>
  );
}