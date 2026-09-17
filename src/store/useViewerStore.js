import { create } from 'zustand';

export const useViewerStore = create((set) => ({
  inputUrl: "",
  setInputUrl: (val) => set({ inputUrl: val }),
  
  transMode: "viewer",
  setTransMode: (val) => set({ transMode: val }),
  
  transProgress: 0,
  setTransProgress: (val) => set({ transProgress: val }),
  
  isTranslating: false,
  setIsTranslating: (val) => set({ isTranslating: val }),
  
  lastTranslateSubTab: "translate",
  setLastTranslateSubTab: (val) => set({ lastTranslateSubTab: val }),
  
  viewerTitle: "",
  setViewerTitle: (val) => set({ viewerTitle: val }),
  
  viewerParagraphs: [],
  setViewerParagraphs: (updater) => set((state) => ({
    viewerParagraphs: typeof updater === 'function' ? updater(state.viewerParagraphs) : updater
  })),
  
  novelHtmlResult: "",
  setNovelHtmlResult: (val) => set({ novelHtmlResult: val }),
  
  pageSystemPrompt: "",
  setPageSystemPrompt: (val) => set({ pageSystemPrompt: val }),
  
  activeViewerNovelId: null,
  setActiveViewerNovelId: (val) => set({ activeViewerNovelId: val }),
  
  activeViewerChapter: 1,
  setActiveViewerChapter: (val) => set({ activeViewerChapter: val }),
  
  viewerPrevUrl: "",
  setViewerPrevUrl: (val) => set({ viewerPrevUrl: val }),
  
  viewerNextUrl: "",
  setViewerNextUrl: (val) => set({ viewerNextUrl: val }),
  
  viewerIndexUrl: "",
  setViewerIndexUrl: (val) => set({ viewerIndexUrl: val }),
  
  clickedOriginals: {},
  setClickedOriginals: (updater) => set((state) => ({
    clickedOriginals: typeof updater === 'function' ? updater(state.clickedOriginals) : updater
  })),
}));
