import React from 'react';
import { Picker } from '@react-native-picker/picker';

interface Props {
  selected: string;
  onChange: (value: string) => void;
  options: string[];
}

const Dropdown = ({ selected, onChange, options }: Props) => (
  <Picker selectedValue={selected} onValueChange={onChange}>
    {options.map((opt) => (
      <Picker.Item key={opt} label={opt} value={opt} />
    ))}
  </Picker>
);

export default Dropdown;
