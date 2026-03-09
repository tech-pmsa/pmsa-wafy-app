import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabaseClient';
import {
  Camera,
  Save,
  X,
  User,
  PlusCircle,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { MarkEditorModal } from '@/components/settings/profile/MarkEditorModal';

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
      className={
        active
          ? 'flex-1 py-2.5 rounded-lg items-center bg-white'
          : 'flex-1 py-2.5 rounded-lg items-center'
      }
      style={active ? cardShadow() : undefined}
    >
      <Text
        className={
          active
            ? 'font-semibold text-sm text-zinc-900'
            : 'font-semibold text-sm text-zinc-500'
        }
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
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-zinc-700 mb-1">{label}</Text>
      <TextInput
        className={`bg-white border border-zinc-200 rounded-xl p-4 text-base ${multiline ? 'h-24' : ''
          }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
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
    onChange(siblings.filter((_, i) => i !== index));
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
        siblings.map((sib, index) => (
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
                  t
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
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
                    t
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
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

export function EditStudentModal({ isOpen, setIsOpen, student, onSave }: any) {
  const [activeTab, setActiveTab] = useState<'personal' | 'academics' | 'family'>(
    'personal'
  );
  const [personalForm, setPersonalForm] = useState<any>({});
  const [fatherResponsibilitiesText, setFatherResponsibilitiesText] = useState('');
  const [familyForm, setFamilyForm] = useState<any>({});
  const [academicEntries, setAcademicEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedAcademicId, setExpandedAcademicId] = useState<number | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!student) return;

    const [familyRes, academicsRes] = await Promise.all([
      supabase.from('family_data').select('*').eq('student_uid', student.uid).single(),
      supabase
        .from('academic_entries')
        .select('*, subject_marks(*)')
        .eq('student_uid', student.uid)
        .order('created_at', { ascending: true }),
    ]);

    if (familyRes.data) {
      setFamilyForm(familyRes.data);
      setFatherResponsibilitiesText(
        Array.isArray(familyRes.data.father_responsibilities)
          ? familyRes.data.father_responsibilities.join(', ')
          : ''
      );
    }
    if (!familyRes.data) {
      setFamilyForm({});
      setFatherResponsibilitiesText('');
    }
    setAcademicEntries(academicsRes.data || []);
  }, [student]);

  useEffect(() => {
    if (!student || !isOpen) return;

    setActiveTab('personal');
    setExpandedAcademicId(null);
    setSelectedEntry(null);
    setPersonalForm(student);
    setPreview(student.img_url || null);
    setUploadedImageUrl(student.img_url || null);
    fetchAllData();
  }, [student, isOpen, fetchAllData]);

  const handlePersonalChange = (field: string, value: any) => {
    setPersonalForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFamilyChange = (field: string, value: any) => {
    setFamilyForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSiblingsUpdate = (type: 'brothers' | 'sisters', updated: any[]) => {
    setFamilyForm((prev: any) => ({ ...prev, [type]: updated }));
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
        setUploadedImageUrl(newUrl);
        setPersonalForm((prev: any) => ({ ...prev, img_url: newUrl }));
      }
    } catch (error: any) {
      NativeAlert.alert('Error', error?.message || 'Could not upload image.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEntryDelete = async (entryId: number) => {
    const { error } = await supabase.from('academic_entries').delete().eq('id', entryId);

    if (error) {
      NativeAlert.alert('Error', error.message || 'Failed to delete record.');
      return;
    }

    await fetchAllData();
    NativeAlert.alert('Success', 'Academic record deleted.');
  };

  const handleSave = async () => {
    if (!student) return;

    setIsSaving(true);

    try {
      const { uid, ...restPersonal } = personalForm;

      const finalUpdateData = {
        ...restPersonal,
        img_url: uploadedImageUrl || personalForm.img_url || null,
      };

      const { error: studentError } = await supabase
        .from('students')
        .update(finalUpdateData)
        .eq('uid', student.uid);

      if (studentError) throw studentError;

      const familyPayload = {
        ...familyForm,
        father_responsibilities: fatherResponsibilitiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        student_uid: student.uid,
      };

      const { error: familyError } = await supabase.from('family_data').upsert(familyPayload);

      if (familyError) throw familyError;

      NativeAlert.alert('Success', 'Student profile updated successfully.');
      await fetchAllData();
      onSave?.();
      setIsOpen(false);
    } catch (error: any) {
      NativeAlert.alert('Error', error?.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const chronicallyIllChecked = !!familyForm.chronically_ill_members;

  const personalFields = useMemo(
    () => [
      ['Full Name', 'name'],
      ['Class ID', 'class_id'],
      ['Batch', 'batch'],
      ['Council', 'council'],
      ['CIC', 'cic'],
      ['Phone', 'phone'],
      ['Guardian Name', 'guardian'],
      ['Guardian Phone', 'g_phone'],
      ['SSLC Board', 'sslc'],
      ['Plus Two Board', 'plustwo'],
      ['Plus Two Stream', 'plustwo_streams'],
    ],
    []
  );

  if (!student) return null;

  return (
    <>
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
              label="Academics"
              active={activeTab === 'academics'}
              onPress={() => setActiveTab('academics')}
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
                <View
                  className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
                  style={cardShadow()}
                >
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

                  {personalFields.map(([label, key]) => (
                    <InputField
                      key={key}
                      label={label}
                      value={personalForm[key] || ''}
                      onChangeText={(t) => handlePersonalChange(key, t)}
                      keyboardType={
                        key === 'phone' || key === 'g_phone' ? 'phone-pad' : 'default'
                      }
                    />
                  ))}

                  <InputField
                    label="Address"
                    value={personalForm.address || ''}
                    onChangeText={(t) => handlePersonalChange('address', t)}
                    multiline
                  />
                </View>
              </View>
            )}

            {activeTab === 'academics' && (
              <View
                className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
                style={cardShadow()}
              >
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-zinc-900">Academic Records</Text>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEntry(null);
                      setIsMarkModalOpen(true);
                    }}
                    className="bg-zinc-900 px-3 py-2 rounded-xl flex-row items-center"
                  >
                    <View style={{ marginRight: 6 }}>
                      <PlusCircle size={16} color="white" />
                    </View>
                    <Text className="text-white font-bold text-xs">Add</Text>
                  </TouchableOpacity>
                </View>

                {academicEntries.length > 0 ? (
                  academicEntries.map((entry: any) => {
                    const isExpanded = expandedAcademicId === entry.id;

                    return (
                      <View
                        key={entry.id}
                        className="bg-zinc-50 rounded-2xl border border-zinc-200 mb-3 overflow-hidden"
                      >
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() =>
                            setExpandedAcademicId(isExpanded ? null : entry.id)
                          }
                          className="p-4 flex-row items-center justify-between"
                        >
                          <Text className="font-bold text-zinc-900 text-base flex-1 pr-3">
                            {entry.title}
                          </Text>

                          <View className="flex-row items-center">
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedEntry(entry);
                                setIsMarkModalOpen(true);
                              }}
                              className="p-2 bg-white rounded-full border border-zinc-200 mr-2"
                            >
                              <Pencil size={16} color="#09090b" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleEntryDelete(entry.id)}
                              className="p-2 bg-white rounded-full border border-zinc-200 mr-2"
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>

                            {isExpanded ? (
                              <ChevronUp size={20} color="#71717a" />
                            ) : (
                              <ChevronDown size={20} color="#71717a" />
                            )}
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View className="px-4 pb-4 border-t border-zinc-200 pt-3">
                            <View className="flex-row border-b border-zinc-200 pb-2 mb-2">
                              <Text className="flex-1 text-xs font-bold text-zinc-500 uppercase">
                                Subject
                              </Text>
                              <Text className="w-20 text-xs font-bold text-zinc-500 uppercase">
                                Mark
                              </Text>
                              <Text className="w-20 text-right text-xs font-bold text-zinc-500 uppercase">
                                Status
                              </Text>
                            </View>

                            {entry.subject_marks && entry.subject_marks.length > 0 ? (
                              entry.subject_marks.map((subject: any) => (
                                <View
                                  key={subject.id}
                                  className="flex-row items-center py-2 border-b border-zinc-100"
                                >
                                  <Text className="flex-1 font-semibold text-zinc-900 uppercase text-xs pr-2">
                                    {subject.subject_name}
                                  </Text>

                                  <Text className="w-20 text-zinc-800 uppercase text-xs">
                                    {subject.marks_obtained}
                                  </Text>

                                  {subject.status ? (
                                    <View className="w-20 items-end">
                                      <View className="bg-green-100 px-2 py-1 rounded">
                                        <Text className="text-[10px] font-bold text-green-700">
                                          Passed
                                        </Text>
                                      </View>
                                    </View>
                                  ) : (
                                    <View className="w-20 items-end">
                                      <View className="bg-red-100 px-2 py-1 rounded">
                                        <Text className="text-[10px] font-bold text-red-700">
                                          Failed
                                        </Text>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              ))
                            ) : (
                              <Text className="text-sm text-zinc-500 py-3 text-center">
                                No subjects added.
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text className="text-sm text-zinc-500 py-4 text-center">
                    No academic records found.
                  </Text>
                )}
              </View>
            )}

            {activeTab === 'family' && (
              <View>
                <View
                  className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-bold text-zinc-900 mb-4">Household</Text>

                  <InputField
                    label="Total Family Members"
                    value={familyForm.total_family_members?.toString() || ''}
                    onChangeText={(t) =>
                      handleFamilyChange(
                        'total_family_members',
                        t ? parseInt(t, 10) || null : null
                      )
                    }
                    keyboardType="numeric"
                  />

                  <InputField
                    label="House Type"
                    value={familyForm.house_type || ''}
                    onChangeText={(t) => handleFamilyChange('house_type', t)}
                  />

                  <View className="mb-2">
                    <Text className="text-sm font-medium text-zinc-700 mb-2">
                      Are there chronically ill members in the house?
                    </Text>
                    <View className="flex-row items-center justify-between bg-white border border-zinc-200 rounded-xl p-4">
                      <Text className="text-base text-zinc-900">
                        {chronicallyIllChecked ? 'Yes' : 'No'}
                      </Text>
                      <Switch
                        value={chronicallyIllChecked}
                        onValueChange={(v) =>
                          handleFamilyChange('chronically_ill_members', v)
                        }
                      />
                    </View>
                  </View>
                </View>

                <View
                  className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-bold text-zinc-900 mb-4">
                    Parent Details
                  </Text>

                  <InputField
                    label="Father's Name"
                    value={familyForm.father_name || ''}
                    onChangeText={(t) => handleFamilyChange('father_name', t)}
                  />

                  <InputField
                    label="Father's Occupation"
                    value={familyForm.father_occupation || ''}
                    onChangeText={(t) => handleFamilyChange('father_occupation', t)}
                  />

                  <InputField
                    label="Father's Staying Place"
                    value={familyForm.father_staying_place || ''}
                    onChangeText={(t) =>
                      handleFamilyChange('father_staying_place', t)
                    }
                  />

                  <InputField
                    label="Father's Responsibilities (comma separated)"
                    value={fatherResponsibilitiesText}
                    multiline
                    onChangeText={(t) => setFatherResponsibilitiesText(t)}
                  />

                  <InputField
                    label="Mother's Name"
                    value={familyForm.mother_name || ''}
                    onChangeText={(t) => handleFamilyChange('mother_name', t)}
                  />

                  <InputField
                    label="Mother's Occupation"
                    value={familyForm.mother_occupation || ''}
                    onChangeText={(t) => handleFamilyChange('mother_occupation', t)}
                  />
                </View>

                <SiblingCard
                  title="brothers"
                  siblings={familyForm.brothers || []}
                  onChange={(next) => handleSiblingsUpdate('brothers', next)}
                  showResponsibilities={true}
                />

                <SiblingCard
                  title="sisters"
                  siblings={familyForm.sisters || []}
                  onChange={(next) => handleSiblingsUpdate('sisters', next)}
                  showResponsibilities={false}
                />
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

      {student && (
        <MarkEditorModal
          isOpen={isMarkModalOpen}
          setIsOpen={setIsMarkModalOpen}
          entry={selectedEntry}
          student_uid={student.uid}
          onSave={fetchAllData}
        />
      )}
    </>
  );
}