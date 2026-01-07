import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

export default function EditableHoursCell({ value, onSave, disabled }) {
  const [localValue, setLocalValue] = useState(value || 0);

  useEffect(() => {
    setLocalValue(value || 0);
  }, [value]);

  const handleBlur = () => {
    if (Number(localValue) !== Number(value)) {
      onSave(localValue);
    }
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="w-24 bg-zinc-800 border-zinc-700 text-white"
    />
  );
}