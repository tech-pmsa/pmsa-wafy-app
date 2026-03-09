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

import { ProfileInfoLine } from './profile/ProfileInfoLine';
import { FamilyDataTab } from './profile/FamilyDataTab';
import { AcademicsTab } from './profile/AcademicsTab';
import { MarkEditorModal } from './profile/MarkEditorModal';

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
    <View className="mb-4">
      <Text className="text-sm font-medium text-zinc-700 mb-1">{label}</Text>
      <TextInput
        className={`bg-white border border-zinc-200 rounded-xl p-4 text-base ${multiline ? 'h-24' : ''}`}
        value={value}
        onChangeText={onChangeText}
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
      className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-zinc-900 capitalize">{title}</Text>

        <TouchableOpacity
          onPress={addSibling}
          className="bg-zinc-900 px-3 py-2 rounded-xl flex-row items-center"
        >
          <View style={{ marginRight: 6 }}>
            <PlusCircle size={16} color="white" />
          </View>
          <Text className="text-white font-bold text-xs">Add</Text>
        </TouchableOpacity>
      </View>

      {siblings.length > 0 ? (
        siblings.map((sib: any, index: number) => (
          <View
            key={index}
            className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 mb-3"
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-bold text-zinc-900">
                {title === 'brothers' ? 'Brother' : 'Sister'} {index + 1}
              </Text>

              <TouchableOpacity
                onPress={() => removeSibling(index)}
                className="p-2 bg-red-50 rounded-lg"
              >
                <Trash2 size={18} color="#ef4444" />
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
        <Text className="text-sm text-zinc-500">No {title} added.</Text>
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

          {(activeTab === 'personal' || (isStudent && activeTab === 'family')) && (
            <TouchableOpacity
              onPress={() => openEditModal(activeTab === 'family' ? 'family' : 'personal')}
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

          {isStudent && (
            <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-4">
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
              <View>
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
              <View>
                <View
                  className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-bold text-zinc-900 mb-4">Household</Text>

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
                    <Text className="text-sm font-medium text-zinc-700 mb-2">
                      Are there chronically ill members in the house?
                    </Text>
                    <View className="flex-row items-center justify-between bg-white border border-zinc-200 rounded-xl p-4">
                      <Text className="text-base text-zinc-900">
                        {familyData.chronically_ill_members ? 'Yes' : 'No'}
                      </Text>
                      <Switch
                        value={!!familyData.chronically_ill_members}
                        onValueChange={(v) => handleFamilyChange('chronically_ill_members', v)}
                      />
                    </View>
                  </View>
                </View>

                <View
                  className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-bold text-zinc-900 mb-4">Parent Details</Text>

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
    </View>
  );
}