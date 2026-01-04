export function useHaptic() {
  const trigger = (type = 'light') => {
    if (!window.navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      error: [30, 50, 30],
      warning: [20, 30, 20]
    };
    
    window.navigator.vibrate(patterns[type] || patterns.light);
  };

  return { trigger };
}