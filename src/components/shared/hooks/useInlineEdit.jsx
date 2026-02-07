import { useState } from 'react';
import { formatDateForInput, parseInputDate, parseTimeInput } from '../dateUtils';

/**
 * Hook for managing inline editing on tables/cards with automatic date/time handling
 */
export const useInlineEdit = (initialData = {}) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const startEdit = (id, data = {}) => {
    setEditingId(id);
    // Pre-format all date fields for input[type="date"]
    const formatted = {};
    Object.entries(data).forEach(([key, value]) => {
      if (key.includes('date') && value) {
        formatted[key] = formatDateForInput(value);
      } else {
        formatted[key] = value || '';
      }
    });
    setEditData(formatted);
  };

  const updateField = (key, value) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const getSaveData = () => {
    // Convert date fields back from input format to storage format
    const saveData = {};
    Object.entries(editData).forEach(([key, value]) => {
      if (key.includes('date') && value) {
        saveData[key] = parseInputDate(value);
      } else if (key.includes('time') && value) {
        saveData[key] = parseTimeInput(value);
      } else {
        saveData[key] = value;
      }
    });
    return saveData;
  };

  return {
    editingId,
    editData,
    startEdit,
    updateField,
    cancelEdit,
    getSaveData
  };
};