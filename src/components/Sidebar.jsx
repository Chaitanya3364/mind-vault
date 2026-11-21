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
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#64748b',
];

export function Sidebar({
  isOpen,
  width,
  theme = 'light',
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
  const [colorPickerId, setColorPickerId] = useState(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

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

  const handleMobileAwareSelect = (folderId, notebookId) => {
    onSelectNotebook(folderId, notebookId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 md:hidden"
      />

      <aside
        style={{ width: `${width}px` }}
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto max-w-[85vw] flex flex-col border-r h-full select-none shrink-0 shadow-2xl md:shadow-none transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-slate-50 text-slate-800 border-slate-200'
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`p-3.5 sm:p-4 flex items-center justify-between border-b transition-colors duration-200 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <span
            className={`font-bold tracking-wide truncate ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}
          >
            MindVault
          </span>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsAddingFolder(true);
                setNewFolderName('');
              }}
              title="New Folder"
              className={`p-2 md:p-1.5 rounded transition-colors ${
                isDark
                  ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  : 'hover:bg-slate-200/70 text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderPlus size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Library"
              className={`p-2 md:p-1.5 rounded transition-colors ${
                isDark
                  ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  : 'hover:bg-slate-200/70 text-slate-600 hover:text-slate-900'
              }`}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>

        {/* Inline New Folder Input */}
        {isAddingFolder && (
          <form
            onSubmit={submitNewFolder}
            className={`p-2 border-b transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-800/50'
                : 'border-slate-200 bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className={`w-full text-sm px-2.5 py-1.5 rounded border border-indigo-500 focus:outline-none ${
                  isDark
                    ? 'bg-slate-950 text-white'
                    : 'bg-white text-slate-900'
                }`}
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
                className={`p-1.5 rounded ${
                  isDark
                    ? 'hover:bg-slate-700 text-slate-400'
                    : 'hover:bg-slate-200 text-slate-500'
                }`}
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
                      className={`w-full text-sm px-2 py-1 rounded border border-indigo-500 focus:outline-none ${
                        isDark
                          ? 'bg-slate-950 text-white'
                          : 'bg-white text-slate-900'
                      }`}
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
                      className={`p-1 rounded ${
                        isDark
                          ? 'hover:bg-slate-700 text-slate-400'
                          : 'hover:bg-slate-200 text-slate-500'
                      }`}
                      title="Cancel"
                    >
                      <X size={13} />
                    </button>
                  </form>
                ) : (
                  <div
                    className={`flex items-center justify-between px-2 py-2 md:py-1.5 rounded group transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleFolder(folder.id)}
                        className={`shrink-0 p-0.5 ${
                          isDark
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {folder.isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => toggleColorPicker(e, folder.id)}
                        title="Change folder color"
                        className={`p-0.5 rounded shrink-0 transition-transform hover:scale-110 ${
                          isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                        }`}
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

                    {confirmDeleteId === folder.id ? (
                      <div
                        className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border ${
                          isDark
                            ? 'bg-red-950/80 border-red-800 text-red-200'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        <span className="text-[11px]">Delete?</span>
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
                          className={`p-0.5 rounded ${
                            isDark
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-slate-200 text-slate-600'
                          }`}
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
                          className={`md:opacity-0 md:group-hover:opacity-100 p-1 rounded ${
                            isDark
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                          }`}
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
                          className={`p-1 rounded ${
                            isDark
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                          }`}
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
                          className={`md:opacity-0 md:group-hover:opacity-100 p-1 rounded ${
                            isDark
                              ? 'hover:bg-red-900/60 text-slate-400 hover:text-red-400'
                              : 'hover:bg-red-100 text-slate-500 hover:text-red-600'
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {colorPickerId === folder.id && (
                  <div
                    className={`mx-2 my-1 p-2 rounded-lg border flex items-center justify-between gap-1 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
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
                            folderColor === c
                              ? `scale-125 ring-2 ${isDark ? 'ring-white' : 'ring-slate-800'}`
                              : 'hover:scale-110'
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
                      className={`p-0.5 ${
                        isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {folder.isOpen && (
                  <div
                    className={`ml-4 sm:ml-5 mt-1 space-y-0.5 border-l pl-2 ${
                      isDark ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
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
                            className={`w-full text-xs px-2 py-1 rounded border border-indigo-500 focus:outline-none ${
                              isDark
                                ? 'bg-slate-950 text-white'
                                : 'bg-white text-slate-900'
                            }`}
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
                            className={`p-1 rounded ${
                              isDark
                                ? 'hover:bg-slate-700 text-slate-400'
                                : 'hover:bg-slate-200 text-slate-500'
                            }`}
                            title="Cancel"
                          >
                            <X size={12} />
                          </button>
                        </form>
                      ) : (
                        <div key={nb.id}>
                          <div
                            className={`flex items-center justify-between rounded group transition-colors ${
                              activeId === nb.id
                                ? 'bg-indigo-600 text-white'
                                : isDark
                                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center flex-1 min-w-0 pl-2">
                              <button
                                type="button"
                                onClick={(e) => toggleColorPicker(e, nb.id)}
                                title="Change note color"
                                className="p-1 rounded hover:bg-black/15 shrink-0"
                              >
                                <span
                                  style={{ backgroundColor: noteColor }}
                                  className="block w-2.5 h-2.5 rounded-full ring-1 ring-black/20 transition-transform hover:scale-125"
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMobileAwareSelect(folder.id, nb.id)}
                                onDoubleClick={(e) => startEditing(e, nb.id, nb.title)}
                                className="flex-1 text-left text-sm px-1.5 py-2 md:py-1.5 truncate min-w-0"
                                title="Double-click to rename"
                              >
                                {nb.title}
                              </button>
                            </div>

                            {confirmDeleteId === nb.id ? (
                              <div
                                className={`flex items-center gap-1 mr-1 shrink-0 px-1 py-0.5 rounded border ${
                                  isDark
                                    ? 'bg-red-950/90 border-red-800'
                                    : 'bg-red-50 border-red-200'
                                }`}
                              >
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
                                  className={`p-0.5 rounded ${
                                    isDark
                                      ? 'hover:bg-slate-700 text-slate-300'
                                      : 'hover:bg-slate-200 text-slate-600'
                                  }`}
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
                                  className={`md:opacity-0 md:group-hover:opacity-100 p-1 rounded ${
                                    activeId === nb.id
                                      ? 'hover:bg-indigo-500 text-indigo-100'
                                      : isDark
                                      ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                      : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
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
                                  className={`md:opacity-0 md:group-hover:opacity-100 p-1 rounded ${
                                    activeId === nb.id
                                      ? 'hover:bg-red-500 text-indigo-100 hover:text-white'
                                      : isDark
                                      ? 'hover:bg-red-900/60 text-slate-400 hover:text-red-400'
                                      : 'hover:bg-red-100 text-slate-500 hover:text-red-600'
                                  }`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          {colorPickerId === nb.id && (
                            <div
                              className={`my-1 p-1.5 rounded-lg border flex items-center justify-between gap-1 ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800'
                                  : 'bg-white border-slate-200 shadow-sm'
                              }`}
                            >
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
                                      noteColor === c
                                        ? `scale-125 ring-2 ${isDark ? 'ring-white' : 'ring-slate-800'}`
                                        : 'hover:scale-110'
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
                                className={`p-0.5 ${
                                  isDark
                                    ? 'text-slate-400 hover:text-white'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
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
                          className={`w-full text-xs px-2 py-1.5 rounded border border-indigo-500 focus:outline-none ${
                            isDark
                              ? 'bg-slate-950 text-white'
                              : 'bg-white text-slate-900'
                          }`}
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
                          className={`p-1 rounded ${
                            isDark
                              ? 'hover:bg-slate-700 text-slate-400'
                              : 'hover:bg-slate-200 text-slate-500'
                          }`}
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

        {/* Desktop-Only Right-Edge Drag Handle */}
        <div
          onMouseDown={onStartResize}
          title="Drag to resize sidebar"
          className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/70 active:bg-indigo-500 transition-colors z-20"
        />
      </aside>
    </>
  );
}