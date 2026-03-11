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
import { COLORS } from '@/constants/theme';

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
    <View className="mb-5">
      <Text className="text-sm font-muller-bold text-[#475569] mb-2 ml-1">{label}</Text>
      <TextInput
        className={`bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[16px] shadow-sm ${
          multiline ? 'h-28' : ''
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
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
    onChange(siblings.filter((_, i) => i !== index));
  };

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-5">
        <Text className="text-lg font-muller-bold text-[#0F172A] capitalize">{title}</Text>

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
        siblings.map((sib, index) => (
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
        <Text className="text-sm font-muller text-[#94A3B8]">No {title} added.</Text>
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
        <View className="flex-1 bg-[#F8FAFC] pt-14 px-5">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">Edit Profile</Text>
              <Text className="text-[#475569] font-muller text-sm mt-0.5">Editing {student.name}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsOpen(false)}
              className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="flex-row bg-[#E2E8F0]/60 p-1.5 rounded-[16px] mb-6">
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
                  className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
                  style={cardShadow()}
                >
                  <View className="items-center mb-6 mt-2">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleAvatarUpdate}
                      disabled={isSaving}
                      className="relative"
                    >
                      <View
                        className="h-28 w-28 rounded-full border-4 border-[#FFFFFF] overflow-hidden bg-[#F1F5F9] justify-center items-center"
                        style={cardShadow()}
                      >
                        {preview ? (
                          <Image source={{ uri: preview }} className="h-full w-full" />
                        ) : (
                          <User size={44} color="#94A3B8" />
                        )}
                      </View>

                      <View className="absolute bottom-0 right-0 bg-[#1E40AF] p-3 rounded-full border-2 border-[#FFFFFF] shadow-sm">
                        {isSaving ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Camera size={16} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>

                    <Text className="text-[11px] font-muller-bold text-[#94A3B8] mt-3 uppercase tracking-wider">Tap to change photo</Text>
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
                className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
                style={cardShadow()}
              >
                <View className="flex-row justify-between items-center mb-5">
                  <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight">Academic Records</Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedEntry(null);
                      setIsMarkModalOpen(true);
                    }}
                    className="bg-[#1E40AF]/10 px-3.5 py-2.5 rounded-[12px] border border-[#1E40AF]/20 flex-row items-center"
                  >
                    <View style={{ marginRight: 6 }}>
                      <PlusCircle size={16} color={COLORS.primary} />
                    </View>
                    <Text className="text-[#1E40AF] font-muller-bold text-xs uppercase tracking-wider">Add</Text>
                  </TouchableOpacity>
                </View>

                {academicEntries.length > 0 ? (
                  academicEntries.map((entry: any) => {
                    const isExpanded = expandedAcademicId === entry.id;

                    return (
                      <View
                        key={entry.id}
                        className="bg-[#F8FAFC] rounded-[16px] border border-[#E2E8F0] mb-3.5 overflow-hidden"
                      >
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() =>
                            setExpandedAcademicId(isExpanded ? null : entry.id)
                          }
                          className="p-4 flex-row items-center justify-between"
                        >
                          <Text className="font-muller-bold text-[#0F172A] text-[15px] flex-1 pr-3">
                            {entry.title}
                          </Text>

                          <View className="flex-row items-center">
                            <TouchableOpacity
                              activeOpacity={0.6}
                              onPress={() => {
                                setSelectedEntry(entry);
                                setIsMarkModalOpen(true);
                              }}
                              className="p-2 bg-[#FFFFFF] rounded-[10px] border border-[#E2E8F0] mr-2"
                            >
                              <Pencil size={16} color={COLORS.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.6}
                              onPress={() => handleEntryDelete(entry.id)}
                              className="p-2 bg-[#FFFFFF] rounded-[10px] border border-[#E2E8F0] mr-2.5"
                            >
                              <Trash2 size={16} color={COLORS.danger} />
                            </TouchableOpacity>

                            {isExpanded ? (
                              <ChevronUp size={22} color="#94A3B8" />
                            ) : (
                              <ChevronDown size={22} color="#94A3B8" />
                            )}
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View className="px-4 pb-4 border-t border-[#E2E8F0] pt-3.5">
                            <View className="flex-row border-b border-[#E2E8F0] pb-2 mb-2.5">
                              <Text className="flex-1 text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
                                Subject
                              </Text>
                              <Text className="w-20 text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
                                Mark
                              </Text>
                              <Text className="w-20 text-right text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
                                Status
                              </Text>
                            </View>

                            {entry.subject_marks && entry.subject_marks.length > 0 ? (
                              entry.subject_marks.map((subject: any) => (
                                <View
                                  key={subject.id}
                                  className="flex-row items-center py-2.5 border-b border-[#E2E8F0]/60"
                                >
                                  <Text className="flex-1 font-muller-bold text-[#0F172A] text-[13px] pr-2">
                                    {subject.subject_name}
                                  </Text>

                                  <Text className="w-20 font-muller-bold text-[#0F172A] text-[13px]">
                                    {subject.marks_obtained}
                                  </Text>

                                  {subject.status ? (
                                    <View className="w-20 items-end">
                                      <View className="bg-[#16A34A]/10 px-2.5 py-1.5 rounded-[8px] border border-[#16A34A]/20">
                                        <Text className="text-[10px] font-muller-bold text-[#16A34A] uppercase tracking-wider">
                                          Passed
                                        </Text>
                                      </View>
                                    </View>
                                  ) : (
                                    <View className="w-20 items-end">
                                      <View className="bg-[#DC2626]/10 px-2.5 py-1.5 rounded-[8px] border border-[#DC2626]/20">
                                        <Text className="text-[10px] font-muller-bold text-[#DC2626] uppercase tracking-wider">
                                          Failed
                                        </Text>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              ))
                            ) : (
                              <Text className="text-[13px] font-muller text-[#94A3B8] py-3 text-center">
                                No subjects added.
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text className="text-[13px] font-muller text-[#94A3B8] py-4 text-center">
                    No academic records found.
                  </Text>
                )}
              </View>
            )}

            {activeTab === 'family' && (
              <View>
                <View
                  className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-muller-bold text-[#0F172A] mb-5 tracking-tight">Household</Text>

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
                    <Text className="text-sm font-muller-bold text-[#475569] mb-2.5 ml-1">
                      Are there chronically ill members in the house?
                    </Text>
                    <View className="flex-row items-center justify-between bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm rounded-[14px] p-4">
                      <Text className="text-[16px] font-muller-bold text-[#0F172A]">
                        {chronicallyIllChecked ? 'Yes' : 'No'}
                      </Text>
                      <Switch
                        value={chronicallyIllChecked}
                        onValueChange={(v) =>
                          handleFamilyChange('chronically_ill_members', v)
                        }
                        trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                      />
                    </View>
                  </View>
                </View>

                <View
                  className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
                  style={cardShadow()}
                >
                  <Text className="text-lg font-muller-bold text-[#0F172A] mb-5 tracking-tight">
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

          <View className="py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={isSaving}
              className={`w-full py-4 rounded-[14px] flex-row justify-center items-center ${
                isSaving ? 'bg-[#1E40AF]/60' : 'bg-[#1E40AF]'
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={{ marginRight: 8 }}>
                  <Save size={20} color="white" />
                </View>
              )}
              <Text className="text-white font-muller-bold text-[16px] tracking-wide ml-1.5">Save Changes</Text>
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