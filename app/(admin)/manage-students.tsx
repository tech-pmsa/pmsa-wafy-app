import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, Alert as NativeAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { Search, AlertTriangle, ChevronsRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

// Import our newly adapted sub-components
import { StudentCard } from '@/components/admin/manage-students/StudentCard';
import { ViewStudentModal } from '@/components/admin/manage-students/ViewStudentModal';
import { EditStudentModal } from '@/components/admin/manage-students/EditStudentModal';
import { PromoteClassModal } from '@/components/admin/manage-students/PromoteClassModal';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function ManageStudentsPage() {
  const { user: authUser, role: authRole, details: authDetails, loading: authLoading } = useUserData();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  // Modal States
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [classToPromote, setClassToPromote] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*');
      if (authRole === 'class' && authDetails?.batch) {
        query = query.eq('batch', authDetails.batch);
      }
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      setStudents(data || []);

      // Auto-expand the first class if officer
      if (authRole === 'officer' && data && data.length > 0) {
        setExpandedClass(data[0].class_id);
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [authRole, authDetails]);

  useEffect(() => {
    if (!authLoading && authRole) fetchData();
  }, [authLoading, authRole, fetchData]);

  // Actions
  const handleViewClick = (student: any) => { setSelectedStudent(student); setIsViewModalOpen(true); };
  const handleEditClick = (student: any) => { setSelectedStudent(student); setIsEditModalOpen(true); };

  const handleDeleteClick = (student: any) => {
    NativeAlert.alert("Delete Student", `Are you sure you want to permanently delete ${student.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const { error } = await supabase.functions.invoke('admin-actions', { body: { action: 'delete_user', uid: student.uid } });
          if (error) NativeAlert.alert("Error", error.message);
          else fetchData();
      }}
    ]);
  };

  const handleDeleteClassClick = (classId: string) => {
    NativeAlert.alert("Delete Class", `Delete ALL students in ${classId}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete All", style: "destructive", onPress: async () => {
          const { error } = await supabase.functions.invoke('admin-actions', { body: { action: 'delete_class', class_id: classId } });
          if (error) NativeAlert.alert("Error", error.message);
          else fetchData();
      }}
    ]);
  };

  const handlePromoteClassClick = (classId: string) => {
    setClassToPromote(classId);
    setIsPromoteModalOpen(true);
  };

  // Data Processing (Added strict types here)
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    return students.filter((s: any) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cic?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // Added Record and any type definitions to reduce parameters
  const groupedStudents = useMemo(() => filteredStudents.reduce((acc: Record<string, any[]>, student: any) => {
    const key = student.class_id || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(student);
    return acc;
  }, {} as Record<string, any[]>), [filteredStudents]);

  if (authLoading || loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Students...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">Manage Students</Text>
        <Text className="text-[#475569] font-muller mt-1.5">View, edit, and manage profiles.</Text>
      </View>

      <View className="px-4 mb-5">
        <View
          className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 shadow-sm"
          style={cardShadow()}
        >
          <Search size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
            placeholder="Search by name or CIC..."
            placeholderTextColor="#94A3B8"
            value={searchQuery} onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {authRole === 'officer' ? (
          // OFFICER VIEW (Accordion Grouped by Class)
          // Explicitly typed the mapped array elements below
          Object.entries(groupedStudents).sort().map(([classId, studentList]: [string, any[]]) => {
            const isExpanded = expandedClass === classId;
            return (
              <View
                key={classId}
                className="bg-[#FFFFFF] rounded-[18px] mb-5 border border-[#E2E8F0] overflow-hidden"
                style={cardShadow()}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedClass(isExpanded ? null : classId)}
                  className="flex-row items-center justify-between p-5 bg-[#F8FAFC] border-b border-[#E2E8F0]"
                >
                  <View className="flex-row items-center flex-1 pr-4">
                    <Text className="text-[17px] font-muller-bold text-[#0F172A] tracking-tight truncate" numberOfLines={1}>
                      {classId}
                    </Text>
                    <View className="bg-[#E2E8F0]/60 px-2.5 py-1 rounded-[8px] ml-3 border border-[#E2E8F0]">
                      <Text className="text-xs font-muller-bold text-[#475569]">{studentList.length}</Text>
                    </View>
                  </View>
                  {isExpanded ? <ChevronUp size={22} color="#94A3B8" /> : <ChevronDown size={22} color="#94A3B8" />}
                </TouchableOpacity>

                {isExpanded && (
                  <View className="p-4 bg-[#FFFFFF]">
                    <View className="flex-row justify-between mb-5 gap-3">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handlePromoteClassClick(classId)}
                        className="flex-1 py-3 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] flex-row justify-center items-center"
                      >
                        <ChevronsRight size={18} color="#0F172A" />
                        <Text className="font-muller-bold text-[#0F172A] ml-2 text-[13px] tracking-wide uppercase">Promote</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteClassClick(classId)}
                        className="flex-1 py-3 rounded-[12px] bg-[#DC2626]/10 border border-[#DC2626]/20 flex-row justify-center items-center"
                      >
                        <Trash2 size={18} color={COLORS.danger} />
                        <Text className="font-muller-bold text-[#DC2626] ml-2 text-[13px] tracking-wide uppercase">Delete Class</Text>
                      </TouchableOpacity>
                    </View>

                    <View className="space-y-3.5 gap-1">
                      {/* Explicitly typed student below */}
                      {studentList.map((student: any) => (
                        <StudentCard key={student.uid} student={student} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          // CLASS ROLE VIEW (Flat List of their specific batch)
          <View className="space-y-3.5 gap-1">
            {/* Explicitly typed student below */}
            {filteredStudents.map((student: any) => (
              <StudentCard key={student.uid} student={student} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <ViewStudentModal isOpen={isViewModalOpen} setIsOpen={setIsViewModalOpen} student={selectedStudent} />
      <EditStudentModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} student={selectedStudent} onSave={fetchData} />
      <PromoteClassModal isOpen={isPromoteModalOpen} setIsOpen={setIsPromoteModalOpen} currentClass={classToPromote} onSave={fetchData} />

    </SafeAreaView>
  );
}