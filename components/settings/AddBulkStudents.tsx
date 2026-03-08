import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { parse } from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { UploadCloud, File, CheckCircle2, AlertCircle, ListChecks } from 'lucide-react-native';

const REQUIRED_COLUMNS = ['name', 'cic', 'class_id', 'council', 'batch', 'phone', 'guardian', 'g_phone', 'address', 'sslc', 'plustwo', 'plustwo_streams'];

export default function AddBulkStudents() {
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState<any>(null); // To hold the parsed array of objects
  const [fileName, setFileName] = useState('');
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      setFileName(file.name);

      // Read file contents
      const base64Str = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });

      let parsedArray: any[] = [];

      if (file.name.endsWith('.xlsx')) {
        const workbook = XLSX.read(base64Str, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        parsedArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        // For CSV, we need to decode the base64 back to string
        const binaryStr = atob(base64Str);
        parsedArray = parse(binaryStr, { header: true, skipEmptyLines: true }).data;
      }

      if (parsedArray.length > 0) {
        const headers = Object.keys(parsedArray[0]);
        const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        setMissingColumns(missing);
        setFileData(parsedArray);
        setStep(2);
      } else {
        NativeAlert.alert('Error', 'The selected file is empty.');
      }
    } catch (error) {
      console.error(error);
      NativeAlert.alert('Error', 'Failed to read the file.');
    }
  };

  const handleUpload = async () => {
    if (!fileData) return;
    setLoading(true);
    setUploadResult(null);

    try {
      // Calls the Edge Function we are about to build!
      const { data, error } = await supabase.functions.invoke('bulk-create-users', {
        body: { students: fileData }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || 'Upload failed');

      setUploadResult(data);
      setStep(3);
    } catch (err: any) {
      NativeAlert.alert('Upload Failed', err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setFileData(null); setFileName(''); setMissingColumns([]); setUploadResult(null);
  };

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 mt-6">
      <View className="flex-row items-center mb-6">
        <View className="bg-blue-50 p-3 rounded-xl mr-4"><UploadCloud size={24} color="#2563eb" /></View>
        <View className="flex-1">
          <Text className="text-xl font-bold text-zinc-900">Bulk Add Students</Text>
          <Text className="text-sm text-zinc-500 mt-1">Upload an XLSX or CSV file.</Text>
        </View>
      </View>

      {step === 1 && (
        <TouchableOpacity onPress={handleFileSelect} className="border-2 border-dashed border-zinc-300 rounded-2xl py-10 items-center justify-center bg-zinc-50">
          <UploadCloud size={40} color="#a1a1aa" className="mb-3" />
          <Text className="font-semibold text-zinc-700">Tap to select file</Text>
          <Text className="text-xs text-zinc-500 mt-1">XLSX or CSV format</Text>
        </TouchableOpacity>
      )}

      {step === 2 && (
        <View className="space-y-4">
          <View className="flex-row items-center bg-zinc-100 p-3 rounded-xl border border-zinc-200">
            <File size={20} color="#71717a" />
            <Text className="font-semibold ml-2 flex-1 truncate" numberOfLines={1}>{fileName}</Text>
            <Text className="text-xs text-zinc-500 font-bold">{fileData?.length} rows</Text>
          </View>

          {missingColumns.length > 0 ? (
            <View className="bg-red-50 border border-red-200 p-4 rounded-xl">
              <View className="flex-row items-center mb-2"><AlertCircle size={20} color="#dc2626" /><Text className="font-bold text-red-700 ml-2">Missing Columns!</Text></View>
              <Text className="text-sm text-red-600">File is missing: {missingColumns.join(', ')}. Please correct and re-upload.</Text>
            </View>
          ) : (
            <View className="bg-green-50 border border-green-200 p-4 rounded-xl">
              <View className="flex-row items-center"><ListChecks size={20} color="#16a34a" /><Text className="font-bold text-green-700 ml-2">Ready to Upload</Text></View>
              <Text className="text-sm text-green-600 mt-1">All required columns found.</Text>
            </View>
          )}

          <View className="flex-row justify-between pt-4 mt-2 border-t border-zinc-100 gap-3">
            <TouchableOpacity onPress={reset} className="flex-1 py-3 bg-zinc-100 rounded-xl items-center"><Text className="font-bold text-zinc-900">Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleUpload} disabled={missingColumns.length > 0 || loading} className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${missingColumns.length > 0 ? 'bg-zinc-300' : 'bg-zinc-900'}`}>
              {loading ? <ActivityIndicator color="white" className="mr-2" /> : null}
              <Text className="font-bold text-white">Upload Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && uploadResult && (
        <View className="items-center py-6">
          <CheckCircle2 size={64} color="#16a34a" />
          <Text className="text-xl font-bold text-zinc-900 mt-4">Upload Complete</Text>
          <Text className="text-zinc-600 text-center mt-2"><Text className="font-bold text-green-700">{uploadResult.createdCount}</Text> students created successfully.</Text>
          {uploadResult.failedCount > 0 && <Text className="text-red-600 text-center mt-1 font-semibold">{uploadResult.failedCount} students failed.</Text>}

          <TouchableOpacity onPress={reset} className="w-full py-4 bg-zinc-900 rounded-xl mt-6 items-center">
            <Text className="text-white font-bold">Upload Another File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}