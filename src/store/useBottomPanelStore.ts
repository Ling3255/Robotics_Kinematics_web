"use client";

import { create } from "zustand";

interface BottomPanelConfig {
  hint?: string;
  onCheck?: () => void;
  onNext?: () => void;
  onReset?: () => void;
  checkDisabled?: boolean;
  nextDisabled?: boolean;
  resetDisabled?: boolean;
  checkLabel?: string;
}

interface BottomPanelState {
  config: BottomPanelConfig;
  setConfig: (config: BottomPanelConfig) => void;
  resetConfig: () => void;
}

const DEFAULT_CONFIG: BottomPanelConfig = {
  hint: "Ready to start. Follow the instructions on screen.",
  checkDisabled: true,
  nextDisabled: true,
  resetDisabled: true,
  checkLabel: "Previous",
};

export const useBottomPanelStore = create<BottomPanelState>((set) => ({
  config: DEFAULT_CONFIG,
  setConfig: (config) => set({ config: { ...DEFAULT_CONFIG, ...config } }),
  resetConfig: () => set({ config: DEFAULT_CONFIG }),
}));