export interface Schedule {
  id: number;
  date: string;
  keyword: string;
  teamName: string;
  leaderName: string;
  phone: string;
  count: number;
  instructor1: string;
  instructor2: string;
  location: string;
  memo?: string;
}

export const scheduleData: Schedule[] = [];
