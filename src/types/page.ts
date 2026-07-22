export interface Mission {
  id: number;
  title: string;
  path: string;
  description: string;
}

export interface MissionProgress {
  missionId: number;
  currentTask: number;
  tasksCompleted: number;
  isUnlocked: boolean;
}
