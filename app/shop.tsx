import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Truck, ShieldCheck, Zap } from 'lucide-react-native';

export default function ShopScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top']}>
      <View className="px-6 py-6 items-center border-b border-blue-100 bg-white">
        <Text className="text-slate-900 font-black text-2xl tracking-tight">Bluom Shop</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View className="w-24 h-24 bg-blue-100 rounded-[32px] items-center justify-center mb-8 shadow-sm">
          <ShoppingBag size={48} color="#2563eb" strokeWidth={2.5} />
        </View>

        <Text className="text-slate-900 font-black text-4xl text-center leading-tight mb-4">
          The Future of Health Retail.
        </Text>
        
        <Text className="text-slate-500 font-bold text-center text-lg leading-relaxed mb-12 px-4">
          We're migrating our store to Shopify to give you the fastest checkout and exclusive gear.
        </Text>

        <View className="bg-white rounded-[40px] p-8 w-full border border-blue-50 shadow-xl shadow-blue-900/5">
          <Text className="text-blue-600 font-black uppercase tracking-widest text-xs mb-6 text-center">Coming Very Soon</Text>
          
          <View className="space-y-6">
            <View className="flex-row items-center gap-4">
              <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                <Truck size={20} color="#64748b" />
              </View>
              <View>
                <Text className="text-slate-800 font-extrabold text-base">Global Shipping</Text>
                <Text className="text-slate-500 font-bold text-xs">Fast delivery to your doorstep</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 mt-6">
              <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                <Zap size={20} color="#64748b" />
              </View>
              <View>
                <Text className="text-slate-800 font-extrabold text-base">Exclusive Drops</Text>
                <Text className="text-slate-500 font-bold text-xs">Wear the Bluom movement</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 mt-6">
              <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                <ShieldCheck size={20} color="#64748b" />
              </View>
              <View>
                <Text className="text-slate-800 font-extrabold text-base">Secure Checkout</Text>
                <Text className="text-slate-500 font-bold text-xs">Shopify-powered encryption</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            disabled
            className="mt-10 bg-slate-100 rounded-3xl py-5 items-center"
          >
            <Text className="text-slate-400 font-black text-lg">Notify Me</Text>
          </TouchableOpacity>
        </View>
        
        <Text className="text-slate-400 font-bold text-xs mt-10 uppercase tracking-[4px]">
          Precision Retail • Power in Bloom
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

