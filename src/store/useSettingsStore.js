import { create } from 'zustand';
import { getPromptsTree } from '../promptManager.js';

const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemma-4-26b"];

const DEFAULT_BASE_PROMPTS = {
  chinese:
    "당신은 프로페셔널 웹소설 번역가입니다. 원문을 한국어 웹소설 스타일에 맞게 번역하세요.\n\n[주요 지침]\n- 직역투를 피하고 최대한 자연스러운 의역을 제공할 것.\n- 등장인물의 어투와 성격을 일관되게 유지할 것.",
  japanese:
    "당신은 프로페셔널 웹소설 번역가입니다. 원문을 한국어 웹소설 스타일에 맞게 번역하세요.\n\n[주요 지침]\n- 직역투를 피하고 최대한 자연스러운 의역을 제공할 것.\n- 일본어 서브컬처 특유의 뉘앙스를 한국 독자가 읽기 편하게 살릴 것.",
};

const DEFAULT_READER_SETTINGS = {
  fontSize: 16,
  lineHeight: 1.8,
  backgroundColor: "#1e1e2e",
  textColor: "#cdd6f4",
  textIndent: 0,
  maxWidth: 800,
  fontFamily: "Pretendard",
  keepOriginalText: false,
  opacity: 0,
  paragraphSpacing: 16,
};

export const useSettingsStore = create((set, get) => ({
  // --- 1. API & Models ---
  apiKeysInput: "",
  setApiKeysInput: (keys) => set({ apiKeysInput: keys }),
  
  selectedModel: localStorage.getItem("noveltrans_selected_model") || DEFAULT_MODELS[0],
  setSelectedModel: (model) => {
    set({ selectedModel: model });
    localStorage.setItem("noveltrans_selected_model", model);
  },
  
  availableModels: localStorage.getItem("noveltrans_available_models") 
    ? JSON.parse(localStorage.getItem("noveltrans_available_models")) 
    : DEFAULT_MODELS,
  setAvailableModels: (models) => {
    set({ availableModels: models });
    localStorage.setItem("noveltrans_available_models", JSON.stringify(models));
  },

  // --- 2. Prompts & Languages ---
  basePrompts: localStorage.getItem("noveltrans_base_prompts")
    ? JSON.parse(localStorage.getItem("noveltrans_base_prompts"))
    : DEFAULT_BASE_PROMPTS,
  setBasePrompts: (prompts) => {
    set({ basePrompts: prompts });
    localStorage.setItem("noveltrans_base_prompts", JSON.stringify(prompts));
  },
  
  promptsTree: getPromptsTree(),
  setPromptsTree: (tree) => set({ promptsTree: tree }),
  refreshPromptsTree: () => set({ promptsTree: getPromptsTree() }),
  
  selectedLang: "chinese", 
  setSelectedLang: (lang) => set({ selectedLang: lang }),
  
  selectedPreset: "default",
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),

  newPresetName: "",
  setNewPresetName: (name) => set({ newPresetName: name }),
  
  newPresetContent: "",
  setNewPresetContent: (content) => set({ newPresetContent: content }),
  
  editingPresetId: null,
  setEditingPresetId: (id) => set({ editingPresetId: id }),
  
  editingPresetContent: "",
  setEditingPresetContent: (content) => set({ editingPresetContent: content }),

  showPresetModal: false,
  setShowPresetModal: (show) => set({ showPresetModal: show }),
  
  modalPresetTarget: null,
  setModalPresetTarget: (target) => set({ modalPresetTarget: target }),
  
  modalPresetValue: "",
  setModalPresetValue: (value) => set({ modalPresetValue: value }),

  // --- 3. Reader Settings & Theme ---
  readerSettings: localStorage.getItem("noveltrans_reader_settings")
    ? JSON.parse(localStorage.getItem("noveltrans_reader_settings"))
    : DEFAULT_READER_SETTINGS,
  setReaderSettings: (settings) => {
    set({ readerSettings: settings });
    localStorage.setItem("noveltrans_reader_settings", JSON.stringify(settings));
  },
  
  appTheme: localStorage.getItem("noveltrans_app_theme") || "dark",
  setAppTheme: (theme) => {
    set({ appTheme: theme });
    localStorage.setItem("noveltrans_app_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  },
  
  themePresets: localStorage.getItem("noveltrans_theme_presets")
    ? JSON.parse(localStorage.getItem("noveltrans_theme_presets"))
    : {},
  setThemePresets: (presets) => {
    set({ themePresets: presets });
    localStorage.setItem("noveltrans_theme_presets", JSON.stringify(presets));
  },
  
  newThemePresetName: "",
  setNewThemePresetName: (name) => set({ newThemePresetName: name }),

  showThemeCollapse: true,
  setShowThemeCollapse: (show) => set({ showThemeCollapse: show }),
  
  showMiscCollapse: true,
  setShowMiscCollapse: (show) => set({ showMiscCollapse: show }),
  
  showBasePromptCollapse: true,
  setShowBasePromptCollapse: (show) => set({ showBasePromptCollapse: show }),
  
  showPresetPromptCollapse: true,
  setShowPresetPromptCollapse: (show) => set({ showPresetPromptCollapse: show }),

  // --- 4. Misc / Global UI Config ---
  cacheStats: { totalNovels: 0, totalCachedEpisodes: 0 },
  setCacheStats: (stats) => set({ cacheStats: stats }),
  
  importText: "",
  setImportText: (text) => set({ importText: text }),
  
  backupText: "",
  setBackupText: (text) => set({ backupText: text }),
}));
