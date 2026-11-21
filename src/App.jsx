import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PanelLeftOpen,
  Type,
  PenTool,
  Highlighter,
  MousePointer2,
  Save,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Sun,
  Moon,
  Eraser,
  ChevronDown,
  FileImage,
  FileText,
  Check,
  Minus,
  Square,
  RectangleHorizontal,
  Circle,
  Triangle,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { loadWorkspace, saveWorkspace } from './db';
import { exportAsPNG, exportAsPDF } from './utils/exportNote';

const DEFAULT_FOLDERS = [
  {
    id: 'folder-1',
    name: 'General Notes',
    color: '#6366f1',
    isOpen: true,
    notebooks: [
      {
        id: 'nb-1',
        title: 'Quick Scratchpad',
        color: '#38bdf8',
        content: '',
        textBoxes: [],
        strokes: [],
        history: [],
        redoStack: [],
        updatedAt: Date.now(),
      },
    ],
  },
];

const DEFAULT_RECENT_COLORS = ['#0f172a', '#2563eb', '#dc2626', '#16a34a'];
const HIGHLIGHTER_COLORS = ['#fde047', '#4ade80', '#38bdf8', '#f472b6', '#fb923c'];

const DRAW_TOOLS = [
  { id: 'pen', label: 'Freehand Pen (⌘/Ctrl + Shift + F)', icon: PenTool },
  { id: 'highlighter', label: 'Highlighter (⌘/Ctrl + H)', icon: Highlighter },
  { id: 'eraser', label: 'Rubber Eraser (⌘/Ctrl + E)', icon: Eraser },
  { id: 'line', label: 'Straight Line', icon: Minus },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'rect', label: 'Rectangle', icon: RectangleHorizontal },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
];

