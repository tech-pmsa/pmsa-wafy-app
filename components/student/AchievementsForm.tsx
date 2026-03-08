import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert as NativeAlert, Image } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Award, FileText, X } from 'lucide-react-native';

export default function AchievementsForm() {
  const { user, details } = useUserData();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        if (file.size && file.size > 5 * 1024 * 1024) {
          return NativeAlert.alert("File Too Large", "Please select a file smaller than 5MB.");
        }
        setProofFile(file);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return NativeAlert.alert("Required", "Title and description are required.");
    }
    if (!user || !details?.name) {
      return NativeAlert.alert("Error", "User data incomplete.");
    }

    setLoading(true);
    let proofUrl = null;

    try {
      if (proofFile) {
        // In React Native, to upload to Supabase Storage we must read the file to Base64 first
        const base64 = await FileSystem.readAsStringAsync(proofFile.uri, { encoding: FileSystem.EncodingType.Base64 });
        const filePath = `${user.id}/${Date.now()}-${proofFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from('achievements')
          .upload(filePath, decode(base64), { contentType: proofFile.mimeType });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('achievements').getPublicUrl(filePath);
        proofUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('achievements').insert([{
        title, description, proof_url: proofUrl,
        student_uid: user.id, name: details.name, cic: details.cic,
        batch: details.batch, approved: false
      }]);

      if (insertError) throw insertError;

      NativeAlert.alert("Success", "Achievement submitted for review!");
      setTitle(''); setDescription(''); setProofFile(null);
      setIsOpen(false);

    } catch (error: any) {
      NativeAlert.alert('Submission failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* Trigger Card */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl p-6 items-center justify-center"
      >
        <View className="bg-blue-100 p-4 rounded-full mb-3">
          <Award size={32} color="#2563eb" />
        </View>
        <Text className="text-lg font-bold text-blue-900">Submit an Achievement</Text>
        <Text className="text-sm text-blue-700 text-center mt-1">Won an award? Published a paper? Tap here to share.</Text>
      </TouchableOpacity>

      {/* Submission Modal */}
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
        <View className="flex-1 bg-zinc-100 pt-6 px-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-zinc-900">New Achievement</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)}><X size={24} color="#09090b" /></TouchableOpacity>
          </View>

          <Text className="text-sm font-medium text-zinc-700 mb-2">Title</Text>
          <TextInput
            className="bg-white border border-zinc-200 rounded-xl p-4 text-base mb-4"
            placeholder="e.g., First Prize in Hackathon"
            value={title} onChangeText={setTitle} editable={!loading}
          />

          <Text className="text-sm font-medium text-zinc-700 mb-2">Description</Text>
          <TextInput
            className="bg-white border border-zinc-200 rounded-xl p-4 text-base mb-4 h-32"
            placeholder="Describe the event and your accomplishment..."
            value={description} onChangeText={setDescription} editable={!loading}
            multiline textAlignVertical="top"
          />

          <Text className="text-sm font-medium text-zinc-700 mb-2">Proof (Optional)</Text>
          {!proofFile ? (
            <TouchableOpacity
              onPress={handleFileSelect} disabled={loading}
              className="bg-white border-2 border-dashed border-zinc-300 rounded-xl p-4 items-center justify-center mb-6"
            >
              <FileText size={24} color="#a1a1aa" className="mb-2" />
              <Text className="text-zinc-500 font-medium text-sm">Tap to select Image or PDF</Text>
              <Text className="text-zinc-400 text-xs mt-1">Max size: 5MB</Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-white border border-zinc-200 rounded-xl p-3 flex-row items-center mb-6">
              {proofFile.mimeType?.startsWith('image/') ? (
                <Image source={{ uri: proofFile.uri }} className="w-12 h-12 rounded-lg" />
              ) : (
                <View className="w-12 h-12 bg-zinc-100 rounded-lg items-center justify-center">
                  <FileText size={20} color="#71717a" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-zinc-900 truncate" numberOfLines={1}>{proofFile.name}</Text>
                <Text className="text-xs text-zinc-500">{((proofFile.size || 0)/1024).toFixed(1)} KB</Text>
              </View>
              <TouchableOpacity onPress={() => setProofFile(null)} className="p-2"><X size={20} color="#ef4444" /></TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit} disabled={loading}
            className={`w-full py-4 rounded-xl flex-row justify-center items-center ${loading ? 'bg-zinc-500' : 'bg-zinc-900'}`}
          >
            {loading && <ActivityIndicator color="white" className="mr-2" />}
            <Text className="text-white font-bold text-lg">{loading ? 'Submitting...' : 'Submit for Review'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}