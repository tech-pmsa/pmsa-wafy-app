import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert as NativeAlert,
} from 'react-native';
import { Mail, AlertTriangle, X } from 'lucide-react-native';

function cardShadow() {
  return {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  };
}

export function EmailChangeModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNotice = () => {
    NativeAlert.alert(
      'Notice',
      'Email updates must be handled via the web portal or admin for security.'
    );
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className="flex-row items-center justify-center bg-zinc-100 py-3 rounded-xl w-full mt-4 border border-zinc-200"
      >
        <Mail size={16} color="#09090b" />
        <Text className="ml-2 font-semibold text-zinc-900">Change Email</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={false}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View className="flex-1 bg-zinc-100 justify-center px-6">
          <View
            className="bg-white rounded-3xl p-6 border border-zinc-200"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-zinc-900">
                Change Email
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            <View className="bg-red-50 border border-red-200 p-4 rounded-xl flex-row mb-6 mt-2">
              <AlertTriangle size={20} color="#ef4444" />
              <Text className="text-red-700 text-sm ml-2 flex-1">
                This feature requires admin approval on mobile. Please contact
                support.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNotice}
              className="w-full py-4 rounded-xl items-center bg-zinc-900 mb-3"
            >
              <Text className="text-white font-bold text-lg">OK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              className="w-full py-4 rounded-xl items-center bg-zinc-200"
            >
              <Text className="text-zinc-900 font-bold text-lg">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}