import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // You will need to install this
import { User, GraduationCap, Phone, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';
import { COLORS } from '@/constants/theme';

const initialFormData = {
  name: '', cic: '', class_id: 'TH-1', council: '', batch: '', phone: '',
  guardian: '', g_phone: '', address: '', sslc: '', plustwo: '', plustwo_streams: '',
};

const classOptions = ["TH-1", "TH-2", "AL-1", "AL-2", "AL-3", "AL-4", "Foundation A", "Foundation B"];

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function AddStudents() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(prev => prev < 4 ? prev + 1 : prev);
  const prevStep = () => setStep(prev => prev > 1 ? prev - 1 : prev);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const cic = formData.cic.trim().toLowerCase();
      const email = `${cic}@pmsa.com`;
      const password = `${cic}@11`;

      // Calls the secure Supabase Edge Function we will build next
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { ...formData, email, password }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      NativeAlert.alert('Success', 'Student added successfully!');
      setStep(1);
      setFormData(initialFormData);

    } catch (err: any) {
      NativeAlert.alert('Failed to add student', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
      style={cardShadow()}
    >
      <View className="mb-6 border-b border-[#E2E8F0] pb-5">
        <Text className="text-[11px] font-muller-bold text-[#1E40AF] mb-3 uppercase tracking-wider">Step {step} of 4</Text>
        <View className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden mb-5">
          <View style={{ width: `${(step / 4) * 100}%` }} className="h-full bg-[#1E40AF] rounded-full" />
        </View>
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">
          {step === 1 ? 'Personal Information' : step === 2 ? 'Academic Details' : step === 3 ? 'Contact Information' : 'Review & Submit'}
        </Text>
      </View>

      <View className="min-h-[250px]">
        {step === 1 && (
          <View className="space-y-4 gap-1">
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Full Name</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., Mohammed Shuhaib M"
                placeholderTextColor="#94A3B8"
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">CIC Number (Unique)</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., 16828"
                placeholderTextColor="#94A3B8"
                value={formData.cic}
                onChangeText={(t) => setFormData({ ...formData, cic: t })}
                keyboardType="numeric"
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">SSLC Board</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., Kerala State Board"
                placeholderTextColor="#94A3B8"
                value={formData.sslc}
                onChangeText={(t) => setFormData({ ...formData, sslc: t })}
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">+2 Board</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., Kerala State Board"
                placeholderTextColor="#94A3B8"
                value={formData.plustwo}
                onChangeText={(t) => setFormData({ ...formData, plustwo: t })}
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">+2 Stream</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., Science / Commerce"
                placeholderTextColor="#94A3B8"
                value={formData.plustwo_streams}
                onChangeText={(t) => setFormData({ ...formData, plustwo_streams: t })}
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="space-y-4 gap-1">
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Class ID</Text>
              <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] overflow-hidden">
                <Picker
                  selectedValue={formData.class_id}
                  onValueChange={(v) => setFormData({ ...formData, class_id: v })}
                  style={{ color: '#0F172A' }}
                >
                  {classOptions.map(opt => <Picker.Item key={opt} label={opt} value={opt} color="#0F172A" />)}
                </Picker>
              </View>
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Council</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., INSHIRAH"
                placeholderTextColor="#94A3B8"
                value={formData.council}
                onChangeText={(t) => setFormData({ ...formData, council: t })}
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Batch</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="e.g., Batch 12"
                placeholderTextColor="#94A3B8"
                value={formData.batch}
                onChangeText={(t) => setFormData({ ...formData, batch: t })}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="space-y-4 gap-1">
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Student Phone</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#94A3B8"
                value={formData.phone}
                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Guardian Name</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="Guardian Name"
                placeholderTextColor="#94A3B8"
                value={formData.guardian}
                onChangeText={(t) => setFormData({ ...formData, guardian: t })}
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Guardian Phone</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px]"
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#94A3B8"
                value={formData.g_phone}
                onChangeText={(t) => setFormData({ ...formData, g_phone: t })}
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <Text className="text-[13px] font-muller-bold text-[#475569] mb-1.5 ml-1">Address</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px] h-24"
                placeholder="Full address"
                placeholderTextColor="#94A3B8"
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        )}

        {step === 4 && (
          <View className='space-y-4 gap-1'>
            <View className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] space-y-2">
              <Text className="text-[#475569] font-muller text-[13px]">Name: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.name || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">CIC: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.cic || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">SSLC: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.sslc || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">+2: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.plustwo || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">+2 Stream: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.plustwo_streams || 'N/A'}</Text></Text>
            </View>
            <View className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] space-y-2">
              <Text className="text-[#475569] font-muller text-[13px]">Class: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.class_id || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">Batch: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.batch || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">Council: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.council || 'N/A'}</Text></Text>
            </View>
            <View className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] space-y-2">
              <Text className="text-[#475569] font-muller text-[13px]">Phone: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.phone || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">Guardian: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.guardian || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">Guardian Phone: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.g_phone || 'N/A'}</Text></Text>
              <Text className="text-[#475569] font-muller text-[13px]">Address: <Text className="font-muller-bold text-[#0F172A] text-[14px]">{formData.address || 'N/A'}</Text></Text>
            </View>
          </View>
        )}
      </View>

      <View className="flex-row justify-between mt-8 pt-5 border-t border-[#E2E8F0] gap-3">
        {step > 1 ? (
          <TouchableOpacity
            onPress={prevStep}
            activeOpacity={0.7}
            className="flex-1 py-3.5 rounded-[14px] bg-[#F1F5F9] border border-[#E2E8F0] flex-row items-center justify-center"
          >
            <ChevronLeft size={18} color="#0F172A" />
            <Text className="font-muller-bold text-[#0F172A] ml-1.5 text-[15px] tracking-wide">Back</Text>
          </TouchableOpacity>
        ) : <View className="flex-1" />}

        {step < 4 ? (
          <TouchableOpacity
            onPress={nextStep}
            activeOpacity={0.8}
            className="flex-1 py-3.5 rounded-[14px] bg-[#1E40AF] flex-row items-center justify-center shadow-sm"
          >
            <Text className="font-muller-bold text-white mr-1.5 text-[15px] tracking-wide">Next</Text>
            <ChevronRight size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            className={`flex-1 py-3.5 rounded-[14px] flex-row items-center justify-center shadow-sm ${
              loading ? 'bg-[#1E40AF]/60' : 'bg-[#16A34A]'
            }`}
          >
            {loading ? <ActivityIndicator color="white" className="mr-2.5" /> : <CheckCircle2 size={18} color="white" className="mr-2.5" />}
            <Text className="font-muller-bold text-white text-[15px] tracking-wide">Confirm & Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}