export default function App() {
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState('folder-1');
  const [activeNotebookId, setActiveNotebookId] = useState('nb-1');

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Single-source-of-truth Light / Dark theme ('light' | 'dark')
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mindvault-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Resizable Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizingRef = useRef(false);

  // Editor, Draw Tool, Pen, Highlighter & Eraser state
  const [mode, setMode] = useState('type');
  const [drawTool, setDrawTool] = useState('pen');
  const [penColor, setPenColor] = useState('#0f172a');
  const [penSize, setPenSize] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState('#fde047');
  const [highlighterSize, setHighlighterSize] = useState(22);
  const [eraserSize, setEraserSize] = useState(24);
  const [confirmClearPage, setConfirmClearPage] = useState(false);
  const [recentColors, setRecentColors] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mindvault-recent-colors'));
      return Array.isArray(saved) && saved.length > 0
        ? saved.slice(0, 4)
        : DEFAULT_RECENT_COLORS;
    } catch {
      return DEFAULT_RECENT_COLORS;
    }
  });

  const colorInputRef = useRef(null);

  // Export & Save dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const exportMenuRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('mindvault-theme', newTheme);
    localStorage.removeItem('mindvault-theme-level');
  };

  const recordRecentColor = (color) => {
    if (!color) return;
    const normalized = color.toLowerCase();
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== normalized);
      const updated = [normalized, ...filtered].slice(0, 4);
      localStorage.setItem('mindvault-recent-colors', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const clampedWidth = Math.min(Math.max(e.clientX, 200), 520);
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizingSidebar = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    async function init() {
      const saved = await loadWorkspace();
      if (saved && saved.length > 0) {
        setFolders(saved);
        setActiveFolderId(saved[0].id);
        if (saved[0].notebooks.length > 0) {
          setActiveNotebookId(saved[0].notebooks[0].id);
        }
      }
      setIsLoaded(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setInterval(async () => {
      await saveWorkspace(foldersRef.current);
    }, 60000);

    return () => clearInterval(timer);
  }, [isLoaded]);

  const handleManualSave = async () => {
    await saveWorkspace(folders);
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      setIsExportMenuOpen(false);
    }, 800);
  };

  const handleToggleFolder = (folderId) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isOpen: !f.isOpen } : f))
    );
  };

  const handleAddFolder = (name) => {
    if (!name?.trim()) return;
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      color: '#6366f1',
      isOpen: true,
      notebooks: [],
    };
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleRenameFolder = (folderId, newName) => {
    if (!newName?.trim()) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() } : f))
    );
  };

  const handleChangeFolderColor = (folderId, color) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, color } : f))
    );
  };

  const handleDeleteFolder = (folderId) => {
    setFolders((prev) => {
      const remaining = prev.filter((f) => f.id !== folderId);
      if (activeFolderId === folderId) {
        const nextFolder = remaining[0] || null;
        setActiveFolderId(nextFolder ? nextFolder.id : null);
        setActiveNotebookId(nextFolder?.notebooks[0]?.id || null);
      }
      return remaining;
    });
    setConfirmClearPage(false);
  };

  const handleAddNotebook = (folderId, title) => {
    if (!title?.trim()) return;
    const newNotebook = {
      id: `nb-${Date.now()}`,
      title: title.trim(),
      color: '#38bdf8',
      content: '',
      textBoxes: [],
      strokes: [],
      history: [],
      redoStack: [],
      updatedAt: Date.now(),
    };
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, isOpen: true, notebooks: [...f.notebooks, newNotebook] }
          : f
      )
    );
    setActiveFolderId(folderId);
    setActiveNotebookId(newNotebook.id);
    setConfirmClearPage(false);
  };

  const handleRenameNotebook = (folderId, notebookId, newTitle) => {
    if (!newTitle?.trim()) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              notebooks: f.notebooks.map((nb) =>
                nb.id === notebookId
                  ? { ...nb, title: newTitle.trim(), updatedAt: Date.now() }
                  : nb
              ),
            }
          : f
      )
    );
  };

  const handleChangeNotebookColor = (folderId, notebookId, color) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              notebooks: f.notebooks.map((nb) =>
                nb.id === notebookId ? { ...nb, color } : nb
              ),
            }
          : f
      )
    );
  };

  const handleDeleteNotebook = (folderId, notebookId) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const remainingNotebooks = f.notebooks.filter((nb) => nb.id !== notebookId);
        if (activeNotebookId === notebookId) {
          setActiveNotebookId(remainingNotebooks[0]?.id || null);
        }
        return { ...f, notebooks: remainingNotebooks };
      })
    );
    setConfirmClearPage(false);
  };

  const handleSelectNotebook = (folderId, notebookId) => {
    setActiveFolderId(folderId);
    setActiveNotebookId(notebookId);
    setConfirmClearPage(false);
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const activeNotebook = activeFolder?.notebooks.find(
    (n) => n.id === activeNotebookId
  );

  const handleUpdateNotebook = useCallback(
    (updatedNotebook, recordHistory = true, customPrevSnapshot = null) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id !== activeFolderId) return f;
          return {
            ...f,
            notebooks: f.notebooks.map((nb) => {
              if (nb.id !== updatedNotebook.id) return nb;

              let nextHistory = nb.history || [];
              let nextRedo = nb.redoStack || [];

              if (recordHistory) {
                const snapshot = customPrevSnapshot || {
                  strokes: nb.strokes || [],
                  textBoxes: nb.textBoxes || [],
                  content: nb.content || '',
                };
                nextHistory = [...nextHistory.slice(-49), snapshot];
                nextRedo = [];
              }

              return {
                ...updatedNotebook,
                history: nextHistory,
                redoStack: nextRedo,
                updatedAt: Date.now(),
              };
            }),
          };
        })
      );
    },
    [activeFolderId]
  );

  const handleUndo = useCallback(() => {
    if (!activeNotebook) return;
    const history = activeNotebook.history || [];
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    const currentSnapshot = {
      strokes: activeNotebook.strokes || [],
      textBoxes: activeNotebook.textBoxes || [],
      content: activeNotebook.content || '',
    };

    setFolders((prev) =>
      prev.map((f) =>
        f.id === activeFolderId
          ? {
              ...f,
              notebooks: f.notebooks.map((nb) =>
                nb.id === activeNotebook.id
                  ? {
                      ...nb,
                      strokes: previousState.strokes,
                      textBoxes: previousState.textBoxes,
                      content: previousState.content || '',
                      history: history.slice(0, -1),
                      redoStack: [...(nb.redoStack || []), currentSnapshot],
                      updatedAt: Date.now(),
                    }
                  : nb
              ),
            }
          : f
      )
    );
  }, [activeNotebook, activeFolderId]);

  const handleRedo = useCallback(() => {
    if (!activeNotebook) return;
    const redoStack = activeNotebook.redoStack || [];
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const currentSnapshot = {
      strokes: activeNotebook.strokes || [],
      textBoxes: activeNotebook.textBoxes || [],
      content: activeNotebook.content || '',
    };

    setFolders((prev) =>
      prev.map((f) =>
        f.id === activeFolderId
          ? {
              ...f,
              notebooks: f.notebooks.map((nb) =>
                nb.id === activeNotebook.id
                  ? {
                      ...nb,
                      strokes: nextState.strokes,
                      textBoxes: nextState.textBoxes,
                      content: nextState.content || '',
                      history: [...(nb.history || []), currentSnapshot],
                      redoStack: redoStack.slice(0, -1),
                      updatedAt: Date.now(),
                    }
                  : nb
              ),
            }
          : f
      )
    );
  }, [activeNotebook, activeFolderId]);

  const handleClearEntireNote = () => {
    if (!activeNotebook) return;
    handleUpdateNotebook({
      ...activeNotebook,
      content: '',
      textBoxes: [],
      strokes: [],
    });
    setConfirmClearPage(false);
  };

  // Global Keyboard Shortcuts:
  // Cmd/Ctrl + Shift + F = Pen
  // Cmd/Ctrl + H = Highlighter, E = Eraser, R = Color Picker, S = Selection, T = Typing, Z = Undo, X = Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.altKey) return;

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (!activeNotebook) return;

      const key = e.key.toLowerCase();

      if (key === 'f' && e.shiftKey) {
        e.preventDefault();
        setMode('draw');
        setDrawTool('pen');
        return;
      }

      if (e.shiftKey) return;

      if (key === 'h') {
        e.preventDefault();
        setMode('draw');
        setDrawTool('highlighter');
      } else if (key === 'e') {
        e.preventDefault();
        setMode('draw');
        setDrawTool('eraser');
      } else if (key === 'r') {
        e.preventDefault();
        setMode('draw');
        if (drawTool === 'eraser') setDrawTool('pen');
        setTimeout(() => colorInputRef.current?.click(), 0);
      } else if (key === 's') {
        e.preventDefault();
        setMode('select');
      } else if (key === 't') {
        e.preventDefault();
        setMode('type');
      } else if (key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (key === 'x') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNotebook, drawTool, handleUndo, handleRedo]);

  const isDark = theme === 'dark';

  const getDisplaySwatch = (color) =>
    isDark && color.toLowerCase() === '#0f172a' ? '#f8fafc' : color;

  const canUndo = (activeNotebook?.history?.length || 0) > 0;
  const canRedo = (activeNotebook?.redoStack?.length || 0) > 0;

  const activeColorValue = drawTool === 'highlighter' ? highlighterColor : penColor;
  const setActiveColorValue =
    drawTool === 'highlighter' ? setHighlighterColor : setPenColor;

  return (
    <div
      className={`flex h-dvh w-screen overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* Responsive Theme-Synced Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        width={sidebarWidth}
        theme={theme}
        onStartResize={startResizingSidebar}
        onClose={() => setIsSidebarOpen(false)}
        folders={folders}
        activeId={activeNotebookId}
        onToggleFolder={handleToggleFolder}
        onAddFolder={handleAddFolder}
        onAddNotebook={handleAddNotebook}
        onSelectNotebook={handleSelectNotebook}
        onRenameFolder={handleRenameFolder}
        onRenameNotebook={handleRenameNotebook}
        onDeleteFolder={handleDeleteFolder}
        onDeleteNotebook={handleDeleteNotebook}
        onChangeFolderColor={handleChangeFolderColor}
        onChangeNotebookColor={handleChangeNotebookColor}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Toolbar */}
        <header
          className={`relative z-30 min-h-[3.5rem] border-b px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 transition-colors duration-200 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Row 1 Left: Sidebar Toggle, Color Tag & Editable Active Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 max-w-[180px] sm:max-w-[230px]">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Open MindVault Library"
                className={`p-2 rounded-lg shrink-0 transition-colors duration-200 ${
                  isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <PanelLeftOpen size={19} />
              </button>
            )}
            {activeNotebook ? (
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <label
                  title="Change active note color tag"
                  style={{ backgroundColor: activeNotebook.color || '#38bdf8' }}
                  className="w-3.5 h-3.5 rounded-full shrink-0 cursor-pointer ring-2 ring-black/10 hover:scale-125 transition-transform"
                >
                  <input
                    type="color"
                    value={activeNotebook.color || '#38bdf8'}
                    onChange={(e) =>
                      handleChangeNotebookColor(
                        activeFolderId,
                        activeNotebook.id,
                        e.target.value
                      )
                    }
                    className="sr-only"
                  />
                </label>
                <input
                  type="text"
                  value={activeNotebook.title}
                  onChange={(e) =>
                    handleUpdateNotebook({
                      ...activeNotebook,
                      title: e.target.value,
                    })
                  }
                  title="Click to edit notebook title"
                  className={`font-semibold text-sm sm:text-base bg-transparent px-1.5 py-1 rounded border border-transparent focus:border-indigo-500 focus:outline-none truncate w-full transition-colors duration-200 ${
                    isDark
                      ? 'text-slate-100 hover:bg-slate-800 focus:bg-slate-900'
                      : 'text-slate-800 hover:bg-slate-100 focus:bg-white'
                  }`}
                />
              </div>
            ) : (
              <span className="font-semibold text-sm opacity-60 truncate">
                Select a notebook
              </span>
            )}
          </div>

          {/* Row 1 Right: Light / Dark Buttons, Clear & Export */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 lg:order-3">
            {/* Light & Dark Theme Buttons */}
            <div
              className={`flex items-center p-0.5 sm:p-1 rounded-lg border transition-colors duration-200 ${
                isDark
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-100 border-slate-200'
              }`}
              title="Switch Theme"
            >
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                title="Light Theme"
                className={`p-1.5 rounded-md transition-colors duration-200 ${
                  !isDark
                    ? 'bg-white text-amber-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                title="Dark Theme"
                className={`p-1.5 rounded-md transition-colors duration-200 ${
                  isDark
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon size={14} />
              </button>
            </div>

            {activeNotebook && (
              <>
                {confirmClearPage ? (
                  <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium">
                    <span className="hidden sm:inline">Clear?</span>
                    <button
                      onClick={handleClearEntireNote}
                      className="underline font-bold hover:text-red-100"
                    >
                      Yes
                    </button>
                    <span>/</span>
                    <button
                      onClick={() => setConfirmClearPage(false)}
                      className="underline hover:text-red-100"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearPage(true)}
                    title="Clear entire page (text and ink)"
                    className={`flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                      isDark
                        ? 'bg-slate-900 hover:bg-red-950/60 text-red-400 border-slate-800 hover:border-red-800'
                        : 'bg-slate-100 hover:bg-red-50 text-red-600 border-slate-200 hover:border-red-200'
                    }`}
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </>
            )}

            {/* Consolidated Export & Save Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-150 ${
                    isExportMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExportMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border py-1.5 z-50 transition-colors duration-200 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <button
                    onClick={handleManualSave}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {justSaved ? (
                        <Check size={15} className="text-emerald-500" />
                      ) : (
                        <Save size={15} className="text-indigo-500" />
                      )}
                      <span>{justSaved ? 'Saved!' : 'Save Now'}</span>
                    </span>
                  </button>

                  {activeNotebook && (
                    <>
                      <div
                        className={`my-1 border-t ${
                          isDark ? 'border-slate-800' : 'border-slate-100'
                        }`}
                      />
                      <button
                        onClick={() => {
                          exportAsPNG(activeNotebook, theme);
                          setIsExportMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm transition-colors ${
                          isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                      >
                        <FileImage size={15} className="text-sky-500" />
                        <span>Export as PNG</span>
                      </button>

                      <button
                        onClick={() => {
                          exportAsPDF(activeNotebook, theme);
                          setIsExportMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm transition-colors ${
                          isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                      >
                        <FileText size={15} className="text-rose-500" />
                        <span>Export as PDF</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center / Row 2: Mode Switcher, Draw Tools, Undo/Redo */}
          {activeNotebook && (
            <div
              className={`w-full lg:w-auto order-3 lg:order-2 flex flex-wrap items-center justify-center gap-2 pt-1 lg:pt-0 border-t lg:border-t-0 transition-colors duration-200 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              {/* Type | Draw | Select Pill */}
              <div
                className={`flex p-0.5 sm:p-1 rounded-lg border transition-colors duration-200 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {[
                  { id: 'type', label: 'Type', title: 'Type Anywhere (⌘/Ctrl + T)', icon: Type },
                  { id: 'draw', label: 'Draw', title: 'Draw & Shapes (⌘/Ctrl + Shift + F)', icon: PenTool },
                  { id: 'select', label: 'Select', title: 'Select & Move Items (⌘/Ctrl + S)', icon: MousePointer2 },
                ].map(({ id, label, title, icon: Icon }) => {
                  const active = mode === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      title={title}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                        active
                          ? isDark
                            ? 'bg-slate-800 text-indigo-400 shadow-sm'
                            : 'bg-white text-indigo-600 shadow-sm'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {mode === 'draw' && (
                <div
                  className={`flex flex-wrap items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l transition-colors duration-200 ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div
                    className={`flex items-center p-0.5 rounded-lg border transition-colors duration-200 ${
                      isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    {DRAW_TOOLS.map(({ id, label, icon: Icon }) => {
                      const active = drawTool === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setDrawTool(id)}
                          title={label}
                          className={`p-1.5 rounded-md transition-colors duration-200 ${
                            active
                              ? isDark
                                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                                : 'bg-white text-indigo-600 shadow-sm'
                              : isDark
                              ? 'text-slate-400 hover:text-slate-200'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon size={14} />
                        </button>
                      );
                    })}
                  </div>

                  {drawTool !== 'eraser' && (
                    <>
                      <label
                        title="Open full color wheel (⌘/Ctrl + R)"
                        style={{
                          background:
                            'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
                        }}
                        className="relative w-6 h-6 rounded-full cursor-pointer shadow-sm ring-1 ring-black/20 flex items-center justify-center hover:scale-110 transition-transform shrink-0"
                      >
                        <span
                          style={{ backgroundColor: getDisplaySwatch(activeColorValue) }}
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-white"
                        />
                        <input
                          ref={colorInputRef}
                          type="color"
                          value={activeColorValue}
                          onChange={(e) => setActiveColorValue(e.target.value)}
                          className="sr-only"
                        />
                      </label>

                      <div
                        className={`flex items-center gap-1 sm:gap-1.5 pl-1.5 sm:pl-2 border-l transition-colors duration-200 ${
                          isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}
                        title={
                          drawTool === 'highlighter'
                            ? 'Highlighter presets'
                            : 'Recently used colors'
                        }
                      >
                        {(drawTool === 'highlighter'
                          ? HIGHLIGHTER_COLORS
                          : recentColors
                        ).map((color) => (
                          <button
                            key={color}
                            onClick={() => setActiveColorValue(color)}
                            style={{ backgroundColor: getDisplaySwatch(color) }}
                            className={`w-4 h-4 rounded-full border border-black/15 transition-transform ${
                              activeColorValue.toLowerCase() === color.toLowerCase()
                                ? 'scale-125 ring-2 ring-offset-1 ring-indigo-500'
                                : 'hover:scale-110'
                            }`}
                            title={color}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {drawTool === 'eraser' ? (
                    <div className="flex items-center gap-1 pl-1" title="Eraser size">
                      <input
                        type="range"
                        min="6"
                        max="64"
                        value={eraserSize}
                        onChange={(e) => setEraserSize(Number(e.target.value))}
                        className="w-16 sm:w-20 accent-indigo-600"
                      />
                      <span className="text-[11px] font-mono opacity-70 w-7">
                        {eraserSize}px
                      </span>
                    </div>
                  ) : drawTool === 'highlighter' ? (
                    <div className="flex items-center gap-1 pl-1" title="Highlighter width">
                      <input
                        type="range"
                        min="10"
                        max="48"
                        value={highlighterSize}
                        onChange={(e) => setHighlighterSize(Number(e.target.value))}
                        className="w-16 sm:w-20 accent-indigo-600"
                      />
                      <span className="text-[11px] font-mono opacity-70 w-7">
                        {highlighterSize}px
                      </span>
                    </div>
                  ) : (
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={penSize}
                      onChange={(e) => setPenSize(Number(e.target.value))}
                      title="Stroke thickness"
                      className="w-14 sm:w-16 accent-indigo-600"
                    />
                  )}
                </div>
              )}

              {/* Undo (⌘/Ctrl + Z) & Redo (⌘/Ctrl + X) Controls */}
              <div
                className={`flex items-center gap-0.5 pl-1.5 sm:pl-2 border-l transition-colors duration-200 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo (⌘/Ctrl + Z)"
                  className={`p-1.5 rounded transition-colors duration-200 disabled:opacity-30 ${
                    isDark
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Undo2 size={15} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo (⌘/Ctrl + X)"
                  className={`p-1.5 rounded transition-colors duration-200 disabled:opacity-30 ${
                    isDark
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Redo2 size={15} />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Note Editor Canvas */}
        {activeNotebook ? (
          <NoteEditor
            notebook={activeNotebook}
            mode={mode}
            drawTool={drawTool}
            penColor={penColor}
            penSize={penSize}
            highlighterColor={highlighterColor}
            highlighterSize={highlighterSize}
            eraserSize={eraserSize}
            theme={theme}
            onUpdate={handleUpdateNotebook}
            onStrokeCommit={recordRecentColor}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-center opacity-60 bg-transparent">
            Open the library on the left and select or create a notebook to begin.
          </div>
        )}
      </div>
    </div>
  );
}