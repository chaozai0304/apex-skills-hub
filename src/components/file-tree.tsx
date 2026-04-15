import { ChevronDown, FileText, FolderOpen } from "lucide-react";

import type { FileNode } from "@/lib/types";

export function FileTree({ nodes, level = 0 }: { nodes: FileNode[]; level?: number }) {
  return (
    <ul className="space-y-1.5">
      {nodes.map((node) => (
        <li key={node.path}>
          <div
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition ${
              node.type === "directory"
                ? "border-slate-200 bg-white text-slate-800"
                : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50"
            }`}
            style={{ paddingLeft: `${level * 18 + 14}px` }}
          >
            {node.type === "directory" ? (
              <>
                <ChevronDown className="h-4 w-4 text-slate-400" />
                <FolderOpen className="h-4 w-4 text-amber-500" />
              </>
            ) : (
              <>
                <span className="h-4 w-4" />
                <FileText className="h-4 w-4 text-slate-400" />
              </>
            )}
            <span className={`truncate ${node.type === "directory" ? "font-medium text-slate-900" : ""}`}>
              {node.name}
            </span>
          </div>
          {node.children?.length ? (
            <div className="mt-1">
              <FileTree nodes={node.children} level={level + 1} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
