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
  Switch,
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
  PlusCircle,
  Trash2,
} from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

import { ProfileInfoLine } from './profile/ProfileInfoLine';
import { FamilyDataTab } from './profile/FamilyDataTab';
import { AcademicsTab } from './profile/AcademicsTab';
import { MarkEditorModal } from './profile/MarkEditorModal';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
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
      activeOpacity={0.7}
      onPress={onPress}
      className={`flex-1 py-3 rounded-[14px] items-center justify-center ${
        active ? 'bg-[#FFFFFF] border border-[#E2E8F0]' : 'border border-transparent'
      }`}
      style={active ? cardShadow() : undefined}
    >
      <Text
        className={`font-muller-bold tracking-tight text-[15px] ${
          active ? 'text-[#1E40AF]' : 'text-[#475569]'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
}) {
  return (
    <View className="mb-5">
      <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">{label}</Text>
      <TextInput
        className={`bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px] ${
          multiline ? 'h-28' : ''
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function SiblingCard({
  title,
  siblings,
  onChange,
  showResponsibilities,
}: {
  title: 'brothers' | 'sisters';
  siblings: any[];
  onChange: (next: any[]) => void;
  showResponsibilities: boolean;
}) {
  const addSibling = () => {
    onChange([
      ...siblings,
      {
        name: '',
        education: [],
        occupation: '',
        responsibilities: [],
      },
    ]);
  };

  const updateSibling = (index: number, field: string, value: any) => {
    const next = [...siblings];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeSibling = (index: number) => {
    onChange(siblings.filter((_: any, i: number) => i !== index));
  };

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-5">
        <Text className="text-lg font-muller-bold text-[#0F172A] capitalize tracking-tight">{title}</Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={addSibling}
          className="bg-[#1E40AF]/10 px-3.5 py-2.5 rounded-[12px] border border-[#1E40AF]/20 flex-row items-center"
        >
          <View style={{ marginRight: 6 }}>
            <PlusCircle size={16} color={COLORS.primary} />
          </View>
          <Text className="text-[#1E40AF] font-muller-bold text-xs uppercase tracking-wider">Add</Text>
        </TouchableOpacity>
      </View>

      {siblings.length > 0 ? (
        siblings.map((sib: any, index: number) => (
          <View
            key={index}
            className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] mb-4"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-muller-bold text-[#0F172A] text-[15px]">
                {title === 'brothers' ? 'Brother' : 'Sister'} {index + 1}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => removeSibling(index)}
                className="p-2.5 bg-[#DC2626]/10 rounded-[10px]"
              >
                <Trash2 size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            <InputField
              label="Name"
              value={sib.name || ''}
              onChangeText={(t) => updateSibling(index, 'name', t)}
            />

            <InputField
              label="Education (comma separated)"
              value={Array.isArray(sib.education) ? sib.education.join(', ') : sib.education || ''}
              onChangeText={(t) =>
                updateSibling(
                  index,
                  'education',
                  t.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
            />

            <InputField
              label="Occupation"
              value={sib.occupation || ''}
              onChangeText={(t) => updateSibling(index, 'occupation', t)}
            />

            {showResponsibilities && (
              <InputField
                label="Responsibilities (comma separated)"
                value={
                  Array.isArray(sib.responsibilities)
                    ? sib.responsibilities.join(', ')
                    : sib.responsibilities || ''
                }
                onChangeText={(t) =>
                  updateSibling(
                    index,
                    'responsibilities',
                    t.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            )}
          </View>
        ))
      ) : (
        <Text className="text-[13px] font-muller text-[#94A3B8]">No {title} added.</Text>
      )}
    </View>
  );
}

export default function ProfileSection() {
  const { user, details, role, loading } = useUserData();
  const isStudent = role === 'student';

  const [activeTab, setActiveTab] = useState<'personal' | 'academics' | 'family'>('personal');
  const [editModalTab, setEditModalTab] = useState<'personal' | 'family'>('personal');

  const [editOpen, setEditOpen] = useState(false);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedAcademicEntry, setSelectedAcademicEntry] = useState<any | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [personalForm, setPersonalForm] = useState<any>({});
  const [familyData, setFamilyData] = useState<any>({});
  const [fatherResponsibilitiesText, setFatherResponsibilitiesText] = useState('');
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
    if (familyRes.data) {
      setFamilyData(familyRes.data);
      setFatherResponsibilitiesText(
        Array.isArray(familyRes.data.father_responsibilities)
          ? familyRes.data.father_responsibilities.join(', ')
          : ''
      );
    }
    if (!familyRes.data) {
      setFamilyData({});
      setFatherResponsibilitiesText('');
    }
  }, [user, isStudent]);

  useEffect(() => {
    if (details) {
      setPersonalForm(details);
    }
    fetchExtraData();
  }, [details, fetchExtraData]);

  const openEditModal = (tab: 'personal' | 'family') => {
    setEditModalTab(tab);
    setEditOpen(true);
  };

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
      const {
        name,
        phone,
        guardian,
        g_phone,
        address,
        designation,
        batch,
      } = personalForm;

      const updatedData = isStudent
        ? { name, phone, guardian, g_phone, address }
        : { name, designation, batch };

      const { error: updateError } = await supabase
        .from(table)
        .update(updatedData)
        .eq('uid', user.id);

      if (updateError) throw updateError;

      if (isStudent) {
        const familyPayload = {
          ...familyData,
          father_responsibilities: fatherResponsibilitiesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          student_uid: user.id,
        };

        const { error: familyError } = await supabase.from('family_data').upsert(familyPayload);

        if (familyError) throw familyError;
      }

      NativeAlert.alert('Success', 'Profile updated successfully.');
      setEditOpen(false);
      fetchExtraData();
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

  const handleFamilyChange = (field: string, value: any) => {
    setFamilyData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSiblingsUpdate = (type: 'brothers' | 'sisters', updated: any[]) => {
    setFamilyData((prev: any) => ({ ...prev, [type]: updated }));
  };

  if (loading || !details) {
    return (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="pb-10">
      <View
        className="bg-[#FFFFFF] rounded-[18px] p-6 border border-[#E2E8F0] items-center mb-6"
        style={cardShadow()}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAvatarUpdate}
          disabled={isSaving}
          className="relative mb-4"
        >
          <View
            className="h-32 w-32 rounded-full border-4 border-[#FFFFFF] overflow-hidden bg-[#F1F5F9] justify-center items-center"
            style={cardShadow()}
          >
            {personalForm.img_url ? (
              <Image source={{ uri: personalForm.img_url }} className="h-full w-full" />
            ) : (
              <User size={48} color="#94A3B8" />
            )}
          </View>

          <View className="absolute bottom-0 right-0 bg-[#1E40AF] p-3.5 rounded-full border-2 border-[#FFFFFF] shadow-sm">
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Camera size={18} color="white" />
            )}
          </View>
        </TouchableOpacity>

        <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">{details.name}</Text>

        <View className="bg-[#1E40AF]/10 px-4 py-1.5 rounded-[12px] mt-2.5 border border-[#1E40AF]/20">
          <Text className="text-[11px] font-muller-bold text-[#1E40AF] uppercase tracking-wider">
            {details.role}
          </Text>
        </View>

        <Text className="text-[14px] font-muller text-[#475569] mt-2.5">{details.email}</Text>
      </View>

      <View className="flex-row bg-[#E2E8F0]/60 p-1.5 rounded-[16px] mb-6">
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
        className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">
            {activeTab === 'personal'
              ? 'Personal Details'
              : activeTab === 'academics'
                ? 'Academic Records'
                : 'Family Data'}
          </Text>

          {(activeTab === 'personal' || (isStudent && activeTab === 'family')) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openEditModal(activeTab === 'family' ? 'family' : 'personal')}
              className="bg-[#F1F5F9] p-3 rounded-full"
            >
              <Pencil size={18} color="#0F172A" />
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
        <View className="flex-1 bg-[#F8FAFC] pt-14 px-5">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">Edit Profile</Text>
              <Text className="text-[#475569] font-muller text-sm mt-0.5">Update your details</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setEditOpen(false)}
              className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {isStudent && (
            <View className="flex-row bg-[#E2E8F0]/60 p-1.5 rounded-[16px] mb-5">
              <TabButton
                label="Personal"
                active={editModalTab === 'personal'}
                onPress={() => setEditModalTab('personal')}
              />
              <TabButton
                label="Family"
                active={editModalTab === 'family'}
                onPress={() => setEditModalTab('family')}
              />
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {(!isStudent || editModalTab === 'personal') && (
              <View className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] shadow-sm mb-5 mt-2">
                <InputField
                  label="Full Name"
                  value={personalForm.name || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, name: t })}
                />

                {isStudent ? (
                  <>
                    <InputField
                      label="Phone Number"
                      value={personalForm.phone || ''}
                      keyboardType="phone-pad"
                      onChangeText={(t) => setPersonalForm({ ...personalForm, phone: t })}
                    />

                    <InputField
                      label="Guardian Name"
                      value={personalForm.guardian || ''}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, guardian: t })}
                    />

                    <InputField
                      label="Guardian Phone"
                      value={personalForm.g_phone || ''}
                      keyboardType="phone-pad"
                      onChangeText={(t) => setPersonalForm({ ...personalForm, g_phone: t })}
                    />

                    <InputField
                      label="Address"
                      value={personalForm.address || ''}
                      multiline
                      onChangeText={(t) => setPersonalForm({ ...personalForm, address: t })}
                    />
                  </>
                ) : (
                  <InputField
                    label="Designation"
                    value={personalForm.designation || ''}
                    onChangeText={(t) => setPersonalForm({ ...personalForm, designation: t })}
                  />
                )}
              </View>
            )}

            {isStudent && editModalTab === 'family' && (
              <View className="mt-2">
                <View
                  className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight mb-5">Household</Text>

                  <InputField
                    label="Total Family Members"
                    value={familyData.total_family_members?.toString() || ''}
                    keyboardType="numeric"
                    onChangeText={(t) =>
                      handleFamilyChange(
                        'total_family_members',
                        t ? parseInt(t, 10) || null : null
                      )
                    }
                  />

                  <InputField
                    label="House Type"
                    value={familyData.house_type || ''}
                    onChangeText={(t) => handleFamilyChange('house_type', t)}
                  />

                  <View className="mb-2">
                    <Text className="text-[13px] font-muller-bold text-[#475569] mb-2.5 ml-1">
                      Are there chronically ill members in the house?
                    </Text>
                    <View className="flex-row items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-4">
                      <Text className="text-[15px] font-muller-bold text-[#0F172A]">
                        {familyData.chronically_ill_members ? 'Yes' : 'No'}
                      </Text>
                      <Switch
                        value={!!familyData.chronically_ill_members}
                        onValueChange={(v) => handleFamilyChange('chronically_ill_members', v)}
                        trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                      />
                    </View>
                  </View>
                </View>

                <View
                  className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight mb-5">Parent Details</Text>

                  <InputField
                    label="Father's Name"
                    value={familyData.father_name || ''}
                    onChangeText={(t) => handleFamilyChange('father_name', t)}
                  />

                  <InputField
                    label="Father's Occupation"
                    value={familyData.father_occupation || ''}
                    onChangeText={(t) => handleFamilyChange('father_occupation', t)}
                  />

                  <InputField
                    label="Father's Staying Place"
                    value={familyData.father_staying_place || ''}
                    onChangeText={(t) => handleFamilyChange('father_staying_place', t)}
                  />

                  <InputField
                    label="Father's Responsibilities (comma separated)"
                    value={fatherResponsibilitiesText}
                    multiline
                    onChangeText={(t) => setFatherResponsibilitiesText(t)}
                  />

                  <InputField
                    label="Mother's Name"
                    value={familyData.mother_name || ''}
                    onChangeText={(t) => handleFamilyChange('mother_name', t)}
                  />

                  <InputField
                    label="Mother's Occupation"
                    value={familyData.mother_occupation || ''}
                    onChangeText={(t) => handleFamilyChange('mother_occupation', t)}
                  />
                </View>

                <SiblingCard
                  title="brothers"
                  siblings={familyData.brothers || []}
                  onChange={(next) => handleSiblingsUpdate('brothers', next)}
                  showResponsibilities={true}
                />

                <SiblingCard
                  title="sisters"
                  siblings={familyData.sisters || []}
                  onChange={(next) => handleSiblingsUpdate('sisters', next)}
                  showResponsibilities={false}
                />
              </View>
            )}

          </ScrollView>
            <View className="py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.8}
                className={`w-full py-4 rounded-[14px] flex-row justify-center items-center shadow-sm ${
                  isSaving ? 'bg-[#1E40AF]/60' : 'bg-[#1E40AF]'
                }`}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                ) : (
                  <Save size={18} color="white" />
                )}
                <Text className="text-white font-muller-bold text-[16px] tracking-wide ml-2">Save Changes</Text>
              </TouchableOpacity>
            </View>
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
    </View>
  );
}