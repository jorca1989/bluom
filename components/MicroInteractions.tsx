import React, { PropsWithChildren } from 'react';
import { View, ViewProps, TouchableOpacity, TouchableOpacityProps } from 'react-native';

export const SparkleEffect: React.FC<PropsWithChildren<{ visible: boolean }>> = ({ visible, children }) => {
  return <View>{children}</View>;
};

export const BounceView: React.FC<PropsWithChildren<ViewProps & { trigger?: any }>> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export const GlowView: React.FC<PropsWithChildren<ViewProps & { visible?: boolean; color?: string }>> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export const RippleButton: React.FC<PropsWithChildren<TouchableOpacityProps>> = ({ children, ...props }) => {
  return <TouchableOpacity {...props}>{children}</TouchableOpacity>;
};
