import { create } from "zustand";
import { MissionProgress } from "@/types/page";

interface ProgressState {
  missions: Record<number, MissionProgress>;

  initialize: () => void;

  getMissionProgress: (missionId: number) => MissionProgress;

  completeTask: (missionId: number, taskIndex: number) => void;

  unlockMission: (missionId: number) => void;
}

function createInitialProgress(): Record<number, MissionProgress> {
  const missions: Record<number, MissionProgress> = {};
  for (let i = 0; i <= 6; i++) {
    missions[i] = {
      missionId: i,
      currentTask: 0,
      tasksCompleted: 0,
      isUnlocked: true,
    };
  }
  return missions;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  missions: createInitialProgress(),

  initialize: () => {
    set({ missions: createInitialProgress() });
  },

  getMissionProgress: (missionId: number) => {
    const state = get();
    if (!state.missions[missionId]) {
      set({
        missions: {
          ...state.missions,
          [missionId]: {
            missionId,
            currentTask: 0,
            tasksCompleted: 0,
            isUnlocked: true,
          },
        },
      });
    }
    return get().missions[missionId];
  },

  completeTask: (missionId: number, taskIndex: number) => {
    set((state) => {
      const mission = state.missions[missionId];
      if (!mission) return state;

      const newTasksCompleted = Math.max(mission.tasksCompleted, taskIndex + 1);
      const allDone = newTasksCompleted >= 3;

      const nextMission = allDone ? missionId + 1 : null;
      const updatedMissions = {
        ...state.missions,
        [missionId]: {
          ...mission,
          currentTask: Math.min(taskIndex + 1, 3),
          tasksCompleted: newTasksCompleted,
        },
      };

      if (nextMission && nextMission <= 6 && updatedMissions[nextMission]) {
        updatedMissions[nextMission] = {
          ...updatedMissions[nextMission],
          isUnlocked: true,
        };
      }

      return { missions: updatedMissions };
    });
  },

  unlockMission: (missionId: number) => {
    set((state) => ({
      missions: {
        ...state.missions,
        [missionId]: {
          ...state.missions[missionId],
          isUnlocked: true,
        },
      },
    }));
  },
}));
