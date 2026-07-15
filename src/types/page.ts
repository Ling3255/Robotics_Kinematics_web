export interface Chapter {
  id: number;
  title: string;
  path: string;
  description: string;
}

export interface MissionProgress {
  chapterId: number;
  currentTask: number;
  tasksCompleted: number;
  isUnlocked: boolean;
}
