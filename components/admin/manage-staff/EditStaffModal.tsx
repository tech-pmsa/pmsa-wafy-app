import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Image, Alert as NativeAlert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Save, X, User } from 'lucide-react-native';

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
      <View className="flex-1 bg-zinc-100 pt-6 px-4">

        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-2xl font-bold text-zinc-900">Edit Staff</Text>
            <Text className="text-zinc-500 text-sm">Editing {staff?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setIsOpen(false)} className="bg-zinc-200 p-2 rounded-full"><X size={20} color="#09090b" /></TouchableOpacity>
        </View>

        <View className="items-center mb-8">
          <TouchableOpacity onPress={handleAvatarUpdate} disabled={isSaving} className="relative">
            <View className="h-32 w-32 rounded-full border-4 border-white shadow-sm overflow-hidden bg-zinc-200 justify-center items-center">
              {preview ? <Image source={{ uri: preview }} className="h-full w-full" /> : <User size={48} color="#a1a1aa" />}
            </View>
            <View className="absolute bottom-0 right-0 bg-blue-600 p-3 rounded-full border-2 border-white">
              {isSaving ? <ActivityIndicator size="small" color="white" /> : <Camera size={16} color="white" />}
            </View>
          </TouchableOpacity>
          <Text className="text-xs text-zinc-500 mt-3">Tap to change photo</Text>
        </View>

        <View className="space-y-2">
          <Text className="text-sm font-medium text-zinc-700 ml-1">Full Name</Text>
          <TextInput
            className="bg-white border border-zinc-200 rounded-xl p-4 text-lg font-medium"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="mt-auto pb-10 pt-4">
          <TouchableOpacity onPress={handleSave} disabled={isSaving} className="w-full py-4 rounded-xl flex-row justify-center items-center bg-zinc-900">
            {isSaving ? <ActivityIndicator color="white" className="mr-2" /> : <Save size={20} color="white" className="mr-2" />}
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}