import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert as NativeAlert, Image } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Award, FileText, X } from 'lucide-react-native';
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
    <View className="my-2">
      {/* Trigger Card */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsOpen(true)}
        className="bg-[#1E40AF]/5 border border-dashed border-[#1E40AF]/30 rounded-[18px] p-6 items-center justify-center"
      >
        <View className="bg-[#1E40AF]/10 p-4 rounded-[16px] mb-4">
          <Award size={36} color={COLORS.primary} />
        </View>
        <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight">Submit an Achievement</Text>
        <Text className="text-sm font-muller text-[#475569] text-center mt-1.5 px-4">
          Won an award? Published a paper? Tap here to share with the college.
        </Text>
      </TouchableOpacity>

      {/* Submission Modal */}
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
        <View className="flex-1 bg-[#F8FAFC] pt-6 px-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">New Achievement</Text>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-muller-bold text-[#475569] mb-2.5 ml-1">Title</Text>
          <TextInput
            className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-base mb-5 shadow-sm"
            placeholder="e.g., First Prize in Hackathon"
            placeholderTextColor="#94A3B8"
            value={title} onChangeText={setTitle} editable={!loading}
          />

          <Text className="text-sm font-muller-bold text-[#475569] mb-2.5 ml-1">Description</Text>
          <TextInput
            className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-base mb-5 h-32 shadow-sm"
            placeholder="Describe the event and your accomplishment..."
            placeholderTextColor="#94A3B8"
            value={description} onChangeText={setDescription} editable={!loading}
            multiline textAlignVertical="top"
          />

          <Text className="text-sm font-muller-bold text-[#475569] mb-2.5 ml-1">Proof (Optional)</Text>
          {!proofFile ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleFileSelect} disabled={loading}
              className="bg-[#FFFFFF] border border-dashed border-[#94A3B8] rounded-[14px] p-5 items-center justify-center mb-8"
            >
              <FileText size={26} color="#94A3B8" className="mb-2" />
              <Text className="text-[#475569] font-muller-bold text-[15px]">Tap to select Image or PDF</Text>
              <Text className="text-[#94A3B8] font-muller text-xs mt-1.5 uppercase tracking-wider">Max size: 5MB</Text>
            </TouchableOpacity>
          ) : (
            <View
              className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] p-3.5 flex-row items-center mb-8"
              style={cardShadow()}
            >
              {proofFile.mimeType?.startsWith('image/') ? (
                <Image source={{ uri: proofFile.uri }} className="w-12 h-12 rounded-[10px]" />
              ) : (
                <View className="w-12 h-12 bg-[#F1F5F9] rounded-[10px] items-center justify-center border border-[#E2E8F0]">
                  <FileText size={20} color="#475569" />
                </View>
              )}
              <View className="ml-3.5 flex-1">
                <Text className="font-muller-bold text-[#0F172A] text-[15px] tracking-tight truncate" numberOfLines={1}>
                  {proofFile.name}
                </Text>
                <Text className="text-xs font-muller text-[#475569] mt-0.5">
                  {((proofFile.size || 0)/1024).toFixed(1)} KB
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setProofFile(null)}
                className="bg-[#DC2626]/10 p-2.5 rounded-full"
              >
                <X size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit} disabled={loading}
            activeOpacity={0.8}
            className={`w-full py-4 rounded-[14px] flex-row justify-center items-center ${loading ? 'bg-[#1E40AF]/60' : 'bg-[#1E40AF]'}`}
          >
            {loading && <ActivityIndicator color="white" className="mr-2.5" />}
            <Text className="text-white font-muller-bold text-lg tracking-wide">
              {loading ? 'Submitting...' : 'Submit for Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}