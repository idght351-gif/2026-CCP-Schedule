import React from 'react';
import { motion } from 'motion/react';
import { Database, RefreshCw, Key } from 'lucide-react';
import { Schedule } from '../data';

interface SummaryCardsProps {
  schedules: Schedule[];
  upcomingSchedules: Schedule[];
  requestStats: {
    pending: number;
    pendingDetails: any[];
  };
  keywordStats: [string, { total: number; upcoming: number }][];
  isDatePassed: (date: string) => boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  schedules,
  upcomingSchedules,
  requestStats,
  keywordStats,
  isDatePassed
}) => {
  const completedCount = schedules.filter(s => isDatePassed(s.date)).length;
  const totalCount = schedules.length || 100; // Default to 100 if empty for demo
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  // Group upcoming schedules by keyword
  const groupedUpcoming = upcomingSchedules.reduce((acc, schedule) => {
    const kw = schedule.keyword;
    if (!acc[kw]) acc[kw] = [];
    acc[kw].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-sm border border-pastel-purple p-6 md:p-8 flex flex-col gap-4 md:gap-6 relative overflow-hidden group hover:shadow-md transition-all text-center md:text-left items-center md:items-start">
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-pastel-blue flex items-center justify-center shadow-sm shrink-0">
            <Database className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
          </div>
          <p className="text-base md:text-lg font-black text-text-main">전체 운영 요약</p>
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-2">
            <span className="text-4xl md:text-5xl font-black text-orange-500 tracking-tighter">{progressPercentage}%</span>
            <span className="text-xs md:text-sm font-bold text-text-muted">진행 중</span>
          </div>
          <p className="text-xs md:text-sm font-bold text-text-muted mt-2 bg-app-bg inline-block px-3 py-1 rounded-full">{completedCount} / {totalCount} 건 완료</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-sm border border-pastel-purple p-6 md:p-8 flex flex-col gap-4 md:gap-6 hover:shadow-md transition-all text-center md:text-left items-center md:items-start">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 mx-auto md:mx-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-pastel-orange flex items-center justify-center shadow-sm shrink-0">
              <RefreshCw className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
            </div>
            <p className="text-base md:text-lg font-black text-text-main">차수 변경 관리</p>
          </div>
          <span className="hidden md:block text-[9px] md:text-[10px] font-bold text-primary-purple bg-pastel-purple px-2 py-1 rounded-lg">LIVE</span>
        </div>

        <div className="flex-1 flex flex-col w-full">
          <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-2 mb-4">
            <span className="text-3xl md:text-4xl font-black text-primary-purple tracking-tighter">{requestStats.pending}</span>
            <span className="text-xs md:text-sm font-bold text-text-muted">건 대기중</span>
          </div>
          
          <div className="space-y-2 mt-auto max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {requestStats.pendingDetails.map(req => (
              <div key={req.id} className="bg-app-bg/80 p-3 rounded-2xl border border-pastel-purple/30 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-text-muted">
                  <span>{req.ourDate}</span>
                  <span>{req.targetDate}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-primary-purple truncate">{req.ourName}</p>
                    <p className="text-[9px] text-text-muted truncate">{req.ourKeyword}</p>
                  </div>
                  <RefreshCw className="w-3 h-3 text-orange-400 shrink-0" />
                  <div className="flex-1 truncate text-right">
                    <p className="text-xs font-bold text-text-main truncate">{req.targetName}</p>
                    <p className="text-[9px] text-text-muted truncate">{req.targetKeyword}</p>
                  </div>
                </div>
              </div>
            ))}
            {requestStats.pending === 0 && (
              <p className="text-[11px] text-text-muted italic py-2">대기 중인 요청이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-sm border border-pastel-purple p-6 md:p-8 flex flex-col gap-4 md:gap-6 hover:shadow-md transition-all text-center md:text-left items-center md:items-start">
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-pastel-green flex items-center justify-center shadow-sm shrink-0">
            <Key className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
          </div>
          <p className="text-base md:text-lg font-black text-text-main">키워드별 D-7 진행예정</p>
        </div>

        <div className="flex-1 flex flex-col w-full">
          <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-2 mb-4">
            <span className="text-3xl md:text-4xl font-black text-green-600 tracking-tighter">{upcomingSchedules.length}</span>
            <span className="text-xs md:text-sm font-bold text-text-muted">팀 예정</span>
          </div>
          
          <div className="space-y-4 w-full max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(groupedUpcoming).map(([kw, teams]) => (
              <div key={kw} className="space-y-2 bg-app-bg/50 p-3 rounded-2xl border border-pastel-purple/20">
                <div className="flex justify-between items-center border-b border-pastel-purple/30 pb-1.5 mb-1.5">
                  <span className="text-[11px] font-extrabold text-primary-purple">{kw}</span>
                  <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full text-text-muted">{teams.length}팀</span>
                </div>
                <div className="space-y-2">
                  {teams.map(team => (
                    <div key={team.id} className="text-[10px] space-y-0.5">
                      <div className="flex justify-between font-bold text-text-main">
                        <span>{team.teamName}</span>
                        <span className="text-primary-purple">{team.date}</span>
                      </div>
                      <div className="text-text-muted flex items-center gap-1">
                        <span className="bg-white px-1.5 rounded border border-pastel-purple/20">{team.location}</span>
                        <span>•</span>
                        <span>{team.leaderName} 팀장</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {upcomingSchedules.length === 0 && (
              <p className="text-[11px] text-text-muted text-center py-4 italic">예정된 일정이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
