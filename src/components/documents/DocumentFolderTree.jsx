import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DocumentFolderTree({ documents, projects, onDocClick, onFolderSelect }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [selectedFolder, setSelectedFolder] = useState('root');

  const buildFolderTree = useMemo(() => {
    const tree = {};
    
    documents.forEach(doc => {
      const path = doc.folder_path || '/';
      const parts = path.split('/').filter(p => p);
      
      let current = tree;
      parts.forEach(part => {
        if (!current[part]) {
          current[part] = { _docs: [], _subfolders: {} };
        }
        current = current[part]._subfolders;
      });
    });
    
    // Group docs by folder
    documents.forEach(doc => {
      const path = doc.folder_path || '/';
      const parts = path.split('/').filter(p => p);
      
      let current = tree;
      parts.forEach(part => {
        if (current[part]) current = current[part]._subfolders;
      });
      
      // Add doc to appropriate folder
      const lastFolder = parts[parts.length - 1];
      if (lastFolder && tree[lastFolder]) {
        tree[lastFolder]._docs.push(doc);
      }
    });
    
    return tree;
  }, [documents]);

  const toggleFolder = (folder) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolderNode = (name, node, level = 0) => {
    const isExpanded = expandedFolders.has(name);
    const hasSubfolders = Object.keys(node._subfolders).length > 0;
    const docCount = node._docs.length;

    return (
      <div key={name}>
        <button
          onClick={() => {
            setSelectedFolder(name);
            onFolderSelect?.(name);
            if (hasSubfolders) toggleFolder(name);
          }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
            selectedFolder === name ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasSubfolders ? (
            isExpanded ? (
              <ChevronDown size={16} className="flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="flex-shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          <Folder size={16} className="flex-shrink-0" />
          <span className="flex-1 truncate">{name}</span>
          {docCount > 0 && <span className="text-xs text-zinc-500">{docCount}</span>}
        </button>

        {isExpanded && hasSubfolders && (
          <div>
            {Object.entries(node._subfolders).map(([subfolder, subnode]) =>
              renderFolderNode(subfolder, subnode, level + 1)
            )}
          </div>
        )}

        {isExpanded && (
          <div>
            {node._docs.map(doc => (
              <button
                key={doc.id}
                onClick={() => onDocClick?.(doc)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800/30 transition-colors"
                style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
              >
                <File size={14} className="flex-shrink-0" />
                <span className="flex-1 truncate">{doc.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Root folder with all docs
  const rootDocs = documents.filter(d => !d.folder_path || d.folder_path === '/');

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-950">
      <div className="max-h-[600px] overflow-y-auto">
        {/* Root folder */}
        <div className="border-b border-zinc-800 sticky top-0 bg-zinc-900/50 backdrop-blur">
          <button
            onClick={() => setSelectedFolder('root')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-left transition-colors',
              selectedFolder === 'root' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            )}
          >
            <Folder size={16} />
            <span>All Documents</span>
            <span className="text-xs text-zinc-600 ml-auto">{documents.length}</span>
          </button>
        </div>

        {/* Folder tree */}
        {Object.entries(buildFolderTree).map(([name, node]) =>
          renderFolderNode(name, node)
        )}
      </div>
    </div>
  );
}