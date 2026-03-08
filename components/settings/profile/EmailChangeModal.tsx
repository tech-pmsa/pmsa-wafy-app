import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { Mail, AlertTriangle, X } from 'lucide-react-native';

export function EmailChangeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // In a real app, you would invoke an edge function here to bypass client limitations for email updates,
    // or use supabase.auth.updateUser if configured to allow client-side email changes.
    NativeAlert.alert("Notice", "Email updates must be handled via the web portal or admin for security.");
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setIsOpen(true)} className="flex-row items-center justify-center bg-zinc-100 py-3 rounded-xl w-full mt-4 border border-zinc-200">
        <Mail size={16} color="#09090b" />
        <Text className="ml-2 font-semibold text-zinc-900">Change Email</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-zinc-900">Change Email</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}><X size={24} color="#71717a" /></TouchableOpacity>
            </View>

            <View className="bg-red-50 border border-red-200 p-4 rounded-xl flex-row mb-6 mt-2">
              <AlertTriangle size={20} color="#ef4444" />
              <Text className="text-red-700 text-sm ml-2 flex-1">This feature requires admin approval on mobile. Please contact support.</Text>
            </View>

            <TouchableOpacity onPress={() => setIsOpen(false)} className="w-full py-4 rounded-xl items-center bg-zinc-900">
              <Text className="text-white font-bold text-lg">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}