import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { User, X } from 'lucide-react-native';

// Reusing the ProfileInfoLine from earlier
import { ProfileInfoLine } from '@/components/settings/profile/ProfileInfoLine';
import { UserCheck, Building, Shield, Phone, PhoneCall, Home, BookMarked, Briefcase, Users as FamilyIcon } from 'lucide-react-native';

export function ViewStudentModal({ isOpen, setIsOpen, student }: any) {
  const [activeTab, setActiveTab] = useState<'personal' | 'academics' | 'family'>('personal');
  const [marks, setMarks] = useState<any[]>([]);
  const [familyData, setFamilyData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      const fetchExtra = async () => {
        setLoading(true);
        const [mRes, fRes] = await Promise.all([
          supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', student.uid),
          supabase.from('family_data').select('*').eq('student_uid', student.uid).single()
        ]);
        setMarks(mRes.data || []);
        setFamilyData(fRes.data || {});
        setLoading(false);
      };
      fetchExtra();
    }
  }, [isOpen, student]);

  if (!student) return null;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
      <View className="flex-1 bg-zinc-100 pt-6 px-4">

        {/* Header */}
        <View className="flex-row justify-end mb-2">
          <TouchableOpacity onPress={() => setIsOpen(false)} className="bg-zinc-200 p-2 rounded-full"><X size={20} color="#09090b" /></TouchableOpacity>
        </View>

        <View className="items-center mb-6">
          <View className="h-24 w-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-zinc-200 justify-center items-center">
            {student.img_url ? <Image source={{ uri: student.img_url }} className="h-full w-full" /> : <User size={40} color="#a1a1aa" />}
          </View>
          <Text className="text-2xl font-bold text-zinc-900 mt-3">{student.name}</Text>
          <Text className="text-sm text-zinc-500">{student.cic}</Text>
        </View>

        {/* Tabs Switcher */}
        <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-4">
          <TouchableOpacity onPress={() => setActiveTab('personal')} className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'personal' ? 'bg-white shadow-sm' : ''}`}>
            <Text className={`font-semibold text-sm ${activeTab === 'personal' ? 'text-zinc-900' : 'text-zinc-500'}`}>Personal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('academics')} className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'academics' ? 'bg-white shadow-sm' : ''}`}>
            <Text className={`font-semibold text-sm ${activeTab === 'academics' ? 'text-zinc-900' : 'text-zinc-500'}`}>Academics</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('family')} className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'family' ? 'bg-white shadow-sm' : ''}`}>
            <Text className={`font-semibold text-sm ${activeTab === 'family' ? 'text-zinc-900' : 'text-zinc-500'}`}>Family</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#09090b" className="mt-10" />
          ) : (
            <View className="bg-white p-4 rounded-3xl border border-zinc-200">

              {activeTab === 'personal' && (
                <View>
                  <ProfileInfoLine icon={Building} label="Class" value={student.class_id} />
                  <ProfileInfoLine icon={Shield} label="Batch" value={student.batch} />
                  <ProfileInfoLine icon={FamilyIcon} label="Council" value={student.council} />
                  <ProfileInfoLine icon={Phone} label="Phone" value={student.phone} />
                  <ProfileInfoLine icon={User} label="Guardian" value={student.guardian} />
                  <ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={student.g_phone} />
                  <ProfileInfoLine icon={Home} label="Address" value={student.address} />
                </View>
              )}

              {activeTab === 'academics' && (
                <View>
                  {marks.length > 0 ? marks.map(entry => (
                    <View key={entry.id} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-3">
                      <Text className="font-bold text-zinc-900 mb-2">{entry.title}</Text>
                      {entry.subject_marks?.map((sm: any) => (
                        <View key={sm.id} className="flex-row justify-between mt-1">
                          <Text className="text-zinc-600 text-sm">{sm.subject_name}</Text>
                          <Text className={`text-sm font-bold ${sm.status ? 'text-green-600' : 'text-red-600'}`}>{sm.marks_obtained}</Text>
                        </View>
                      ))}
                    </View>
                  )) : <Text className="text-center text-zinc-500 py-6">No academic records found.</Text>}
                </View>
              )}

              {activeTab === 'family' && (
                <View>
                  <ProfileInfoLine icon={User} label="Father" value={familyData.father_name} />
                  <ProfileInfoLine icon={Briefcase} label="Father Occ." value={familyData.father_occupation} />
                  <ProfileInfoLine icon={User} label="Mother" value={familyData.mother_name} />
                  <ProfileInfoLine icon={FamilyIcon} label="Members" value={familyData.total_family_members?.toString()} />
                </View>
              )}
            </View>
          )}
        </ScrollView>

      </View>
    </Modal>
  );
}