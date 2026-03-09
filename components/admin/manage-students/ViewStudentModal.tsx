import React, { useEffect, useMemo, useState } from 'react';
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
import {
  User,
  X,
  ChevronDown,
  ChevronUp,
  Building,
  Shield,
  Phone,
  PhoneCall,
  Home,
  Album,
  Briefcase,
  Users as FamilyIcon,
  UserCheck,
} from 'lucide-react-native';

import { ProfileInfoLine } from '@/components/settings/profile/ProfileInfoLine';

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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="bg-white rounded-3xl p-4 border border-zinc-200 mb-4"
      style={cardShadow()}
    >
      <Text className="text-lg font-bold text-zinc-900 mb-4">{title}</Text>
      {children}
    </View>
  );
}

export function ViewStudentModal({ isOpen, setIsOpen, student }: any) {
  const [activeTab, setActiveTab] = useState<'personal' | 'academics' | 'family'>(
    'personal'
  );
  const [marks, setMarks] = useState<any[]>([]);
  const [familyData, setFamilyData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [expandedAcademicId, setExpandedAcademicId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !student) return;

    const fetchExtra = async () => {
      try {
        setLoading(true);

        const [mRes, fRes] = await Promise.all([
          supabase
            .from('academic_entries')
            .select('*, subject_marks(*)')
            .eq('student_uid', student.uid)
            .order('created_at', { ascending: true }),
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
      setExpandedAcademicId(null);
    }
  }, [isOpen]);

  const personalDetails = useMemo(
    () => [
      { label: 'CIC', value: student?.cic, icon: UserCheck },
      { label: 'Class', value: student?.class_id, icon: Building },
      { label: 'Batch', value: student?.batch, icon: Shield },
      { label: 'Council', value: student?.council, icon: FamilyIcon },
      { label: 'Phone', value: student?.phone, icon: Phone },
      { label: 'Guardian', value: student?.guardian, icon: User },
      { label: 'Guardian Phone', value: student?.g_phone, icon: PhoneCall },
      { label: 'SSLC Board', value: student?.sslc, icon: Album },
      { label: 'Plus Two Board', value: student?.plustwo, icon: Album },
      { label: 'Plus Two Stream', value: student?.plustwo_streams, icon: Album },
      { label: 'Address', value: student?.address, icon: Home },
    ],
    [student]
  );

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
            <>
              {activeTab === 'personal' && (
                <SectionCard title="Personal Details">
                  <View>
                    {personalDetails.map((item) => (
                      <ProfileInfoLine
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </View>
                </SectionCard>
              )}

              {activeTab === 'academics' && (
                <SectionCard title="Academic Records">
                  {marks.length > 0 ? (
                    <View>
                      {marks.map((entry: any) => {
                        const isExpanded = expandedAcademicId === entry.id;

                        return (
                          <View
                            key={entry.id}
                            className="bg-zinc-50 rounded-2xl border border-zinc-200 mb-3 overflow-hidden"
                          >
                            <TouchableOpacity
                              onPress={() =>
                                setExpandedAcademicId(isExpanded ? null : entry.id)
                              }
                              activeOpacity={0.7}
                              className="p-4 flex-row items-center justify-between"
                            >
                              <Text className="font-bold text-zinc-900 text-base flex-1 pr-3">
                                {entry.title}
                              </Text>

                              {isExpanded ? (
                                <ChevronUp size={20} color="#71717a" />
                              ) : (
                                <ChevronDown size={20} color="#71717a" />
                              )}
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
                                  entry.subject_marks.map((sm: any) => (
                                    <View
                                      key={sm.id}
                                      className="flex-row items-center py-2 border-b border-zinc-100"
                                    >
                                      <Text className="flex-1 text-sm font-semibold text-zinc-900 uppercase pr-2">
                                        {sm.subject_name}
                                      </Text>

                                      <Text className="w-20 text-sm text-zinc-700 uppercase">
                                        {sm.marks_obtained}
                                      </Text>

                                      {sm.status ? (
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
                                  <Text className="text-center text-zinc-500 py-4">
                                    No subjects found.
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text className="text-center text-zinc-500 py-6">
                      No academic records found.
                    </Text>
                  )}
                </SectionCard>
              )}

              {activeTab === 'family' && (
                <>
                  <SectionCard title="Parent & Household">
                    <ProfileInfoLine
                      icon={User}
                      label="Father's Name"
                      value={familyData.father_name}
                    />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Father's Occupation"
                      value={familyData.father_occupation}
                    />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Father's Staying Place"
                      value={familyData.father_staying_place}
                    />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Father's Responsibilities"
                      value={familyData.father_responsibilities}
                      isList
                    />
                    <ProfileInfoLine
                      icon={User}
                      label="Mother's Name"
                      value={familyData.mother_name}
                    />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Mother's Occupation"
                      value={familyData.mother_occupation}
                    />
                    <ProfileInfoLine
                      icon={FamilyIcon}
                      label="Total Family Members"
                      value={familyData.total_family_members?.toString()}
                    />
                    <ProfileInfoLine
                      icon={Home}
                      label="House Type"
                      value={familyData.house_type}
                    />
                    <ProfileInfoLine
                      icon={Home}
                      label="Chronically Ill Members"
                      value={
                        typeof familyData.chronically_ill_members === 'boolean'
                          ? familyData.chronically_ill_members
                            ? 'Yes'
                            : 'No'
                          : familyData.chronically_ill_members
                      }
                    />
                  </SectionCard>

                  <SectionCard title="Sibling Information">
                    <Text className="font-bold text-lg text-zinc-700 mb-3">Brothers</Text>

                    {familyData.brothers && familyData.brothers.length > 0 ? (
                      familyData.brothers.map((bro: any, i: number) => (
                        <View
                          key={i}
                          className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-3"
                        >
                          <Text className="font-bold text-zinc-900 text-base mb-2">
                            {bro.name || 'Unnamed'}
                          </Text>

                          <Text className="text-sm text-zinc-600 mb-1">
                            <Text className="font-bold">Education: </Text>
                            {Array.isArray(bro.education)
                              ? bro.education.join(', ') || 'N/A'
                              : bro.education || 'N/A'}
                          </Text>

                          <Text className="text-sm text-zinc-600 mb-1">
                            <Text className="font-bold">Occupation: </Text>
                            {bro.occupation || 'N/A'}
                          </Text>

                          <Text className="text-sm text-zinc-600">
                            <Text className="font-bold">Responsibilities: </Text>
                            {Array.isArray(bro.responsibilities)
                              ? bro.responsibilities.join(', ') || 'N/A'
                              : bro.responsibilities || 'N/A'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-sm text-zinc-500 mb-4">
                        No brother information added.
                      </Text>
                    )}

                    <Text className="font-bold text-lg text-zinc-700 mb-3 mt-4 border-t border-zinc-100 pt-4">
                      Sisters
                    </Text>

                    {familyData.sisters && familyData.sisters.length > 0 ? (
                      familyData.sisters.map((sis: any, i: number) => (
                        <View
                          key={i}
                          className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-3"
                        >
                          <Text className="font-bold text-zinc-900 text-base mb-2">
                            {sis.name || 'Unnamed'}
                          </Text>

                          <Text className="text-sm text-zinc-600 mb-1">
                            <Text className="font-bold">Education: </Text>
                            {Array.isArray(sis.education)
                              ? sis.education.join(', ') || 'N/A'
                              : sis.education || 'N/A'}
                          </Text>

                          <Text className="text-sm text-zinc-600">
                            <Text className="font-bold">Occupation: </Text>
                            {sis.occupation || 'N/A'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-sm text-zinc-500 mb-4">
                        No sister information added.
                      </Text>
                    )}
                  </SectionCard>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}