import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert as NativeAlert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Save, X, User } from 'lucide-react-native';

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
      className={active ? 'flex-1 py-2.5 rounded-lg items-center bg-white' : 'flex-1 py-2.5 rounded-lg items-center'}
      style={active ? cardShadow() : undefined}
    >
      <Text className={active ? 'font-semibold text-sm text-zinc-900' : 'font-semibold text-sm text-zinc-500'}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function EditStudentModal({ isOpen, setIsOpen, student, onSave }: any) {
  const [activeTab, setActiveTab] = useState<'personal' | 'family'>('personal');
  const [personalForm, setPersonalForm] = useState<any>({});
  const [familyForm, setFamilyForm] = useState<any>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;

    setActiveTab('personal');
    setPersonalForm(student);
    setPreview(student.img_url || null);

    const fetchFamily = async () => {
      const { data } = await supabase
        .from('family_data')
        .select('*')
        .eq('student_uid', student.uid)
        .single();

      setFamilyForm(data || {});
    };

    fetchFamily();
  }, [isOpen, student]);

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

        const filePath = `avatars/${student.uid}/${Date.now()}-avatar.png`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        setPreview(newUrl);
        setPersonalForm((prev: any) => ({ ...prev, img_url: newUrl }));
      }
    } catch (error: any) {
      NativeAlert.alert('Error', 'Could not upload image.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!student) return;

    setIsSaving(true);

    try {
      const { uid, ...updateData } = personalForm;

      const { error: studentError } = await supabase
        .from('students')
        .update(updateData)
        .eq('uid', student.uid);

      if (studentError) throw studentError;

      const { error: familyError } = await supabase.from('family_data').upsert({
        ...familyForm,
        student_uid: student.uid,
      });

      if (familyError) throw familyError;

      NativeAlert.alert('Success', 'Student profile updated successfully.');
      onSave();
      setIsOpen(false);
    } catch (error: any) {
      NativeAlert.alert('Error', error.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!student) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsOpen(false)}
    >
      <View className="flex-1 bg-zinc-100 pt-14 px-4">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-zinc-900">Edit Profile</Text>
            <Text className="text-zinc-500 text-sm">Editing {student.name}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            className="bg-zinc-200 p-2 rounded-full"
          >
            <X size={20} color="#09090b" />
          </TouchableOpacity>
        </View>

        <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-4">
          <TabButton
            label="Personal"
            active={activeTab === 'personal'}
            onPress={() => setActiveTab('personal')}
          />
          <TabButton
            label="Family"
            active={activeTab === 'family'}
            onPress={() => setActiveTab('family')}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {activeTab === 'personal' && (
            <View>
              <View className="items-center mb-4">
                <TouchableOpacity
                  onPress={handleAvatarUpdate}
                  disabled={isSaving}
                  className="relative"
                >
                  <View
                    className="h-28 w-28 rounded-full border-4 border-white overflow-hidden bg-zinc-200 justify-center items-center"
                    style={cardShadow()}
                  >
                    {preview ? (
                      <Image source={{ uri: preview }} className="h-full w-full" />
                    ) : (
                      <User size={40} color="#a1a1aa" />
                    )}
                  </View>

                  <View className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full border-2 border-white">
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Camera size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                <Text className="text-xs text-zinc-500 mt-2">Tap to change photo</Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Full Name</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.name || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, name: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Class ID</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.class_id || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, class_id: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Batch</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.batch || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, batch: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Council</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.council || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, council: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Phone</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.phone || ''}
                  keyboardType="phone-pad"
                  onChangeText={(t) => setPersonalForm({ ...personalForm, phone: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Guardian Name</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.guardian || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, guardian: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Guardian Phone</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={personalForm.g_phone || ''}
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
                  value={personalForm.address || ''}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, address: t })}
                />
              </View>
            </View>
          )}

          {activeTab === 'family' && (
            <View>
              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Father's Name</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={familyForm.father_name || ''}
                  onChangeText={(t) => setFamilyForm({ ...familyForm, father_name: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Father's Occupation</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={familyForm.father_occupation || ''}
                  onChangeText={(t) => setFamilyForm({ ...familyForm, father_occupation: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Mother's Name</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={familyForm.mother_name || ''}
                  onChangeText={(t) => setFamilyForm({ ...familyForm, mother_name: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Mother's Occupation</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={familyForm.mother_occupation || ''}
                  onChangeText={(t) => setFamilyForm({ ...familyForm, mother_occupation: t })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-1">Total Family Members</Text>
                <TextInput
                  className="bg-white border border-zinc-200 rounded-xl p-4 text-base"
                  value={familyForm.total_family_members?.toString() || ''}
                  keyboardType="numeric"
                  onChangeText={(t) =>
                    setFamilyForm({
                      ...familyForm,
                      total_family_members: t ? parseInt(t, 10) || null : null,
                    })
                  }
                />
              </View>
            </View>
          )}
        </ScrollView>

        <View className="py-4 border-t border-zinc-200">
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className="w-full py-4 rounded-xl flex-row justify-center items-center bg-zinc-900"
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ marginRight: 8 }}>
                <Save size={20} color="white" />
              </View>
            )}
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}