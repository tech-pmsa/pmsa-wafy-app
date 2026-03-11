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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
      style={cardShadow()}
    >
      <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight mb-5">{title}</Text>
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
      <View className="flex-1 bg-[#F8FAFC] pt-14 px-5">
        <View className="flex-row justify-end mb-2">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsOpen(false)}
            className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
          >
            <X size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View className="items-center mb-8">
          <View
            className="h-28 w-28 rounded-full border-4 border-[#FFFFFF] overflow-hidden bg-[#F1F5F9] justify-center items-center"
            style={cardShadow()}
          >
            {student.img_url ? (
              <Image source={{ uri: student.img_url }} className="h-full w-full" />
            ) : (
              <User size={44} color="#94A3B8" />
            )}
          </View>

          <Text className="text-2xl font-muller-bold text-[#0F172A] mt-4 tracking-tight">{student.name}</Text>
          <Text className="text-[15px] font-muller text-[#475569] mt-1">{student.cic}</Text>
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
          {loading ? (
            <View className="pt-12 items-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
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
                            className="bg-[#F8FAFC] rounded-[16px] border border-[#E2E8F0] mb-3.5 overflow-hidden"
                          >
                            <TouchableOpacity
                              onPress={() =>
                                setExpandedAcademicId(isExpanded ? null : entry.id)
                              }
                              activeOpacity={0.7}
                              className="p-4 flex-row items-center justify-between"
                            >
                              <Text className="font-muller-bold text-[#0F172A] text-[15px] flex-1 pr-3">
                                {entry.title}
                              </Text>

                              {isExpanded ? (
                                <ChevronUp size={22} color="#94A3B8" />
                              ) : (
                                <ChevronDown size={22} color="#94A3B8" />
                              )}
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
                                  entry.subject_marks.map((sm: any) => (
                                    <View
                                      key={sm.id}
                                      className="flex-row items-center py-2.5 border-b border-[#E2E8F0]/60"
                                    >
                                      <Text className="flex-1 text-[13px] font-muller-bold text-[#0F172A] pr-2">
                                        {sm.subject_name}
                                      </Text>

                                      <Text className="w-20 text-[13px] font-muller-bold text-[#0F172A]">
                                        {sm.marks_obtained}
                                      </Text>

                                      {sm.status ? (
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
                                  <Text className="text-center font-muller text-[#94A3B8] py-4">
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
                    <Text className="text-center font-muller text-[#94A3B8] py-6">
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
                    <Text className="font-muller-bold text-lg text-[#0F172A] tracking-tight mb-4">Brothers</Text>

                    {familyData.brothers && familyData.brothers.length > 0 ? (
                      familyData.brothers.map((bro: any, i: number) => (
                        <View
                          key={i}
                          className="bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0] mb-3.5"
                        >
                          <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-3">
                            {bro.name || 'Unnamed'}
                          </Text>

                          <Text className="text-[13px] font-muller text-[#475569] mb-1.5 leading-relaxed">
                            <Text className="font-muller-bold text-[#0F172A]">Education: </Text>
                            {Array.isArray(bro.education)
                              ? bro.education.join(', ') || 'N/A'
                              : bro.education || 'N/A'}
                          </Text>

                          <Text className="text-[13px] font-muller text-[#475569] mb-1.5 leading-relaxed">
                            <Text className="font-muller-bold text-[#0F172A]">Occupation: </Text>
                            {bro.occupation || 'N/A'}
                          </Text>

                          <Text className="text-[13px] font-muller text-[#475569] leading-relaxed">
                            <Text className="font-muller-bold text-[#0F172A]">Responsibilities: </Text>
                            {Array.isArray(bro.responsibilities)
                              ? bro.responsibilities.join(', ') || 'N/A'
                              : bro.responsibilities || 'N/A'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-[13px] font-muller text-[#94A3B8] mb-5">
                        No brother information added.
                      </Text>
                    )}

                    <Text className="font-muller-bold text-lg text-[#0F172A] tracking-tight mb-4 mt-5 border-t border-[#E2E8F0] pt-5">
                      Sisters
                    </Text>

                    {familyData.sisters && familyData.sisters.length > 0 ? (
                      familyData.sisters.map((sis: any, i: number) => (
                        <View
                          key={i}
                          className="bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0] mb-3.5"
                        >
                          <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-3">
                            {sis.name || 'Unnamed'}
                          </Text>

                          <Text className="text-[13px] font-muller text-[#475569] mb-1.5 leading-relaxed">
                            <Text className="font-muller-bold text-[#0F172A]">Education: </Text>
                            {Array.isArray(sis.education)
                              ? sis.education.join(', ') || 'N/A'
                              : sis.education || 'N/A'}
                          </Text>

                          <Text className="text-[13px] font-muller text-[#475569] leading-relaxed">
                            <Text className="font-muller-bold text-[#0F172A]">Occupation: </Text>
                            {sis.occupation || 'N/A'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-[13px] font-muller text-[#94A3B8] mb-2">
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