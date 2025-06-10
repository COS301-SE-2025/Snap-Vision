// src/components/molecules/LogoutButton.tsx
import React from 'react';
import ActionButton from '../atoms/ActionButton';

interface Props {
  onLogout: () => void;
}

export default function LogoutButton({ onLogout }: Props) {
  return (
    <ActionButton
      title="Log Out"
      onPress={onLogout}
      variant= 'primary'
    />
  );
}
