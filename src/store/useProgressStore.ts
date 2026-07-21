import { create } from "zustand";
import { MissionProgress } from "@/types/page";

interface ProgressState {
  /** Chapter progress map: chapterId → MissionProgress */
  chapters: Record<number, MissionProgress>;

  /** Initialize all chapters (call once on app load) */
  initialize: () => void;

  /** Get progress for a specific chapter */
  getChapterProgress: (chapterId: number) => MissionProgress;

  /** Mark a task as completed for a chapter */
  completeTask: (chapterId: number, taskIndex: number) => void;

  /** Unlock a chapter */
  unlockChapter: (chapterId: number) => void;
}

function createInitialProgress(): Record<number, MissionProgress> {
  const chapters: Record<number, MissionProgress> = {};
  for (let i = 1; i <= 7; i++) {
    chapters[i] = {
      chapterId: i,
      currentTask: 0,
      tasksCompleted: 0,
      isUnlocked: i <= 2, // Chapter 1、2 初始解锁
    };
  }
  return chapters;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  chapters: createInitialProgress(),

  initialize: () => {
    set({ chapters: createInitialProgress() });
  },

  getChapterProgress: (chapterId: number) => {
    const state = get();
    if (!state.chapters[chapterId]) {
      // Auto-initialize if missing
      set({
        chapters: {
          ...state.chapters,
          [chapterId]: {
            chapterId,
            currentTask: 0,
            tasksCompleted: 0,
            isUnlocked: chapterId <= 2,
          },
        },
      });
    }
    return get().chapters[chapterId];
  },

  completeTask: (chapterId: number, taskIndex: number) => {
    set((state) => {
      const chapter = state.chapters[chapterId];
      if (!chapter) return state;

      const newTasksCompleted = Math.max(chapter.tasksCompleted, taskIndex + 1);
      const allDone = newTasksCompleted >= 3;

      // Unlock next chapter if all tasks done
      const nextChapter = allDone ? chapterId + 1 : null;
      const updatedChapters = {
        ...state.chapters,
        [chapterId]: {
          ...chapter,
          currentTask: Math.min(taskIndex + 1, 3),
          tasksCompleted: newTasksCompleted,
        },
      };

      if (nextChapter && nextChapter <= 7 && updatedChapters[nextChapter]) {
        updatedChapters[nextChapter] = {
          ...updatedChapters[nextChapter],
          isUnlocked: true,
        };
      }

      return { chapters: updatedChapters };
    });
  },

  unlockChapter: (chapterId: number) => {
    set((state) => ({
      chapters: {
        ...state.chapters,
        [chapterId]: {
          ...state.chapters[chapterId],
          isUnlocked: true,
        },
      },
    }));
  },
}));
