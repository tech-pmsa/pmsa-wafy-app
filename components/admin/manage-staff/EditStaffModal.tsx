import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Image, Alert as NativeAlert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Save, X, User } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

export function EditStaffModal({ isOpen, setIsOpen, staff, onSave }: any) {
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (staff && isOpen) {
      setName(staff.name);
      setPreview(staff.img_url);
    }
  }, [staff, isOpen]);

  const handleAvatarUpdate = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsSaving(true);
        const imageUri = result.assets[0].uri;

        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
        const filePath = `avatars/${staff.uid}/${Date.now()}-avatar.png`;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, decode(base64), { contentType: 'image/png', upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        // Directly update the DB right away for the image
        await supabase.from('profiles').update({ img_url: newUrl }).eq('uid', staff.uid);

        setPreview(newUrl);
      }
    } catch (error: any) {
      NativeAlert.alert("Error", "Could not upload image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!staff) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('uid', staff.uid);
      if (error) throw error;

      NativeAlert.alert('Success', 'Staff profile updated.');
      onSave();
      setIsOpen(false);
    } catch (err: any) {
      NativeAlert.alert('Save failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
      <View className="flex-1 bg-[#F8FAFC] pt-6 px-5">

        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">Edit Staff</Text>
            <Text className="text-[#475569] font-muller mt-0.5">Editing {staff?.name}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            activeOpacity={0.7}
          >
            <X size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View className="items-center mb-10 mt-2">
          <TouchableOpacity onPress={handleAvatarUpdate} disabled={isSaving} className="relative" activeOpacity={0.8}>
            <View className="h-32 w-32 rounded-full border-4 border-[#FFFFFF] shadow-sm overflow-hidden bg-[#F1F5F9] justify-center items-center">
              {preview ? (
                <Image source={{ uri: preview }} className="h-full w-full" />
              ) : (
                <User size={52} color="#94A3B8" />
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-[#1E40AF] p-3.5 rounded-full border-2 border-[#FFFFFF] shadow-sm">
              {isSaving ? <ActivityIndicator size="small" color="white" /> : <Camera size={18} color="white" />}
            </View>
          </TouchableOpacity>
          <Text className="text-xs font-muller text-[#94A3B8] mt-4 uppercase tracking-wider">Tap to change photo</Text>
        </View>

        <View className="space-y-2.5">
          <Text className="text-sm font-muller-bold text-[#475569] ml-1">Full Name</Text>
          <TextInput
            className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] p-4 text-[16px] font-muller-bold text-[#0F172A] shadow-sm"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View className="mt-auto pb-10 pt-4">
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
            className={`w-full py-4 rounded-[14px] flex-row justify-center items-center ${
              isSaving ? 'bg-[#1E40AF]/60' : 'bg-[#1E40AF]'
            }`}
          >
            {isSaving ? (
              <ActivityIndicator color="white" className="mr-2.5" />
            ) : (
              <Save size={20} color="white" className="mr-2.5" />
            )}
            <Text className="text-white font-muller-bold text-[16px] tracking-wide">Save Changes</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}