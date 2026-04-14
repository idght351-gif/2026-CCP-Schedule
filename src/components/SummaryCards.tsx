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
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-pastel-purple p-8 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="w-14 h-14 rounded-2xl bg-pastel-blue flex items-center justify-center shadow-sm">
          <Database className="w-7 h-7 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-text-muted mb-1">전체 운영 요약</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-extrabold text-orange-500">{progressPercentage}%</span>
            <span className="text-sm font-bold text-text-muted">진행 중</span>
          </div>
          
          <div className="space-y-1 mb-4">
            <div className="h-2 bg-app-bg rounded-full overflow-hidden border border-pastel-purple/20">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-orange-500 rounded-full"
              />
            </div>
            <p className="text-[10px] font-bold text-text-muted text-right">{completedCount} / {totalCount} 건 완료</p>
          </div>

          <div className="flex gap-2">
            <span className="text-[10px] bg-pastel-green text-green-700 px-2.5 py-1 rounded-lg font-bold">완료 {completedCount}</span>
            <span className="text-[10px] bg-primary-purple text-white px-2.5 py-1 rounded-lg font-bold shadow-sm shadow-primary-purple/20">D-7 예정 {upcomingSchedules.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-pastel-purple p-8 flex flex-col gap-4 hover:shadow-md transition-all">
        <div className="w-14 h-14 rounded-2xl bg-pastel-orange flex items-center justify-center shadow-sm">
          <RefreshCw className="w-7 h-7 text-orange-600" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold text-text-muted">차수 변경 관리</p>
            <span className="text-[10px] font-bold text-primary-purple bg-pastel-purple px-2 py-0.5 rounded-lg">LIVE</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-extrabold text-primary-purple">{requestStats.pending}</span>
            <span className="text-sm font-bold text-text-muted">건 대기중</span>
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

      <div className="bg-white rounded-[32px] shadow-sm border border-pastel-purple p-8 flex flex-col gap-4 hover:shadow-md transition-all">
        <div className="w-14 h-14 rounded-2xl bg-pastel-green flex items-center justify-center shadow-sm">
          <Key className="w-7 h-7 text-green-600" />
        </div>
        <div className="flex-1 flex flex-col">
          <p className="text-sm font-bold text-text-muted mb-4">키워드별 D-7 진행예정</p>
          <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
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
