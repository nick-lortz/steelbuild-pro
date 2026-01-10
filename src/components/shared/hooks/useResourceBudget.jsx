import { useEffect, useState } from 'react';

const RESOURCE_BUDGETS = {
  image: 5 * 1024 * 1024, // 5MB total for images
  font: 500 * 1024, // 500KB total for fonts
  script: 2 * 1024 * 1024, // 2MB total for scripts
  totalRequests: 50 // Max concurrent requests
};

export function useResourceBudget() {
  const [usage, setUsage] = useState({
    image: 0,
    font: 0,
    script: 0,
    requests: 0
  });
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    const checkResourceUsage = () => {
      if (!performance.getEntriesByType) return;

      const resources = performance.getEntriesByType('resource');
      
      const newUsage = {
        image: 0,
        font: 0,
        script: 0,
        requests: resources.length
      };

      const newWarnings = [];

      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        
        if (resource.initiatorType === 'img') {
          newUsage.image += size;
        } else if (resource.initiatorType === 'css' && resource.name.includes('font')) {
          newUsage.font += size;
        } else if (resource.initiatorType === 'script') {
          newUsage.script += size;
        }
      });

      // Check budgets
      Object.keys(RESOURCE_BUDGETS).forEach(type => {
        if (newUsage[type] > RESOURCE_BUDGETS[type]) {
          newWarnings.push({
            type,
            usage: newUsage[type],
            budget: RESOURCE_BUDGETS[type],
            percentage: (newUsage[type] / RESOURCE_BUDGETS[type]) * 100
          });
        }
      });

      setUsage(newUsage);
      setWarnings(newWarnings);

      if (newWarnings.length > 0) {
        console.warn('Resource budget exceeded:', newWarnings);
      }
    };

    checkResourceUsage();
    const interval = setInterval(checkResourceUsage, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, []);

  return {
    usage,
    warnings,
    isOverBudget: warnings.length > 0,
    getBudgetStatus: (type) => ({
      usage: usage[type],
      budget: RESOURCE_BUDGETS[type],
      percentage: (usage[type] / RESOURCE_BUDGETS[type]) * 100,
      isOver: usage[type] > RESOURCE_BUDGETS[type]
    })
  };
}