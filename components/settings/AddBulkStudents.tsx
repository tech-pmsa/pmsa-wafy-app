import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing'; // <-- NEW IMPORT
import * as XLSX from 'xlsx';
import { parse } from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { UploadCloud, File, CheckCircle2, AlertCircle, ListChecks, Download } from 'lucide-react-native'; // <-- Added Download icon
import { COLORS } from '@/constants/theme';

const REQUIRED_COLUMNS = ['name', 'cic', 'class_id', 'council', 'batch', 'phone', 'guardian', 'g_phone', 'address', 'sslc', 'plustwo', 'plustwo_streams'];

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function AddBulkStudents() {
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // --- NEW: Generate and Download Template ---
  const handleDownloadTemplate = async () => {
    try {
      // 1. Create an empty worksheet using our REQUIRED_COLUMNS as the header row
      const worksheet = XLSX.utils.aoa_to_sheet([REQUIRED_COLUMNS]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

      // 2. Convert workbook to Base64
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // 3. Save to the device's temporary cache directory
      const uri = `${FileSystem.cacheDirectory}Bulk_Student_Template.xlsx`;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

      // 4. Open the native Share/Save dialog
      await Sharing.shareAsync(uri, { dialogTitle: 'Download Student Template' });
    } catch (error) {
      console.error("Template Error:", error);
      NativeAlert.alert("Error", "Failed to generate the template file.");
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      setFileName(file.name);

      const base64Str = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      let parsedArray: any[] = [];

      if (file.name.endsWith('.xlsx')) {
        const workbook = XLSX.read(base64Str, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        parsedArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
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
      // Calls the Edge Function
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
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mt-2 mb-6"
      style={cardShadow()}
    >
      <View className="flex-row items-center mb-6">
        <View className="bg-[#1E40AF]/10 p-3.5 rounded-[14px] border border-[#1E40AF]/20 mr-4">
          <UploadCloud size={24} color={COLORS.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Bulk Add Students</Text>
          <Text className="text-sm font-muller text-[#475569] mt-0.5">Upload an XLSX or CSV file.</Text>
        </View>
      </View>

      {step === 1 && (
        <View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleFileSelect}
            className="border-2 border-dashed border-[#94A3B8] rounded-[16px] py-12 items-center justify-center bg-[#F8FAFC] mb-5"
          >
            <UploadCloud size={44} color="#94A3B8" className="mb-3.5" />
            <Text className="font-muller-bold text-[#0F172A] text-[16px]">Tap to select file</Text>
            <Text className="text-xs font-muller text-[#475569] mt-1.5 uppercase tracking-wider">XLSX or CSV format</Text>
          </TouchableOpacity>

          {/* Download Template Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDownloadTemplate}
            className="flex-row items-center justify-center py-3.5 bg-[#F1F5F9] rounded-[14px] border border-[#E2E8F0]"
          >
            <Download size={18} color="#0F172A" />
            <Text className="ml-2.5 font-muller-bold text-[#0F172A] text-[15px] tracking-wide">Download Excel Template</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View className="space-y-4">
          <View className="flex-row items-center bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0]">
            <File size={20} color="#94A3B8" />
            <Text className="font-muller-bold text-[#0F172A] ml-3 flex-1 truncate" numberOfLines={1}>{fileName}</Text>
            <Text className="text-[11px] text-[#475569] font-muller-bold uppercase tracking-wider">{fileData?.length} rows</Text>
          </View>

          {missingColumns.length > 0 ? (
            <View className="bg-[#DC2626]/10 border border-[#DC2626]/20 p-4 rounded-[14px]">
              <View className="flex-row items-center mb-2.5">
                <AlertCircle size={20} color={COLORS.danger} />
                <Text className="font-muller-bold text-[#DC2626] ml-2.5 text-[15px]">Missing Columns!</Text>
              </View>
              <Text className="text-[13px] font-muller text-[#DC2626] leading-relaxed">File is missing: <Text className="font-muller-bold">{missingColumns.join(', ')}</Text>. Please correct and re-upload.</Text>
            </View>
          ) : (
            <View className="bg-[#16A34A]/10 border border-[#16A34A]/20 p-4 rounded-[14px]">
              <View className="flex-row items-center mb-1.5">
                <ListChecks size={20} color={COLORS.success} />
                <Text className="font-muller-bold text-[#16A34A] ml-2.5 text-[15px]">Ready to Upload</Text>
              </View>
              <Text className="text-[13px] font-muller text-[#16A34A]/80">All required columns found.</Text>
            </View>
          )}

          <View className="flex-row justify-between pt-4 mt-2 border-t border-[#E2E8F0] gap-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={reset}
              className="flex-1 py-3.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[14px] items-center"
            >
              <Text className="font-muller-bold text-[#0F172A] text-[15px] tracking-wide">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleUpload}
              disabled={missingColumns.length > 0 || loading}
              className={`flex-1 py-3.5 rounded-[14px] items-center flex-row justify-center shadow-sm ${
                missingColumns.length > 0 ? 'bg-[#E2E8F0]' : 'bg-[#1E40AF]'
              }`}
            >
              {loading ? <ActivityIndicator color="white" className="mr-2.5" /> : null}
              <Text className={`font-muller-bold text-[15px] tracking-wide ${
                missingColumns.length > 0 ? 'text-[#94A3B8]' : 'text-white'
              }`}>Upload Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && uploadResult && (
        <View className="items-center py-6">
          <View className="bg-[#16A34A]/10 p-5 rounded-full border border-[#16A34A]/20 mb-5">
            <CheckCircle2 size={48} color={COLORS.success} />
          </View>
          <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">Upload Complete</Text>
          <Text className="text-[#475569] font-muller text-[15px] text-center mt-2.5">
            <Text className="font-muller-bold text-[#16A34A]">{uploadResult.createdCount}</Text> students created successfully.
          </Text>
          {uploadResult.failedCount > 0 && (
            <Text className="text-[#DC2626] font-muller-bold text-center mt-1.5">
              {uploadResult.failedCount} students failed.
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={reset}
            className="w-full py-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] mt-8 items-center"
          >
            <Text className="text-[#0F172A] font-muller-bold text-[15px] tracking-wide">Upload Another File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}