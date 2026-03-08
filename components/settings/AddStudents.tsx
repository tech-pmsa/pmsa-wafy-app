import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // You will need to install this
import { User, GraduationCap, Phone, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';

const initialFormData = {
  name: '', cic: '', class_id: 'TH-1', council: '', batch: '', phone: '',
  guardian: '', g_phone: '', address: '', sslc: '', plustwo: '', plustwo_streams: '',
};

const classOptions = ["TH-1", "TH-2", "AL-1", "AL-2", "AL-3", "AL-4", "Foundation A", "Foundation B"];

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
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
      <View className="mb-6 border-b border-zinc-100 pb-4">
        <Text className="text-sm font-bold text-blue-600 mb-2">Step {step} of 4</Text>
        <View className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mb-4">
          <View style={{ width: `${(step / 4) * 100}%` }} className="h-full bg-blue-600" />
        </View>
        <Text className="text-xl font-bold text-zinc-900">
          {step === 1 ? 'Personal Information' : step === 2 ? 'Academic Details' : step === 3 ? 'Contact Information' : 'Review & Submit'}
        </Text>
      </View>

      <View className="min-h-[250px]">
        {step === 1 && (
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Full Name</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base" placeholder="e.g., Mohammed Shuhaib M" value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} />
            </View>
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">CIC Number (Unique)</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base" placeholder="e.g., 16828" value={formData.cic} onChangeText={(t) => setFormData({...formData, cic: t})} keyboardType="numeric" />
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Class ID</Text>
              <View className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
                <Picker selectedValue={formData.class_id} onValueChange={(v) => setFormData({...formData, class_id: v})}>
                  {classOptions.map(opt => <Picker.Item key={opt} label={opt} value={opt} />)}
                </Picker>
              </View>
            </View>
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Council</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base" placeholder="e.g., INSHIRAH" value={formData.council} onChangeText={(t) => setFormData({...formData, council: t})} />
            </View>
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Batch</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base" placeholder="e.g., Batch 12" value={formData.batch} onChangeText={(t) => setFormData({...formData, batch: t})} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Student Phone</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base" placeholder="+91 00000 00000" value={formData.phone} onChangeText={(t) => setFormData({...formData, phone: t})} keyboardType="phone-pad" />
            </View>
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Guardian Name</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base" placeholder="Guardian Name" value={formData.guardian} onChangeText={(t) => setFormData({...formData, guardian: t})} />
            </View>
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Address</Text>
              <TextInput className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base h-24" placeholder="Full address" value={formData.address} onChangeText={(t) => setFormData({...formData, address: t})} multiline textAlignVertical="top" />
            </View>
          </View>
        )}

        {step === 4 && (
          <View className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3">
            <Text className="text-zinc-500 text-xs">Name: <Text className="font-bold text-zinc-900 text-sm">{formData.name}</Text></Text>
            <Text className="text-zinc-500 text-xs">CIC: <Text className="font-bold text-zinc-900 text-sm">{formData.cic}</Text></Text>
            <Text className="text-zinc-500 text-xs">Class: <Text className="font-bold text-zinc-900 text-sm">{formData.class_id}</Text></Text>
            <Text className="text-zinc-500 text-xs">Phone: <Text className="font-bold text-zinc-900 text-sm">{formData.phone}</Text></Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-between mt-6 pt-4 border-t border-zinc-100">
        {step > 1 ? (
          <TouchableOpacity onPress={prevStep} className="py-3 px-5 rounded-xl bg-zinc-100 flex-row items-center">
            <ChevronLeft size={20} color="#09090b" />
            <Text className="font-bold text-zinc-900 ml-1">Back</Text>
          </TouchableOpacity>
        ) : <View />}

        {step < 4 ? (
          <TouchableOpacity onPress={nextStep} className="py-3 px-5 rounded-xl bg-zinc-900 flex-row items-center">
            <Text className="font-bold text-white mr-1">Next</Text>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSubmit} disabled={loading} className="py-3 px-5 rounded-xl bg-blue-600 flex-row items-center">
            {loading ? <ActivityIndicator color="white" className="mr-2" /> : <CheckCircle2 size={20} color="white" className="mr-2" />}
            <Text className="font-bold text-white">Confirm & Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}