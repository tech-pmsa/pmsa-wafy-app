import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { User, X } from 'lucide-react-native';

import { ProfileInfoLine } from '@/components/settings/profile/ProfileInfoLine';
import {
  Building,
  Shield,
  Phone,
  PhoneCall,
  Home,
  Briefcase,
  Users as FamilyIcon,
} from 'lucide-react-native';

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

export function ViewStudentModal({ isOpen, setIsOpen, student }: any) {
  const [activeTab, setActiveTab] = useState<'personal' | 'academics' | 'family'>('personal');
  const [marks, setMarks] = useState<any[]>([]);
  const [familyData, setFamilyData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;

    const fetchExtra = async () => {
      try {
        setLoading(true);

        const [mRes, fRes] = await Promise.all([
          supabase
            .from('academic_entries')
            .select('*, subject_marks(*)')
            .eq('student_uid', student.uid),
          supabase
            .from('family_data')
            .select('*')
            .eq('student_uid', student.uid)
            .single(),
        ]);

        setMarks(mRes.data || []);
        setFamilyData(fRes.data || {});
      } finally {
        setLoading(false);
      }
    };

    fetchExtra();
  }, [isOpen, student]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('personal');
    }
  }, [isOpen]);

  if (!student) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsOpen(false)}
    >
      <View className="flex-1 bg-zinc-100 pt-14 px-4">
        <View className="flex-row justify-end mb-2">
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            className="bg-zinc-200 p-2 rounded-full"
          >
            <X size={20} color="#09090b" />
          </TouchableOpacity>
        </View>

        <View className="items-center mb-6">
          <View
            className="h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-zinc-200 justify-center items-center"
            style={cardShadow()}
          >
            {student.img_url ? (
              <Image source={{ uri: student.img_url }} className="h-full w-full" />
            ) : (
              <User size={40} color="#a1a1aa" />
            )}
          </View>

          <Text className="text-2xl font-bold text-zinc-900 mt-3">{student.name}</Text>
          <Text className="text-sm text-zinc-500">{student.cic}</Text>
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
          {loading ? (
            <View className="pt-10 items-center">
              <ActivityIndicator size="large" color="#09090b" />
            </View>
          ) : (
            <View
              className="bg-white p-4 rounded-3xl border border-zinc-200"
              style={cardShadow()}
            >
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
                  {marks.length > 0 ? (
                    marks.map((entry: any) => (
                      <View
                        key={entry.id}
                        className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-3"
                      >
                        <Text className="font-bold text-zinc-900 mb-2">{entry.title}</Text>

                        {entry.subject_marks?.map((sm: any) => (
                          <View key={sm.id} className="flex-row justify-between mt-1">
                            <Text className="text-zinc-600 text-sm">{sm.subject_name}</Text>

                            {sm.status ? (
                              <Text className="text-sm font-bold text-green-600">
                                {sm.marks_obtained}
                              </Text>
                            ) : (
                              <Text className="text-sm font-bold text-red-600">
                                {sm.marks_obtained}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ))
                  ) : (
                    <Text className="text-center text-zinc-500 py-6">
                      No academic records found.
                    </Text>
                  )}
                </View>
              )}

              {activeTab === 'family' && (
                <View>
                  <ProfileInfoLine icon={User} label="Father" value={familyData.father_name} />
                  <ProfileInfoLine
                    icon={Briefcase}
                    label="Father Occ."
                    value={familyData.father_occupation}
                  />
                  <ProfileInfoLine icon={User} label="Mother" value={familyData.mother_name} />
                  <ProfileInfoLine
                    icon={FamilyIcon}
                    label="Members"
                    value={familyData.total_family_members?.toString()}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}