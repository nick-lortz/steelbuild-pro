import React, { createContext, useContext, useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

const WeeklyContext = createContext();

export function WeeklyContextProvider({ children }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekInfo = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
    const year = start.getFullYear();
    const weekNum = Math.ceil((start - startOfWeek(new Date(year, 0, 1), { weekStartsOn: 1 })) / 604800000);
    
    return {
      week_id: `${year}-W${String(weekNum).padStart(2, '0')}`,
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
      display: `Week of ${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    };
  }, [currentDate]);

  const goToLastWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToThisWeek = () => setCurrentDate(new Date());
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  return (
    <WeeklyContext.Provider value={{
      weekInfo,
      goToLastWeek,
      goToThisWeek,
      goToNextWeek
    }}>
      {children}
    </WeeklyContext.Provider>
  );
}

export function useWeeklyContext() {
  const ctx = useContext(WeeklyContext);
  if (!ctx) throw new Error('useWeeklyContext must be used within WeeklyContextProvider');
  return ctx;
}