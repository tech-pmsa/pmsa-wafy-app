import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, Alert as NativeAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { Search, AlertTriangle, ChevronsRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';

// Import our newly adapted sub-components
import { StudentCard } from '@/components/admin/manage-students/StudentCard';
import { ViewStudentModal } from '@/components/admin/manage-students/ViewStudentModal';
import { EditStudentModal } from '@/components/admin/manage-students/EditStudentModal';
import { PromoteClassModal } from '@/components/admin/manage-students/PromoteClassModal';

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
      <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center">
        <ActivityIndicator size="large" color="#09090b" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-bold text-zinc-900">Manage Students</Text>
        <Text className="text-zinc-500 mt-1">View, edit, and manage profiles.</Text>
      </View>

      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm">
          <Search size={20} color="#a1a1aa" />
          <TextInput
            className="flex-1 ml-2 text-base text-zinc-900"
            placeholder="Search by name or CIC..."
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
              <View key={classId} className="bg-white rounded-3xl mb-4 shadow-sm border border-zinc-200 overflow-hidden">
                <TouchableOpacity
                  onPress={() => setExpandedClass(isExpanded ? null : classId)}
                  className="flex-row items-center justify-between p-5 bg-zinc-50 border-b border-zinc-100"
                >
                  <View className="flex-row items-center">
                    <Text className="text-xl font-bold text-zinc-900">{classId}</Text>
                    <View className="bg-zinc-200 px-2 py-0.5 rounded-full ml-3">
                      <Text className="text-xs font-bold text-zinc-700">{studentList.length}</Text>
                    </View>
                  </View>
                  {isExpanded ? <ChevronUp size={24} color="#71717a" /> : <ChevronDown size={24} color="#71717a" />}
                </TouchableOpacity>

                {isExpanded && (
                  <View className="p-4">
                    <View className="flex-row justify-between mb-4 gap-2">
                      <TouchableOpacity onPress={() => handlePromoteClassClick(classId)} className="flex-1 py-2.5 rounded-xl border border-zinc-300 flex-row justify-center items-center">
                        <ChevronsRight size={16} color="#09090b" /><Text className="font-bold text-zinc-900 ml-1">Promote</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteClassClick(classId)} className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 flex-row justify-center items-center">
                        <Trash2 size={16} color="#dc2626" /><Text className="font-bold text-red-700 ml-1">Delete Class</Text>
                      </TouchableOpacity>
                    </View>

                    <View className="space-y-3">
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
          <View className="space-y-3">
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