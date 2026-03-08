import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert as NativeAlert, Switch } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { PlusCircle, Trash2, Save, X } from 'lucide-react-native';

export function MarkEditorModal({ isOpen, setIsOpen, entry, onSave }: any) {
  const { user } = useUserData();
  const [title, setTitle] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setTitle(entry.title);
        setSubjects(JSON.parse(JSON.stringify(entry.subject_marks || [])));
      } else {
        setTitle('');
        setSubjects([{ subject_name: '', marks_obtained: '', status: true }]);
      }
    }
  }, [entry, isOpen]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { data: entryData, error: entryError } = await supabase.from('academic_entries')
        .upsert({ id: entry?.id, student_uid: user.id, title: title.toUpperCase() })
        .select().single();
      if (entryError) throw entryError;

      const toSave = subjects.map(s => ({
        ...s, entry_id: entryData.id, subject_name: s.subject_name.toUpperCase(), marks_obtained: s.marks_obtained.toUpperCase()
      }));

      const { error: subjectsError } = await supabase.from('subject_marks').upsert(toSave, { onConflict: 'id' });
      if (subjectsError) throw subjectsError;

      if (entry && entry.subject_marks) {
        const toDelete = entry.subject_marks.filter((old: any) => old.id && !subjects.some(n => n.id === old.id));
        if (toDelete.length > 0) {
          await supabase.from('subject_marks').delete().in('id', toDelete.map((s: any) => s.id));
        }
      }

      NativeAlert.alert("Success", "Record saved.");
      onSave(); setIsOpen(false);
    } catch (e: any) {
      NativeAlert.alert("Error", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
      <View className="flex-1 bg-zinc-100 pt-6 px-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-zinc-900">{entry?.id ? 'Edit' : 'Add'} Record</Text>
          <TouchableOpacity onPress={() => setIsOpen(false)}><X size={24} color="#09090b" /></TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-sm font-medium text-zinc-700 mb-1">Exam / Semester Title</Text>
          <TextInput className="bg-white border border-zinc-200 rounded-xl p-4 text-base uppercase mb-6" value={title} onChangeText={setTitle} placeholder="e.g. SSLC" />

          <Text className="text-sm font-bold text-zinc-900 mb-3">Subjects & Marks</Text>
          {subjects.map((sub, i) => (
            <View key={i} className="bg-white border border-zinc-200 p-3 rounded-xl mb-3">
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 uppercase text-sm mb-2" value={sub.subject_name} onChangeText={t => { const s = [...subjects]; s[i].subject_name = t; setSubjects(s); }} placeholder="Subject Name" />
              <View className="flex-row items-center gap-2">
                <TextInput className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 uppercase text-sm flex-1" value={sub.marks_obtained} onChangeText={t => { const s = [...subjects]; s[i].marks_obtained = t; setSubjects(s); }} placeholder="Mark" />
                <View className="flex-row items-center bg-zinc-50 border border-zinc-200 p-2 rounded-lg">
                  <Text className={`mr-2 font-bold text-xs ${sub.status ? 'text-green-600' : 'text-red-600'}`}>{sub.status ? 'PASS' : 'FAIL'}</Text>
                  <Switch value={sub.status} onValueChange={v => { const s = [...subjects]; s[i].status = v; setSubjects(s); }} />
                </View>
                <TouchableOpacity onPress={() => setSubjects(subjects.filter((_, idx) => idx !== i))} className="p-3 bg-red-50 rounded-lg"><Trash2 size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={() => setSubjects([...subjects, { subject_name: '', marks_obtained: '', status: true }])} className="w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl flex-row justify-center items-center mt-2">
            <PlusCircle size={20} color="#71717a" className="mr-2" />
            <Text className="font-bold text-zinc-600">Add Subject</Text>
          </TouchableOpacity>
        </ScrollView>

        <View className="py-4 border-t border-zinc-200">
          <TouchableOpacity onPress={handleSave} disabled={isSaving} className="w-full py-4 rounded-xl flex-row justify-center items-center bg-zinc-900">
            {isSaving ? <ActivityIndicator color="white" /> : <Save size={20} color="white" className="mr-2" />}
            <Text className="text-white font-bold text-lg ml-2">Save Record</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}