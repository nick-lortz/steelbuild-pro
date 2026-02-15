import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HierarchicalCostCodeSelector({ 
  costCodes, 
  value, 
  onChange, 
  className,
  leafOnly = true 
}) {
  const hierarchicalCodes = useMemo(() => {
    const buildTree = (codes) => {
      const map = new Map();
      const roots = [];

      codes.forEach(code => {
        map.set(code.id, { ...code, children: [] });
      });

      codes.forEach(code => {
        const node = map.get(code.id);
        if (code.parent_code_id && map.has(code.parent_code_id)) {
          map.get(code.parent_code_id).children.push(node);
        } else {
          roots.push(node);
        }
      });

      return roots;
    };

    const flatten = (nodes, indent = 0) => {
      let result = [];
      nodes.forEach(node => {
        if (!leafOnly || node.is_leaf !== false) {
          result.push({ ...node, indent });
        }
        if (node.children.length > 0) {
          result = result.concat(flatten(node.children, indent + 1));
        }
      });
      return result;
    };

    const tree = buildTree(costCodes);
    return flatten(tree);
  }, [costCodes, leafOnly]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select cost code..." />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700 max-h-96">
        {hierarchicalCodes.map(code => (
          <SelectItem 
            key={code.id} 
            value={code.id}
            className="text-white"
            style={{ paddingLeft: `${code.indent * 1.5 + 0.75}rem` }}
          >
            <span className="font-mono text-xs text-zinc-500 mr-2">{code.code}</span>
            <span className={code.indent > 0 ? 'text-zinc-400' : 'font-semibold'}>
              {code.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}