
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ShopScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <View className="flex-1 p-4 items-center justify-center">
        <Text className="text-slate-900 font-black text-2xl">Shop</Text>
        <Text className="text-slate-500 font-bold mt-2">Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
}
