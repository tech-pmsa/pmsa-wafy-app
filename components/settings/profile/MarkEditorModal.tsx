import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert as NativeAlert,
  Switch,
} from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { PlusCircle, Trash2, Save, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

export function MarkEditorModal({ isOpen, setIsOpen, entry, onSave }: any) {
  const { user } = useUserData();
  const [title, setTitle] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (entry) {
      setTitle(entry.title || '');
      setSubjects(JSON.parse(JSON.stringify(entry.subject_marks || [])));
    } else {
      setTitle('');
      setSubjects([{ subject_name: '', marks_obtained: '', status: true }]);
    }
  }, [entry, isOpen]);

  const updateSubject = (index: number, field: string, value: any) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeSubject = (index: number) => {
    setSubjects((prev) => prev.filter((_: any, idx: number) => idx !== index));
  };

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      { subject_name: '', marks_obtained: '', status: true },
    ]);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { data: entryData, error: entryError } = await supabase
        .from('academic_entries')
        .upsert({
          id: entry?.id,
          student_uid: user.id,
          title: title.toUpperCase(),
        })
        .select()
        .single();

      if (entryError) throw entryError;

      const toSave = subjects.map((subject) => ({
        ...subject,
        entry_id: entryData.id,
        subject_name: (subject.subject_name || '').toUpperCase(),
        marks_obtained: String(subject.marks_obtained || '').toUpperCase(),
      }));

      const { error: subjectsError } = await supabase
        .from('subject_marks')
        .upsert(toSave, { onConflict: 'id' });

      if (subjectsError) throw subjectsError;

      if (entry && entry.subject_marks) {
        const toDelete = entry.subject_marks.filter(
          (oldItem: any) => oldItem.id && !subjects.some((newItem) => newItem.id === oldItem.id)
        );

        if (toDelete.length > 0) {
          await supabase
            .from('subject_marks')
            .delete()
            .in(
              'id',
              toDelete.map((item: any) => item.id)
            );
        }
      }

      NativeAlert.alert('Success', 'Record saved.');
      onSave();
      setIsOpen(false);
    } catch (e: any) {
      NativeAlert.alert('Error', e.message || 'Failed to save record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsOpen(false)}
    >
      <View className="flex-1 bg-[#F8FAFC] pt-14 px-5">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">
            {entry?.id ? 'Edit' : 'Add'} Record
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsOpen(false)}
            className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
          >
            <X size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text className="text-[13px] font-muller-bold text-[#475569] mb-2 ml-1">
            Exam / Semester Title
          </Text>

          <TextInput
            className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller-bold text-[#0F172A] rounded-[14px] p-4 text-[16px] mb-8 shadow-sm"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. SSLC"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
          />

          <Text className="text-[15px] font-muller-bold text-[#0F172A] tracking-tight mb-4 ml-1">
            Subjects & Marks
          </Text>

          {subjects.map((sub, i) => (
            <View
              key={i}
              className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-[16px] mb-4 shadow-sm"
            >
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller-bold text-[#0F172A] rounded-[12px] p-3.5 text-[15px] mb-3"
                value={sub.subject_name}
                onChangeText={(t) => updateSubject(i, 'subject_name', t)}
                placeholder="Subject Name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />

              <View className="flex-row items-center">
                <TextInput
                  className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller-bold text-[#0F172A] rounded-[12px] p-3.5 text-[15px] flex-1 mr-3"
                  value={sub.marks_obtained}
                  onChangeText={(t) => updateSubject(i, 'marks_obtained', t)}
                  placeholder="Mark"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />

                <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-[12px] mr-3">
                  {sub.status ? (
                    <Text className="mr-2 font-muller-bold text-[11px] text-[#16A34A] uppercase tracking-wider ml-1">
                      PASS
                    </Text>
                  ) : (
                    <Text className="mr-2 font-muller-bold text-[11px] text-[#DC2626] uppercase tracking-wider ml-1">
                      FAIL
                    </Text>
                  )}

                  <Switch
                    value={!!sub.status}
                    onValueChange={(v) => updateSubject(i, 'status', v)}
                    trackColor={{ false: '#E2E8F0', true: COLORS.success }}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => removeSubject(i)}
                  className="p-3.5 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-[12px]"
                >
                  <Trash2 size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={addSubject}
            className="w-full py-4 border border-dashed border-[#94A3B8] bg-[#F8FAFC] rounded-[14px] flex-row justify-center items-center mt-3"
          >
            <View style={{ marginRight: 8 }}>
              <PlusCircle size={20} color="#475569" />
            </View>
            <Text className="font-muller-bold text-[#475569] text-[15px] tracking-wide">Add Subject</Text>
          </TouchableOpacity>
        </ScrollView>

        <View className="py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isSaving}
            className={`w-full py-4 rounded-[14px] flex-row justify-center items-center shadow-sm ${
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

            <Text className="text-white font-muller-bold text-[16px] tracking-wide ml-1.5">
              Save Record
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}