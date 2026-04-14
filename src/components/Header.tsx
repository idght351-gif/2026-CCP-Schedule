import React, { useRef } from 'react';
import { Calendar, Users, Trash2, Download, Upload, LogOut, LogIn } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  isAdmin: boolean;
  isSystemAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
  handleReset: () => void;
  setActiveTab: (tab: any) => void;
  addNewTeam: () => void;
  setShowClearConfirm: (show: boolean) => void;
  downloadExcel: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  user: User | null;
  logout: () => void;
  login: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  isSystemAdmin,
  setIsAdmin,
  setToast,
  handleReset,
  setActiveTab,
  addNewTeam,
  setShowClearConfirm,
  downloadExcel,
  handleFileUpload,
  logout,
  login,
  user
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white border-b border-pastel-purple sticky top-0 z-30 px-4 md:px-6 py-3 md:py-4 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div 
            className="w-8 h-8 md:w-10 md:h-10 bg-primary-purple rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary-purple/30 cursor-pointer shrink-0"
            onClick={() => {
              const count = (window as any).adminClickCount || 0;
              (window as any).adminClickCount = count + 1;
              if (count + 1 >= 5) {
                const nextAdmin = !isAdmin;
                setIsAdmin(nextAdmin);
                (window as any).adminClickCount = 0;
                setToast({ 
                  message: nextAdmin ? "관리자 모드가 활성화되었습니다." : "사용자 모드로 전환되었습니다.", 
                  type: 'success' 
                });
              }
            }}
          >
            <Calendar className={`w-5 h-5 md:w-6 md:h-6 text-white ${(isAdmin || isSystemAdmin) ? 'animate-spin-slow' : ''}`} />
          </div>
          <div 
            className="cursor-pointer group"
            onClick={() => { handleReset(); setActiveTab('progress'); }}
          >
            <h1 className="text-sm md:text-lg font-extrabold text-text-main tracking-tight group-hover:text-primary-purple transition-colors leading-tight">
              2026 <br className="sm:hidden" /> 문화컨설팅 운영 플랫폼
              {(isAdmin || isSystemAdmin) && (
                <span className="block text-[10px] text-primary-purple font-black mt-0.5">
                  {isSystemAdmin ? 'SYSTEM ADMIN' : 'ADMIN MODE'}
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(isAdmin || isSystemAdmin) && (
            <div className="hidden md:flex items-center gap-2 mr-2 border-r border-pastel-purple pr-4">
              <button 
                onClick={addNewTeam}
                className="p-2 hover:bg-pastel-purple rounded-lg transition-colors text-primary-purple flex items-center gap-2 text-xs font-bold"
                title="팀 추가"
              >
                <Users className="w-4 h-4" />
                팀 추가
              </button>
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="p-2 hover:bg-pastel-purple rounded-lg transition-colors text-red-500 flex items-center gap-2 text-xs font-bold"
                title="전체 삭제"
              >
                <Trash2 className="w-4 h-4" />
                전체 삭제
              </button>
              <button 
                onClick={downloadExcel}
                className="p-2 hover:bg-pastel-purple rounded-lg transition-colors text-primary-purple flex items-center gap-2 text-xs font-bold"
                title="최종 일정 다운로드"
              >
                <Download className="w-4 h-4" />
                내려받기
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-primary-purple text-white hover:bg-primary-purple/90 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
              >
                <Upload className="w-4 h-4" />
                CSV 업로드
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.tsv,.txt" className="hidden" />
            </div>
          )}
          
          <div className="flex items-center gap-3 pl-2">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-text-main">{user.displayName || '시스템권한자'}</p>
                  <p className="text-[10px] text-text-muted">{user.email}</p>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full border border-pastel-purple shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pastel-purple flex items-center justify-center text-primary-purple font-bold text-xs">
                    {user.displayName?.[0] || 'S'}
                  </div>
                )}
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-pastel-pink rounded-lg transition-colors text-text-muted hover:text-red-500"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={login}
                className="px-4 py-2 bg-white border border-pastel-purple text-primary-purple rounded-xl text-xs font-bold hover:bg-pastel-purple transition-all flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                시스템권한자 로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
