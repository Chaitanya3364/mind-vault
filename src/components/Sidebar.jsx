import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  FilePlus,
  PanelLeftClose,
  Check,
  X,
  Pencil,
  Trash2,
  Folder,
} from 'lucide-react';

const TAG_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#64748b', // Slate
];

export function Sidebar({
  isOpen,
  width,
  onStartResize,
  onClose,
  folders,
  activeId,
  onToggleFolder,
  onAddFolder,
  onAddNotebook,
  onSelectNotebook,
  onRenameFolder,
  onRenameNotebook,
  onDeleteFolder,
  onDeleteNotebook,
  onChangeFolderColor,
  onChangeNotebookColor,
}) {
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [addingNotebookFolderId, setAddingNotebookFolderId] = useState(null);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Color picker popover target ID (folder.id or notebook.id)
  const [colorPickerId, setColorPickerId] = useState(null);

  if (!isOpen) return null;

  const submitNewFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onAddFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const submitNewNotebook = (e, folderId) => {
    e.preventDefault();
    if (!newNotebookTitle.trim()) return;
    onAddNotebook(folderId, newNotebookTitle.trim());
    setNewNotebookTitle('');
    setAddingNotebookFolderId(null);
  };

  const startEditing = (e, id, currentName) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setColorPickerId(null);
    setEditingId(id);
    setEditValue(currentName);
  };

  const saveFolderRename = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (editValue.trim()) {
      onRenameFolder(folderId, editValue.trim());
    }
    setEditingId(null);
  };

  const saveNotebookRename = (e, folderId, notebookId) => {
    e.preventDefault();
    e.stopPropagation();
    if (editValue.trim()) {
      onRenameNotebook(folderId, notebookId, editValue.trim());
    }
    setEditingId(null);
  };

  const toggleColorPicker = (e, id) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(null);
    setColorPickerId((prev) => (prev === id ? null : id));
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="relative bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 h-full select-none shrink-0"
    >
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <span className="font-semibold tracking-wide truncate">MindVault</span>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsAddingFolder(true);
              setNewFolderName('');
            }}
            title="New Folder"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          >
            <FolderPlus size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Library"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      {/* Inline New Folder Input */}
      {isAddingFolder && (
        <form onSubmit={submitNewFolder} className="p-2 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full bg-slate-950 text-white text-sm px-2.5 py-1.5 rounded border border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
              title="Create"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddingFolder(false)}
              className="p-1.5 hover:bg-slate-700 text-slate-400 rounded"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Folder & Notebook Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map((folder) => {
          const folderColor = folder.color || '#6366f1';

          return (
            <div key={folder.id}>
              {editingId === folder.id ? (
                <form
                  onSubmit={(e) => saveFolderRename(e, folder.id)}
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                    className="w-full bg-slate-950 text-white text-sm px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
                    title="Save"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 hover:bg-slate-700 text-slate-400 rounded"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 group">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleFolder(folder.id)}
                      className="text-slate-400 hover:text-white shrink-0"
                    >
                      {folder.isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    {/* Clickable Color-Coded Folder Icon */}
                    <button
                      type="button"
                      onClick={(e) => toggleColorPicker(e, folder.id)}
                      title="Change folder color"
                      className="p-0.5 rounded hover:bg-slate-700 shrink-0 transition-transform hover:scale-110"
                    >
                      <Folder
                        size={15}
                        style={{ color: folderColor, fill: `${folderColor}33` }}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleFolder(folder.id)}
                      onDoubleClick={(e) => startEditing(e, folder.id, folder.name)}
                      className="text-sm font-medium text-left truncate flex-1"
                      title="Click to expand/collapse, double-click to rename"
                    >
                      {folder.name}
                    </button>
                  </div>

                  {/* Folder Actions */}
                  {confirmDeleteId === folder.id ? (
                    <div className="flex items-center gap-1 shrink-0 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800">
                      <span className="text-[11px] text-red-200">Delete?</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id);
                          setConfirmDeleteId(null);
                        }}
                        title="Confirm Delete Folder"
                        className="p-0.5 bg-red-600 hover:bg-red-500 text-white rounded"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        title="Cancel"
                        className="p-0.5 hover:bg-slate-700 text-slate-300 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => startEditing(e, folder.id, folder.name)}
                        title="Rename Folder"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!folder.isOpen) onToggleFolder(folder.id);
                          setAddingNotebookFolderId(folder.id);
                          setNewNotebookTitle('');
                        }}
                        title="Add Notebook"
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      >
                        <FilePlus size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(folder.id);
                        }}
                        title="Delete Folder"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/60 rounded text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Inline Folder Color Swatch Strip */}
              {colorPickerId === folder.id && (
                <div className="mx-2 my-1 p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          onChangeFolderColor(folder.id, c);
                          setColorPickerId(null);
                        }}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full transition-transform ${
                          folderColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                        }`}
                      />
                    ))}
                    <label
                      title="Custom color"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
                      }}
                      className="w-4 h-4 rounded-full cursor-pointer hover:scale-110 transition-transform"
                    >
                      <input
                        type="color"
                        value={folderColor}
                        onChange={(e) => onChangeFolderColor(folder.id, e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setColorPickerId(null)}
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Notebooks Dropdown */}
              {folder.isOpen && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-700 pl-2">
                  {folder.notebooks.map((nb) => {
                    const noteColor = nb.color || '#38bdf8';

                    return editingId === nb.id ? (
                      <form
                        key={nb.id}
                        onSubmit={(e) => saveNotebookRename(e, folder.id, nb.id)}
                        className="flex items-center gap-1 py-0.5"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                          className="w-full bg-slate-950 text-white text-xs px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
                          title="Save"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 hover:bg-slate-700 text-slate-400 rounded"
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </form>
                    ) : (
                      <div key={nb.id}>
                        <div
                          className={`flex items-center justify-between rounded group ${
                            activeId === nb.id
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center flex-1 min-w-0 pl-2">
                            {/* Clickable Color Dot for Note */}
                            <button
                              type="button"
                              onClick={(e) => toggleColorPicker(e, nb.id)}
                              title="Change note color"
                              className="p-1 rounded hover:bg-black/20 shrink-0"
                            >
                              <span
                                style={{ backgroundColor: noteColor }}
                                className="block w-2.5 h-2.5 rounded-full ring-1 ring-white/40 transition-transform hover:scale-125"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectNotebook(folder.id, nb.id)}
                              onDoubleClick={(e) => startEditing(e, nb.id, nb.title)}
                              className="flex-1 text-left text-sm px-1.5 py-1.5 truncate min-w-0"
                              title="Double-click to rename"
                            >
                              {nb.title}
                            </button>
                          </div>

                          {confirmDeleteId === nb.id ? (
                            <div className="flex items-center gap-1 mr-1 shrink-0 bg-red-950/90 px-1 py-0.5 rounded border border-red-800">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteNotebook(folder.id, nb.id);
                                  setConfirmDeleteId(null);
                                }}
                                title="Confirm Delete Note"
                                className="p-0.5 bg-red-600 hover:bg-red-500 text-white rounded"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                title="Cancel"
                                className="p-0.5 hover:bg-slate-700 text-slate-300 rounded"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 mr-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => startEditing(e, nb.id, nb.title)}
                                title="Rename Note"
                                className={`opacity-0 group-hover:opacity-100 p-1 rounded ${
                                  activeId === nb.id
                                    ? 'hover:bg-indigo-500 text-indigo-100'
                                    : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(nb.id);
                                }}
                                title="Delete Note"
                                className={`opacity-0 group-hover:opacity-100 p-1 rounded ${
                                  activeId === nb.id
                                    ? 'hover:bg-red-500 text-indigo-100 hover:text-white'
                                    : 'hover:bg-red-900/60 text-slate-400 hover:text-red-400'
                                }`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Inline Notebook Color Swatch Strip */}
                        {colorPickerId === nb.id && (
                          <div className="my-1 p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {TAG_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    onChangeNotebookColor(folder.id, nb.id, c);
                                    setColorPickerId(null);
                                  }}
                                  style={{ backgroundColor: c }}
                                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                                    noteColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                                  }`}
                                />
                              ))}
                              <label
                                title="Custom color"
                                style={{
                                  background:
                                    'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
                                }}
                                className="w-3.5 h-3.5 rounded-full cursor-pointer hover:scale-110 transition-transform"
                              >
                                <input
                                  type="color"
                                  value={noteColor}
                                  onChange={(e) =>
                                    onChangeNotebookColor(folder.id, nb.id, e.target.value)
                                  }
                                  className="sr-only"
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => setColorPickerId(null)}
                              className="text-slate-400 hover:text-white p-0.5"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {addingNotebookFolderId === folder.id && (
                    <form
                      onSubmit={(e) => submitNewNotebook(e, folder.id)}
                      className="pt-1 flex items-center gap-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={newNotebookTitle}
                        onChange={(e) => setNewNotebookTitle(e.target.value)}
                        placeholder="Notebook title..."
                        className="w-full bg-slate-950 text-white text-xs px-2 py-1.5 rounded border border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
                        title="Create"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingNotebookFolderId(null)}
                        className="p-1 hover:bg-slate-700 text-slate-400 rounded"
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right-Edge Drag Handle */}
      <div
        onMouseDown={onStartResize}
        title="Drag to resize sidebar"
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/70 active:bg-indigo-500 transition-colors z-20"
      />
    </aside>
  );
}