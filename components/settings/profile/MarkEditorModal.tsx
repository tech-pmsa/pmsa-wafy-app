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
      <View className="flex-1 bg-zinc-100 pt-14 px-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-zinc-900">
            {entry?.id ? 'Edit' : 'Add'} Record
          </Text>
          <TouchableOpacity onPress={() => setIsOpen(false)}>
            <X size={24} color="#09090b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text className="text-sm font-medium text-zinc-700 mb-1">
            Exam / Semester Title
          </Text>

          <TextInput
            className="bg-white border border-zinc-200 rounded-xl p-4 text-base mb-6"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. SSLC"
            autoCapitalize="characters"
          />

          <Text className="text-sm font-bold text-zinc-900 mb-3">
            Subjects & Marks
          </Text>

          {subjects.map((sub, i) => (
            <View
              key={i}
              className="bg-white border border-zinc-200 p-3 rounded-xl mb-3"
            >
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm mb-2"
                value={sub.subject_name}
                onChangeText={(t) => updateSubject(i, 'subject_name', t)}
                placeholder="Subject Name"
                autoCapitalize="characters"
              />

              <View className="flex-row items-center">
                <TextInput
                  className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm flex-1 mr-2"
                  value={sub.marks_obtained}
                  onChangeText={(t) => updateSubject(i, 'marks_obtained', t)}
                  placeholder="Mark"
                  autoCapitalize="characters"
                />

                <View className="flex-row items-center bg-zinc-50 border border-zinc-200 p-2 rounded-lg mr-2">
                  {sub.status ? (
                    <Text className="mr-2 font-bold text-xs text-green-600">
                      PASS
                    </Text>
                  ) : (
                    <Text className="mr-2 font-bold text-xs text-red-600">
                      FAIL
                    </Text>
                  )}

                  <Switch
                    value={!!sub.status}
                    onValueChange={(v) => updateSubject(i, 'status', v)}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => removeSubject(i)}
                  className="p-3 bg-red-50 rounded-lg"
                >
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={addSubject}
            className="w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl flex-row justify-center items-center mt-2"
          >
            <View style={{ marginRight: 8 }}>
              <PlusCircle size={20} color="#71717a" />
            </View>
            <Text className="font-bold text-zinc-600">Add Subject</Text>
          </TouchableOpacity>
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

            <Text className="text-white font-bold text-lg">
              Save Record
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}