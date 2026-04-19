import React, { useState, useMemo, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  Calendar, 
  MapPin, 
  Key, 
  RefreshCw, 
  Phone, 
  BookOpen,
  X, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Search,
  Users,
  Trash2,
  Upload,
  Download,
  Database,
  ArrowUp,
  ArrowDown,
  LogOut,
  LogIn,
  Sparkles,
  MessageCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { scheduleData, Schedule } from './data';
import { 
  db, 
  auth, 
  signInAnonymously,
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  writeBatch,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';

import { Toast } from './components/Toast';
import { Header } from './components/Header';
import { IntroSection } from './components/IntroSection';
import firebaseConfig from '../firebase-applet-config.json';

type FilterType = 'all' | 'month' | 'location' | 'keyword' | 'change';
type TabType = 'progress' | 'change' | 'calendar' | 'requests' | 'managers';

const KEYWORD_MANAGERS = [
  { keywords: ['리더십', '팔로워십'], name: '오승수 책임', phone: '010-2445-2055' },
  { keywords: ['혁신행동', '회복탄력성'], name: '김대연 책임', phone: '010-2049-5877' },
  { keywords: ['우수조직', '협업'], name: '심상수 책임', phone: '010-3381-2507' },
  { keywords: ['팀 신뢰', '팀 자부심'], name: '임재혁 매니저', phone: '010-4768-3451' }
];

const getManagerForKeyword = (keyword: string) => {
  if (keyword.startsWith('우수_')) {
    return KEYWORD_MANAGERS.find(m => m.keywords.includes('우수조직'));
  }
  return KEYWORD_MANAGERS.find(m => m.keywords.some(k => keyword.includes(k)));
};

const LOCATION_MAP: Record<string, string> = {
  '현대제철연수원': '현대제철연수원',
  '스틸스퀘어': '현대제철 판교오피스',
  '인천상공회의소': '인천상공회의소',
  '에코촌유스호스텔': '순천만에코촌유스호스텔',
  '지식산업센터': '포항시지식산업센터',
  '콩테이너': '콩테이너'
};

const getMapSearchTerm = (location: string) => {
  return LOCATION_MAP[location] || location;
};

const getManagerContactSms = (team: Schedule) => {
  const manager = getManagerForKeyword(team.keyword);
  if (!manager) return '';
  
  const message = `[문화컨설팅 일정문의]
안녕하세요, ${team.teamName} ${team.leaderName} 팀장입니다.
이번 문화컨설팅 참여 차수 변경을 검토했으나, 현재 가능한 일정이 없어 문의드립니다.
혹시 추가적인 일정 조정이나 별도의 대안이 있을지 확인 부탁드립니다. 감사합니다.`;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  return `sms:${manager.phone.replace(/ /g, '')}${separator}body=${encodeURIComponent(message)}`;
};

function AdminPasswordModal({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (key: string) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adminCodes = ['2016041', '2016343', '2021166', '2017032'];
    if (adminCodes.includes(input)) {
       onSubmit(input);
       setInput('');
       setError(false);
    } else {
       setError(true);
       setInput('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm border border-pastel-purple"
          >
             <div className="w-16 h-16 bg-primary-purple rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-purple/20">
               <Key className="w-8 h-8 text-white" />
             </div>
             <h2 className="text-2xl font-black text-text-main mb-2 tracking-tight text-center">관리자 인증</h2>
             <p className="text-sm text-text-muted mb-6 leading-relaxed text-center font-medium">전용 7자리 코드를 입력해주세요.</p>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="relative">
                 <input 
                   type="text"
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   placeholder="0000000"
                   autoFocus
                   className={`w-full px-6 py-5 rounded-2xl border-2 transition-all outline-none text-center text-3xl font-black tracking-widest shadow-inner ${error ? 'border-red-400 bg-red-50 text-red-600 animate-shake' : 'border-pastel-purple focus:border-primary-purple bg-app-bg text-text-main'}`}
                 />
                 {error && <p className="text-xs text-red-500 font-bold mt-2 text-center">잘못된 코드입니다. 다시 입력해주세요.</p>}
               </div>
               <div className="flex gap-3 pt-2">
                 <button 
                   type="button"
                   onClick={onClose}
                   className="flex-1 py-4 rounded-2xl font-black text-text-muted bg-app-bg hover:bg-pastel-purple transition-all"
                 >
                   취소
                 </button>
                 <button 
                   type="submit"
                   className="flex-1 py-4 rounded-2xl font-black text-white bg-primary-purple hover:bg-primary-purple/90 transition-all shadow-lg shadow-primary-purple/20"
                 >
                   인증
                 </button>
               </div>
             </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('app_unlocked') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === '문화컨설팅') {
      setIsUnlocked(true);
      sessionStorage.setItem('app_unlocked', 'true');
      setPasswordError(false);
      if (isMobile) {
        setShowIntro(true);
      }
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [changeRequests, setChangeRequests] = useState<{ 
    id: number, 
    our: Schedule, 
    target: Schedule, 
    status: 'pending' | 'approved' | 'rejected', 
    timestamp: string,
    sentSmsOur?: boolean,
    sentSmsTarget?: boolean
  }[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Schedule | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Schedule | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [changeStep, setChangeStep] = useState<'select_ours' | 'select_theirs' | 'confirm' | null>(null);
  const [ourTeam, setOurTeam] = useState<Schedule | null>(null);
  const [targetTeam, setTargetTeam] = useState<Schedule | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [step1Search, setStep1Search] = useState('');
  const [step2Search, setStep2Search] = useState('');
  const [activeFilterMenu, setActiveFilterMenu] = useState<FilterType | null>(null);
  const updateSmsStatus = async (requestId: number, teamType: 'our' | 'target') => {
    try {
      const field = teamType === 'our' ? 'sentSmsOur' : 'sentSmsTarget';
      await updateDoc(doc(db, 'changeRequests', requestId.toString()), { [field]: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'changeRequests');
    }
  };
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Schedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const calendarRef = useRef<FullCalendar>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasCompatibleTeams = useMemo(() => {
    if (!searchQuery) return true;
    const searchedTeam = schedules.find(s => s.teamName.includes(searchQuery.trim()));
    if (!searchedTeam) return true;
    
    return schedules.some(item => {
      const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
      return !isPending && item.id !== searchedTeam.id &&
             Math.abs(searchedTeam.count - item.count) <= 3 && 
             (searchedTeam.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
             (searchedTeam.location === item.location) &&
             (searchedTeam.date !== item.date);
    });
  }, [searchQuery, schedules, changeRequests]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle URL Parameters
  useEffect(() => {
    if (!isAuthReady || schedules.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const teamName = params.get('team');
    const search = params.get('search');
    
    if (teamName || search) {
      const query = teamName || search || '';
      setSearchQuery(query);
      // If it's a specific team name, we might want to scroll to it or highlight it
      const team = schedules.find(s => s.teamName === query);
      if (team) {
        setSelectedTeam(team);
      }
    }
  }, [isAuthReady, schedules]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    
    // Auto sign in anonymously
    signInAnonymously(auth).catch(err => {
      // Just log internally, don't show toast as the app now functions without auth
      // using strict data/key validation in the Firestore rules.
      console.log("Anonymous auth restricted (guest mode active):", err.message);
      setIsAuthReady(true);
    });
    
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    // No longer require user to be logged in to see schedules
    if (!isAuthReady) return;

    const qSchedules = query(collection(db, 'schedules'), orderBy('id', 'asc'));
    const unsubSchedules = onSnapshot(qSchedules, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Schedule);
      setSchedules(data);
    }, (error) => {
      // Only log error, don't crash for public users
      console.error("Firestore schedules error:", error);
    });

    const qRequests = query(collection(db, 'changeRequests'), orderBy('id', 'desc'));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as any);
      setChangeRequests(data);
    }, (error) => {
      console.error("Firestore requests error:", error);
    });

    return () => {
      unsubSchedules();
      unsubRequests();
    };
  }, [isAuthReady, isAdmin]);

  const login = () => {
    setShowAdminLogin(true);
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminKey(null);
    setToast({ message: '관리자 모드가 종료되었습니다.', type: 'success' });
  };

  const handleAdminAuth = (key: string) => {
    setIsAdmin(true);
    setAdminKey(key);
    setShowAdminLogin(false);
    setToast({ message: '관리자 인증에 성공하였습니다.', type: 'success' });
  };

  const logAdminAction = async (action: string, targetId: string, details: string = '') => {
    if (!adminKey) return;
    try {
      const logId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
      await setDoc(doc(db, 'logs', logId), {
        adminKey,
        action,
        targetId,
        details,
        timestamp: new Date().toLocaleString('ko-KR')
      });
    } catch (e) {
      console.error("Logging error:", e);
    }
  };

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredRequests = useMemo(() => {
    let reqs = [...changeRequests];
    
    // User view: hide rejected requests as suggested
    if (!isAdmin) {
      reqs = reqs.filter(r => r.status !== 'rejected');
    }

    if (requestFilter !== 'all') {
      reqs = reqs.filter(r => r.status === requestFilter);
    }
    
    return reqs;
  }, [changeRequests, isAdmin, requestFilter]);

  const getSmsLink = (req: { our: Schedule, target: Schedule, status: string }, teamType: 'our' | 'target') => {
    const team = teamType === 'our' ? req.our : req.target;
    const isApproved = req.status === 'approved';
    const statusText = isApproved ? '승인' : '반려';
    const platformUrl = `${window.location.origin}?team=${encodeURIComponent(team.teamName)}`;
    
    const message = `[2026 문화컨설팅 일정변경 안내]

안녕하세요, 팀장님! 
문화컨설팅 운영담당자입니다. 😊

${req.our.teamName}과 ${req.target.teamName} 간의 
일정 변경 요청 결과를 안내드립니다.

이번 요청은 최종 [${statusText}] 되었습니다.

${isApproved ? `✨ 변경 확정 정보:
- 일정: ${req.target.date}
- 장소: ${req.target.location}
- 키워드: ${req.target.keyword}` : `💡 안내사항:
- 기존 일정대로 진행될 예정입니다.`}

바쁘신 와중에도 원활한 조율을 위해 
마음 써주신 두 분 팀장님께 진심으로 감사드립니다.

상세 내용은 플랫폼에서 확인하실 수 있습니다.
🔗 ${platformUrl}

오늘도 기분 좋은 하루 보내세요!`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const cleanPhone = team.phone.replace(/[^0-9]/g, '');
    
    return `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
  };

  useEffect(() => {
    if (activeTab === 'calendar' && calendarRef.current) {
      const timer = setTimeout(() => {
        if (!calendarRef.current) return;
        const calendarApi = calendarRef.current.getApi();
        
        // 1. If searching, go to the searched team's date
        if (searchQuery.trim()) {
          const searchedTeam = schedules.find(s => s.teamName.includes(searchQuery.trim()));
          if (searchedTeam) {
            const match = searchedTeam.date.match(/(\d+)\/(\d+)/);
            if (match) {
              const dateStr = `2026-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
              calendarApi.gotoDate(dateStr);
            }
          }
        } 
        // 2. If filtering by month, go to that month
        else if (filterType === 'month' && filterValue) {
          const dateStr = `2026-${filterValue.padStart(2, '0')}-01`;
          calendarApi.gotoDate(dateStr);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, filterType, filterValue, schedules, activeTab]);

  // Persist schedules and requests
  useEffect(() => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('changeRequests', JSON.stringify(changeRequests));
  }, [changeRequests]);

  // Derived Data
  const filteredData = useMemo(() => {
    let data = [...schedules];
    let searchedTeamObj: Schedule | null = null;

    // If there's a search query, prioritize showing that team and its keyword group
    if (searchQuery.trim()) {
      const matches = schedules.filter(item => item.teamName.includes(searchQuery.trim()));
      
      // Only consider it "Our Team" if exactly one match is found
      if (matches.length === 1) {
        searchedTeamObj = matches[0];
        const baseKeyword = searchedTeamObj.keyword.split('_').pop() || searchedTeamObj.keyword;
        
        // Compatible teams logic
        const isCompatible = (item: Schedule) => {
          if (!searchedTeamObj) return false;
          const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
          if (isPending) return false;
          return Math.abs(searchedTeamObj.count - item.count) <= 3 && 
                 (searchedTeamObj.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
                 (searchedTeamObj.location === item.location) &&
                 searchedTeamObj.id !== item.id &&
                 searchedTeamObj.date !== item.date;
        };

        const compatibleTeams = schedules.filter(isCompatible);
        const keywordGroup = schedules.filter(item => 
          item.keyword.includes(baseKeyword) && 
          item.id !== searchedTeamObj!.id && 
          !compatibleTeams.some(ct => ct.id === item.id)
        );
        const others = schedules.filter(item => 
          item.id !== searchedTeamObj!.id && 
          !compatibleTeams.some(ct => ct.id === item.id) &&
          !keywordGroup.some(kg => kg.id === item.id)
        );

        // Sort: Searched -> Compatible -> Keyword Group -> Others
        data = [searchedTeamObj, ...compatibleTeams, ...keywordGroup, ...others];
      } else {
        data = matches;
      }
    } else {
      if (filterType === 'month') {
        data = schedules.filter(item => item.date.startsWith(filterValue));
      } else if (filterType === 'location') {
        data = schedules.filter(item => item.location.includes(filterValue));
      } else if (filterType === 'keyword') {
        if (filterValue === '우수조직' || filterValue === '우수팀') {
          data = schedules.filter(item => item.keyword.startsWith('우수_') || item.keyword.includes('우수조직') || item.keyword.includes('우수팀'));
        } else {
          data = schedules.filter(item => item.keyword.includes(filterValue));
        }
      }
    }

    // Apply Sorting only if not searching (to keep searched team at top)
    if (sortConfig.key && !searchQuery.trim()) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [filterType, filterValue, schedules, searchQuery, sortConfig]);

  const months = useMemo(() => {
    const base = Array.from(new Set(schedules.map(item => item.date.split('/')[0]))).sort((a, b) => Number(a) - Number(b));
    // Ensure at least 4-9 are shown if requested
    const extended = Array.from(new Set([...base, "4", "5", "6", "7", "8", "9"])).sort((a, b) => Number(a) - Number(b));
    return extended;
  }, [schedules]);
  const locations = useMemo(() => Array.from(new Set(schedules.map(item => item.location.trim()))), [schedules]);
  const keywords = useMemo(() => {
    const raw = Array.from(new Set(schedules.map(item => {
      if (item.keyword.startsWith('우수_') || item.keyword.includes('우수조직') || item.keyword.includes('우수팀')) return '우수조직';
      return item.keyword.split('_').pop() || item.keyword;
    })));
    return raw.sort();
  }, [schedules]);

  const isDatePassed = (dateStr: string) => {
    try {
      const [monthDay] = dateStr.split('(');
      const [m, d] = monthDay.split('/').map(Number);
      const today = new Date(2026, 3, 13); // 2026-04-13
      const scheduleDate = new Date(2026, m - 1, d);
      return scheduleDate < today;
    } catch (e) {
      return false;
    }
  };

  const getKeywordStyle = (keyword: string) => {
    if (keyword.startsWith('우수_')) {
      return 'bg-pastel-green text-green-700 border-green-200 shadow-sm';
    }
    const base = keyword.split('_').pop() || keyword;
    const colors: Record<string, string> = {
      '회복탄력성': 'bg-pastel-pink text-primary-purple border-pastel-pink/50',
      '혁신행동': 'bg-pastel-orange text-primary-purple border-pastel-orange/50',
      '팀 신뢰': 'bg-pastel-blue text-primary-purple border-pastel-blue/50',
      '리더십': 'bg-pastel-purple text-primary-purple border-pastel-purple/50',
      '자부심': 'bg-pastel-green text-primary-purple border-pastel-green/50',
      '팔로워십': 'bg-pastel-pink/50 text-primary-purple border-pastel-pink/30',
      '우수조직': 'bg-pastel-green text-green-700 border-green-200 shadow-sm',
    };
    return colors[base] || 'bg-app-bg text-text-main border-pastel-purple';
  };

  const handleSort = (key: keyof Schedule) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleReset = () => {
    setFilterType('all');
    setFilterValue('');
    setSearchQuery('');
    setSortConfig({ key: null, direction: 'asc' });
    setActiveFilterMenu(null);
    setOurTeam(null);
    setTargetTeam(null);
    setStep1Search('');
    setStep2Search('');
    setChangeStep(null);
  };

  const startChangeFlow = () => {
    setActiveTab('change');
    setFilterType('change');
    setOurTeam(null);
    setTargetTeam(null);
    setStep1Search('');
    setStep2Search('');
    setIsAgreed(false);
    setActiveFilterMenu(null);
    setChangeStep('select_ours');
  };

  const submitChangeRequest = async () => {
    if (!ourTeam || !targetTeam || !isAgreed) return;
    
    const newId = changeRequests.length > 0 ? Math.max(...changeRequests.map(r => r.id)) + 1 : 1;
    const newRequest = {
      id: newId,
      our: ourTeam,
      target: targetTeam,
      status: 'pending' as const,
      timestamp: new Date().toLocaleString('ko-KR')
    };
    
    try {
      await setDoc(doc(db, 'changeRequests', newId.toString()), newRequest);
      setToast({ message: '차수 변경 요청이 전송되었습니다. 관리자 승인 후 반영됩니다.', type: 'success' });
      handleReset();
      setActiveTab('requests');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'changeRequests');
    }
  };

  const approveRequest = async (requestId: number) => {
    if (!isAdmin || !adminKey) {
      setToast({ message: '관리 권한이 없습니다. 다시 로그인해주세요.', type: 'error' });
      return;
    }
    const request = changeRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return;

    try {
      // 1. Swap schedules in Firestore
      const ourRef = doc(db, 'schedules', request.our.id.toString());
      const targetRef = doc(db, 'schedules', request.target.id.toString());
      
      // We swap the metadata (date, location, keyword) between the two team IDs
      await updateDoc(ourRef, { 
        date: request.target.date, 
        location: request.target.location,
        keyword: request.target.keyword,
        adminKey
      });
      await updateDoc(targetRef, { 
        date: request.our.date, 
        location: request.our.location, 
        keyword: request.our.keyword,
        adminKey
      });
      
      // 2. Update request status in Firestore
      await updateDoc(doc(db, 'changeRequests', requestId.toString()), { status: 'approved', adminKey });
      
      await logAdminAction('APPROVE_REQUEST', requestId.toString(), `Swap: ${request.our.teamName} <-> ${request.target.teamName}`);
      setToast({ message: '요청이 승인되어 일정이 교체되었습니다.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'schedules');
    }
  };

  const rejectRequest = async (requestId: number) => {
    if (!isAdmin || !adminKey) {
      setToast({ message: '관리 권한이 없습니다. 다시 로그인해주세요.', type: 'error' });
      return;
    }
    try {
      await updateDoc(doc(db, 'changeRequests', requestId.toString()), { status: 'rejected', adminKey });
      await logAdminAction('REJECT_REQUEST', requestId.toString());
      setToast({ message: '요청이 반려되었습니다.', type: 'error' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'changeRequests');
    }
  };

  const deleteRequest = async (requestId: number) => {
    try {
      await deleteDoc(doc(db, 'changeRequests', requestId.toString()));
      setToast({ message: '요청 기록이 삭제되었습니다.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'changeRequests');
    }
  };

  const deleteTeam = async (id: number) => {
    if (!isAdmin || !adminKey) return;
    try {
      await deleteDoc(doc(db, 'schedules', id.toString()));
      await logAdminAction('DELETE_TEAM', id.toString());
      setSelectedTeam(null);
      setIsEditing(false);
      setEditForm(null);
      setDeleteConfirmId(null);
      setToast({ message: '팀이 삭제되었습니다.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'schedules');
    }
  };

  const handleEditSave = async () => {
    if (!editForm || !isAdmin || !adminKey) return;
    
    try {
      await setDoc(doc(db, 'schedules', editForm.id.toString()), { ...editForm, adminKey });
      await logAdminAction('EDIT_TEAM', editForm.id.toString(), editForm.teamName);
      setSelectedTeam(editForm);
      setIsEditing(false);
      setEditForm(null);
      setToast({ message: '팀 정보가 저장되었습니다.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    }
  };

  const addNewTeam = () => {
    const newTeam: Schedule = {
      id: Date.now(),
      date: '4/1(월)',
      keyword: '팀 신뢰',
      teamName: '새로운 팀',
      leaderName: '팀장이름',
      phone: '010-0000-0000',
      count: 10,
      instructor1: '',
      instructor2: '',
      location: '연수원'
    };
    setSelectedTeam(newTeam);
    setIsEditing(true);
    setEditForm(newTeam);
  };

  const selectOurTeam = (team: Schedule) => {
    setOurTeam(team);
    setChangeStep('select_theirs');
  };

  const selectTargetTeam = (team: Schedule) => {
    setTargetTeam(team);
    setChangeStep('confirm');
  };

  const startChangeWithTeam = (team: Schedule) => {
    setOurTeam(team);
    setTargetTeam(null);
    setStep2Search('');
    setIsAgreed(false);
    setActiveTab('change');
    setChangeStep('select_theirs');
    setActiveFilterMenu(null);
    setSearchQuery('');
    
    // Scroll to instructions section
    setTimeout(() => {
      const element = document.getElementById('change-instructions');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const quickChange = (our: Schedule, target: Schedule) => {
    setOurTeam(our);
    setTargetTeam(target);
    setIsAgreed(false);
    setActiveTab('change');
    setFilterType('all');
    setChangeStep('confirm');
    setSearchQuery('');
    setSelectedTeam(null);
    setActiveFilterMenu(null);
    
    // Scroll to instructions section
    setTimeout(() => {
      const element = document.getElementById('change-instructions');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const getCompatibilityReason = (team: Schedule) => {
    if (!ourTeam) return "";
    const countDiff = Math.abs(ourTeam.count - team.count);
    const ourKey = ourTeam.keyword.split('_').pop();
    const targetKey = team.keyword.split('_').pop();
    const locationMatch = ourTeam.location === team.location;
    
    const reasons = [];
    if (countDiff > 3) reasons.push(`인원 차이(${countDiff}명)`);
    if (ourKey !== targetKey) reasons.push(`키워드 상이(${targetKey})`);
    if (!locationMatch) reasons.push(`장소 상이(${team.location})`);
    if (ourTeam.date === team.date) reasons.push(`동일 날짜`);
    
    return reasons.join(', ');
  };

  const handleClearAll = async () => {
    if (!isAdmin || !adminKey) return;
    try {
      setToast({ message: '데이터를 삭제 중입니다...', type: 'success' });
      // 1. Clear Firestore schedules
      const snapshot = await getDocs(collection(db, 'schedules'));
      if (snapshot.empty) {
        setToast({ message: '삭제할 데이터가 없습니다.', type: 'success' });
        setShowClearConfirm(false);
        return;
      }

      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
      await logAdminAction('CLEAR_ALL_SCHEDULES', 'all');
      
      // 2. Clear local state
      setSchedules([]);
      setShowClearConfirm(false);
      handleReset();
      setToast({ message: '모든 데이터가 파이어베이스에서 삭제되었습니다.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'schedules');
    }
  };

  const downloadExcel = () => {
    if (!isAdmin) return;
    if (schedules.length === 0) {
      setToast({ message: '다운로드할 데이터가 없습니다.', type: 'error' });
      return;
    }

    const headers = ['ID', '날짜', '키워드', '팀명', '팀장명', '연락처', '인원', '장소', '관리자 메모'];
    const rows = schedules.map(s => [
      s.id,
      s.date,
      s.keyword,
      s.teamName,
      s.leaderName,
      s.phone,
      s.count,
      s.location,
      s.memo || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `2026_문화컨설팅_최종일정_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setToast({ message: '최종 일정 엑셀 다운로드가 완료되었습니다.', type: 'success' });
  };

  const parseAndUploadCSV = async (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('날짜') || firstLine.includes('date') || firstLine.includes('팀명') || firstLine.includes('일정') || firstLine.includes('id');
      const startIdx = hasHeader ? 1 : 0;
      
      const newSchedules: Schedule[] = lines.slice(startIdx).map((line, index) => {
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if ((char === ',' || char === '\t') && !inQuotes) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        
        const firstPart = parts[0]?.replace(/^"|"$/g, '') || '';
        // If first part is a date like 4/29, it is NOT an ID.
        const isDate = firstPart.includes('/') && firstPart.includes('(');
        const isFirstPartId = !isDate && !isNaN(Number(firstPart)) && firstPart.length > 0 && firstPart.length < 10;
        
        const offset = isFirstPartId ? 1 : 0;
        const id = isFirstPartId ? Number(firstPart) : (Date.now() + index);

        const date = parts[0 + offset]?.replace(/^"|"$/g, '') || '';
        const keyword = parts[1 + offset]?.replace(/^"|"$/g, '') || '';
        const teamName = parts[2 + offset]?.replace(/^"|"$/g, '') || '';
        const leaderName = parts[3 + offset]?.replace(/^"|"$/g, '') || '';
        const phone = parts[4 + offset]?.replace(/^"|"$/g, '') || '';
        const count = parseInt(parts[5 + offset]?.replace(/[^0-9]/g, '')) || 0;
        const instructor1 = parts[6 + offset]?.replace(/^"|"$/g, '') || '';
        const instructor2 = parts[7 + offset]?.replace(/^"|"$/g, '') || '';
        const location = parts[8 + offset]?.replace(/^"|"$/g, '') || '';
        const memo = parts[9 + offset]?.replace(/^"|"$/g, '') || '';

        // Only return a valid schedule if it at least has a team name
        if (!teamName) return null;

        return {
          id,
          date,
          keyword,
          teamName,
          leaderName,
          phone,
          count,
          location: location || '연수원',
          memo,
          instructor1,
          instructor2,
          adminKey: adminKey || undefined
        } as Schedule;
      }).filter((s): s is Schedule => s !== null);

      if (newSchedules.length > 0) {
        setToast({ message: '기존 데이터를 삭제하고 새 데이터를 연결 중입니다...', type: 'success' });
        
        try {
          const batch = writeBatch(db);
          
          // Clear existing schedules in the same batch
          const snapshot = await getDocs(collection(db, 'schedules'));
          snapshot.docs.forEach(d => {
            batch.delete(d.ref);
          });

          // Upload new schedules in the same batch
          newSchedules.forEach(s => {
            const docRef = doc(db, 'schedules', s.id.toString());
            batch.set(docRef, s);
          });

          // Single network request for all operations
          await batch.commit();
          
          await logAdminAction('CSV_UPLOAD', 'all', `Uploaded ${newSchedules.length} schedules`);
          setToast({ message: `${newSchedules.length}건의 데이터가 성공적으로 연결되었습니다.`, type: 'success' });
          handleReset();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'schedules');
        }
      }
    } catch (error) {
      console.error('Parsing error:', error);
      setToast({ message: '데이터 해석 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      let text = '';
      
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
      } catch (err) {
        const eucDecoder = new TextDecoder('euc-kr');
        text = eucDecoder.decode(buffer);
      }
      
      await parseAndUploadCSV(text);
      if (event.target) event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary-purple border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-bg to-pastel-purple/20 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-pastel-purple text-center space-y-8"
        >
          <div className="w-20 h-20 bg-primary-purple rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-primary-purple/20">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-text-main leading-tight">
              2026 문화컨설팅 <br/> 운영 시스템
            </h2>
            <div className="bg-app-bg p-6 rounded-2xl border border-pastel-purple/30 text-sm text-text-muted leading-relaxed font-medium">
              우리 팀의 '문화' 진단 결과를 바탕으로, 팀원이 함께 개선점을 찾아 스스로 ‘컨설팅’해보는 시간! <br/><br/>
              이번에 참여하실 프로그램은 <br/>
              <span className="text-primary-purple font-black text-lg">[ 2026 O O O O O ]</span> 입니다. <br/><br/>
              빈칸에 들어갈 프로그램명을 입력해 주세요.
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="프로그램명을 입력하세요"
                className={`w-full px-6 py-4 bg-app-bg border-2 rounded-2xl text-center font-bold text-lg focus:outline-none transition-all ${passwordError ? 'border-red-400 animate-shake' : 'border-pastel-purple focus:border-primary-purple'}`}
              />
              {passwordError && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-xs font-bold mt-2"
                >
                  정답이 아닙니다. 다시 한번 생각해 보세요!
                </motion.p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-primary-purple hover:bg-primary-purple/90 text-white rounded-2xl font-black text-lg shadow-lg shadow-primary-purple/20 transition-all active:scale-95"
            >
              입장하기
            </button>
          </form>

          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            현대제철 조직문화 혁신 프로젝트
          </p>
        </motion.div>
        
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-shake {
            animation: shake 0.2s ease-in-out 0s 2;
          }
        `}</style>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center p-6 md:p-12 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full space-y-12 py-10"
        >
          <div className="text-center space-y-4">
            <h1 className="text-primary-purple font-black text-2xl md:text-3xl tracking-tight">문화컨설팅</h1>
            <h2 className="text-3xl md:text-5xl font-black text-text-main leading-tight">
              현대제철 조직문화 혁신, <br/>
              <span className="text-primary-purple">그 소중한 여정</span>
            </h2>
            <p className="text-text-muted font-bold text-sm md:text-lg leading-relaxed">
              서로를 이해하고 함께 성장하는 시간을 통해 <br/>
              우리 팀만의 고유한 문화를 만들어갑니다.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-pastel-purple shadow-sm flex gap-6 items-start">
              <div className="w-12 h-12 bg-pastel-purple rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary-purple" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg text-text-main">[소개] 우리 팀의 건강한 성장을 돕는 '문화컨설팅'</h3>
                <p className="text-sm text-text-muted leading-relaxed font-medium">
                  문화컨설팅은 팀 스스로 조직문화를 진단하고 개선점을 찾아가는 <span className="text-primary-purple font-bold">현대제철만의 팀 빌딩 여정</span>입니다. 2024년부터 시작되어 매년 100여 개의 팀이 참여해 온 이 여정은, 올해 <span className="text-primary-purple font-bold">첫 번째 사이클의 소중한 마침표</span>를 찍게 됩니다.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-pastel-purple shadow-sm flex gap-6 items-start">
              <div className="w-12 h-12 bg-pastel-blue rounded-2xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg text-text-main">[활동] 보고서 확인부터 팀빌딩까지, 소통의 시간</h3>
                <p className="text-sm text-text-muted leading-relaxed font-medium">
                  <span className="text-blue-600 font-bold underline underline-offset-4">팀별 진단 보고서</span>를 통해 우리 팀의 현주소를 객관적으로 파악하고, 도출된 보완 키워드를 주제로 심도 있게 논의합니다. 이어지는 <span className="text-blue-600 font-bold">맞춤형 팀빌딩 활동</span>은 키워드 개선은 물론, 팀원 간의 결속력을 높이는 <span className="text-blue-600 font-bold">활기찬 에너지</span>를 채워줄 것입니다.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-pastel-purple shadow-sm flex gap-6 items-start">
              <div className="w-12 h-12 bg-pastel-green rounded-2xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg text-text-main">[변화] 더 단단해진 팀워크, 더 깊어질 내일</h3>
                <p className="text-sm text-text-muted leading-relaxed font-medium">
                  이번 과정을 통해 우리 팀은 서로를 더 깊이 이해하고 <span className="text-green-600 font-bold">한 단계 더 성장</span>하게 됩니다. 올해 다진 탄탄한 기초를 바탕으로, 내년부터는 더욱 정교하고 고도화된 <span className="text-green-600 font-bold">상세 심화 프로그램</span>이 도입되어 여러분의 <span className="text-green-600 font-bold">조직문화 혁신을 전폭적으로 지원</span>할 예정입니다.
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowIntro(false)}
            className="w-full py-5 bg-primary-purple hover:bg-primary-purple/90 text-white rounded-[24px] font-black text-lg shadow-xl shadow-primary-purple/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            팀별 일정 확인 및 차수 변경하기
            <ArrowRight className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg font-sans text-text-main pb-20">
      <Header 
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        setToast={setToast}
        handleReset={handleReset}
        setActiveTab={setActiveTab}
        addNewTeam={addNewTeam}
        setShowClearConfirm={setShowClearConfirm}
        downloadExcel={downloadExcel}
        handleFileUpload={handleFileUpload}
        openAdminLogin={() => setShowAdminLogin(true)}
        logout={logout}
      />

      <AdminPasswordModal 
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSubmit={handleAdminAuth}
      />

      <main className="max-w-6xl mx-auto p-4 space-y-6 mt-4">
        {!isMobile && <IntroSection />}

        {/* Tabs - Dashboard Style */}
        <section className="border-b border-pastel-purple flex items-center justify-between">
          <div className="flex gap-8">
            <button 
              onClick={() => { setActiveTab('progress'); setFilterType('all'); setFilterValue(''); setActiveFilterMenu(null); }}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'progress' ? 'text-primary-purple' : 'text-text-muted hover:text-text-main'}`}
            >
              <Database className="w-4 h-4" />
              진행현황
              {activeTab === 'progress' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-purple rounded-t-full" />}
            </button>
            <button 
              onClick={startChangeFlow}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'change' ? 'text-primary-purple' : 'text-text-muted hover:text-text-main'}`}
            >
              <RefreshCw className="w-4 h-4" />
              차수변경 요청
              {activeTab === 'change' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-purple rounded-t-full" />}
            </button>
            <button 
              onClick={() => { setActiveTab('calendar'); setFilterType('all'); setFilterValue(''); setActiveFilterMenu(null); }}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'calendar' ? 'text-primary-purple' : 'text-text-muted hover:text-text-main'}`}
            >
              <Calendar className="w-4 h-4" />
              캘린더 뷰
              {activeTab === 'calendar' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-purple rounded-t-full" />}
            </button>
            <button 
              onClick={() => { setActiveTab('requests'); setFilterType('all'); setFilterValue(''); setActiveFilterMenu(null); }}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'requests' ? 'text-primary-purple' : 'text-text-muted hover:text-text-main'}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              요청 내역 ({changeRequests.filter(r => r.status === 'pending').length})
              {isAdmin && activeTab === 'requests' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-purple rounded-t-full" />}
            </button>
            <button 
              onClick={() => { setActiveTab('managers'); setFilterType('all'); setFilterValue(''); setActiveFilterMenu(null); }}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'managers' ? 'text-primary-purple' : 'text-text-muted hover:text-text-main'}`}
            >
              <Users className="w-4 h-4" />
              담당자 안내
              {activeTab === 'managers' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-purple rounded-t-full" />}
            </button>
          </div>
        </section>

        {/* Team Search Section - Only show in Progress/Calendar view */}
        {(activeTab === 'progress' || activeTab === 'calendar') && (
          <section className="bg-white rounded-[24px] shadow-sm border border-pastel-purple p-1 md:p-2">
            <div className="relative group">
              <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-text-muted group-focus-within:text-primary-purple transition-colors" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="팀 이름을 입력해 주세요."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-10 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 bg-transparent border-none focus:outline-none font-medium placeholder:text-text-muted text-sm md:text-lg"
              />
            </div>
          </section>
        )}

        {/* Filter Buttons Section - Redesigned */}
        {(activeTab === 'progress' || activeTab === 'calendar') && (
          <section className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-pastel-purple shadow-sm space-y-4 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="hidden md:flex items-center gap-3 mr-4 border-r pr-8 border-pastel-purple">
                <div className="w-10 h-10 rounded-xl bg-pastel-purple flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary-purple" />
                </div>
                <span className="text-sm font-extrabold text-text-main uppercase tracking-tight">상세 필터링</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:flex-wrap no-scrollbar">
                <button 
                  onClick={() => {
                    const next = activeFilterMenu === 'month' ? null : 'month';
                    setActiveFilterMenu(next);
                    if (next === null) { setFilterType('all'); setFilterValue(''); }
                  }}
                  className={`flex-shrink-0 px-5 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all border-2 ${activeFilterMenu === 'month' ? 'bg-primary-purple border-primary-purple text-white shadow-lg shadow-primary-purple/20' : 'bg-app-bg border-transparent text-text-muted hover:border-pastel-purple'}`}
                >
                  월별 일정
                </button>
                <button 
                  onClick={() => {
                    const next = activeFilterMenu === 'location' ? null : 'location';
                    setActiveFilterMenu(next);
                    if (next === null) { setFilterType('all'); setFilterValue(''); }
                  }}
                  className={`flex-shrink-0 px-5 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all border-2 ${activeFilterMenu === 'location' ? 'bg-primary-purple border-primary-purple text-white shadow-lg shadow-primary-purple/20' : 'bg-app-bg border-transparent text-text-muted hover:border-pastel-purple'}`}
                >
                  장소별 일정
                </button>
                <button 
                  onClick={() => {
                    const next = activeFilterMenu === 'keyword' ? null : 'keyword';
                    setActiveFilterMenu(next);
                    if (next === null) { setFilterType('all'); setFilterValue(''); }
                  }}
                  className={`flex-shrink-0 px-5 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all border-2 ${activeFilterMenu === 'keyword' ? 'bg-primary-purple border-primary-purple text-white shadow-lg shadow-primary-purple/20' : 'bg-app-bg border-transparent text-text-muted hover:border-pastel-purple'}`}
                >
                  키워드별 일정
                </button>
              </div>
            </div>
            
            {/* Sub-filters - Only show when category is active */}
            <AnimatePresence mode="wait">
              {activeFilterMenu && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 p-4 bg-app-bg rounded-xl border border-pastel-purple/30">
                    {activeFilterMenu === 'month' && months.map(m => (
                      <button 
                        key={m} 
                        onClick={() => { 
                          if (filterType === 'month' && filterValue === m) {
                            setFilterType('all');
                            setFilterValue('');
                          } else {
                            setFilterType('month'); 
                            setFilterValue(m); 
                          }
                        }} 
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filterType === 'month' && filterValue === m ? 'bg-primary-purple text-white' : 'bg-white text-text-muted border border-pastel-purple hover:border-primary-purple'}`}
                      >
                        {m}월
                      </button>
                    ))}
                    {activeFilterMenu === 'location' && locations.map(loc => (
                      <button 
                        key={loc} 
                        onClick={() => { 
                          if (filterType === 'location' && filterValue === loc) {
                            setFilterType('all');
                            setFilterValue('');
                          } else {
                            setFilterType('location'); 
                            setFilterValue(loc); 
                          }
                        }} 
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filterType === 'location' && filterValue === loc ? 'bg-primary-purple text-white' : 'bg-white text-text-muted border border-pastel-purple hover:border-primary-purple'}`}
                      >
                        {loc}
                      </button>
                    ))}
                    {activeFilterMenu === 'keyword' && keywords.map(kw => (
                      <button 
                        key={kw} 
                        onClick={() => { 
                          if (filterType === 'keyword' && filterValue === kw) {
                            setFilterType('all');
                            setFilterValue('');
                          } else {
                            setFilterType('keyword'); 
                            setFilterValue(kw); 
                          }
                        }} 
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filterType === 'keyword' && filterValue === kw ? 'bg-primary-purple text-white' : 'bg-white text-text-muted border border-pastel-purple hover:border-primary-purple'}`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Content Area */}
        <section className="space-y-4">
          {activeTab === 'calendar' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-pastel-purple p-4 md:p-6 calendar-container">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate="2026-05-01"
                locale="ko"
                weekends={!isMobile}
                headerToolbar={{
                  left: '',
                  center: 'prev title next',
                  right: 'today'
                }}
                events={filteredData.map(s => {
                  // Parse date string like "5/14(목)" to "2026-05-14"
                  const match = s.date.match(/(\d+)\/(\d+)/);
                  const date = match ? `2026-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : '';
                  return {
                    id: s.id.toString(),
                    title: s.teamName,
                    start: date,
                    extendedProps: { ...s },
                    backgroundColor: s.keyword.includes('회복') ? '#FFD1DC' : 
                                    s.keyword.includes('혁신') ? '#FFE4B5' :
                                    s.keyword.includes('신뢰') ? '#E0F0FF' :
                                    s.keyword.includes('리더') ? '#E6E6FA' : '#F0FFF0',
                    borderColor: '#D8BFD8',
                    textColor: '#4B0082'
                  };
                })}
                eventContent={(eventInfo) => {
                  const s = eventInfo.event.extendedProps;
                  return (
                    <div className="p-0.5 md:p-1 overflow-hidden">
                      <div className="font-black truncate text-[8px] md:text-[10px] mb-0.5">{eventInfo.event.title}</div>
                      <div className="hidden md:flex flex-wrap gap-1 opacity-80">
                        <span className="text-[8px] bg-white/40 px-1 rounded">{s.location}</span>
                        <span className="text-[8px] bg-white/40 px-1 rounded">{s.count}명</span>
                      </div>
                      <div className="text-[7px] md:text-[8px] mt-0.5 font-medium truncate opacity-70">
                        #{(s.keyword.startsWith('우수_') || s.keyword.includes('우수조직')) ? `우수_${s.keyword.split('_').pop()}` : s.keyword.split('_').pop()}
                      </div>
                    </div>
                  );
                }}
                dayCellClassNames={(arg) => {
                  const day = arg.date.getDay();
                  return (day === 0 || day === 6) ? 'unavailable-day' : '';
                }}
                eventClick={(info) => {
                  setSelectedTeam(info.event.extendedProps as Schedule);
                }}
                editable={isAdmin}
                eventDrop={(info) => {
                  const newDate = info.event.start;
                  if (newDate) {
                    const day = newDate.getDay();
                    if (day === 0 || day === 6) {
                      setToast({ message: '토, 일요일은 일정을 배치할 수 없습니다.', type: 'error' });
                      info.revert();
                      return;
                    }

                    const m = newDate.getMonth() + 1;
                    const d = newDate.getDate();
                    const days = ['일', '월', '화', '수', '목', '금', '토'];
                    const dayName = days[newDate.getDay()];
                    const dateStr = `${m}/${d}(${dayName})`;
                    
                    setSchedules(prev => prev.map(s => 
                      s.id.toString() === info.event.id ? { ...s, date: dateStr } : s
                    ));
                    setToast({ message: '일정이 변경되었습니다.', type: 'success' });
                  }
                }}
                height="auto"
              />
              <style>{`
                .calendar-container .fc {
                  --fc-border-color: #E6E6FA;
                  --fc-button-bg-color: #6D28D9;
                  --fc-button-border-color: #6D28D9;
                  --fc-button-hover-bg-color: #5B21B6;
                  --fc-button-active-bg-color: #4C1D95;
                  font-family: inherit;
                }
                .calendar-container .fc-toolbar-title {
                  font-size: 1.1rem !important;
                  font-weight: 800;
                  color: #4B0082;
                  margin: 0 15px !important;
                }
                .calendar-container .fc-prev-button, .calendar-container .fc-next-button {
                  background: #6D28D9 !important;
                  border: none !important;
                  color: white !important;
                  padding: 8px !important;
                  border-radius: 50% !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  transition: all 0.2s !important;
                  width: 32px !important;
                  height: 32px !important;
                  box-shadow: 0 2px 4px rgba(109, 40, 217, 0.2) !important;
                }
                .calendar-container .fc-prev-button:hover, .calendar-container .fc-next-button:hover {
                  background: #5B21B6 !important;
                  transform: scale(1.1);
                }
                .calendar-container .fc-toolbar-chunk {
                  display: flex !important;
                  align-items: center !important;
                }
                .calendar-container .fc-today-button {
                  background: #6D28D9 !important;
                  border: none !important;
                  font-weight: 800 !important;
                  text-transform: uppercase !important;
                  font-size: 10px !important;
                  padding: 6px 12px !important;
                  border-radius: 10px !important;
                }
                .calendar-container .fc-col-header-cell {
                  background: #F9FAFB;
                  padding: 8px 0;
                }
                .calendar-container .fc-daygrid-event {
                  border-radius: 6px;
                  padding: 2px 4px;
                  font-size: 11px;
                  font-weight: 700;
                  cursor: pointer;
                  border: 1px solid rgba(0,0,0,0.05) !important;
                }
                .calendar-container .fc-day-today {
                  background: rgba(109, 40, 217, 0.03) !important;
                }
                .calendar-container .unavailable-day {
                  background-color: #f3f4f6 !important;
                  background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px);
                  position: relative;
                }
                .calendar-container .unavailable-day::after {
                  content: '불가';
                  position: absolute;
                  bottom: 4px;
                  right: 4px;
                  font-size: 9px;
                  font-weight: 800;
                  color: #9ca3af;
                  opacity: 0.5;
                }
                .calendar-container .fc-daygrid-event-h-horizontal {
                  margin-bottom: 2px !important;
                }
              `}</style>
            </div>
          ) : activeTab === 'managers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {KEYWORD_MANAGERS.map((m, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 rounded-[32px] border border-pastel-purple shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1.5">
                        {m.keywords.map(k => (
                          <span key={k} className="px-3 py-1 bg-primary-purple text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-sm">
                            {k}
                          </span>
                        ))}
                      </div>
                      <h4 className="text-xl font-black text-text-main">{m.name}</h4>
                    </div>
                    <div className="w-12 h-12 bg-app-bg rounded-2xl flex items-center justify-center group-hover:bg-primary-purple transition-colors">
                      <MessageCircle className="w-6 h-6 text-primary-purple group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-pastel-purple/30">
                    <a 
                      href={`tel:${m.phone.replace(/ /g, '')}`} 
                      className="text-sm font-bold text-text-muted hover:text-primary-purple transition-colors flex items-center gap-2"
                    >
                      {m.phone}
                    </a>
                    <a 
                      href={`sms:${m.phone.replace(/ /g, '')}`}
                      className="px-4 py-2 bg-pastel-purple text-primary-purple text-xs font-black rounded-xl hover:bg-primary-purple hover:text-white transition-all"
                    >
                      문자 문의
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : activeTab === 'requests' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
                    // Hide rejected tab for non-admins
                    if (!isAdmin && f === 'rejected') return null;
                    
                    const labels = { all: '전체', pending: '대기중', approved: '승인됨', rejected: '반려됨' };
                    const count = f === 'all' 
                      ? (isAdmin ? changeRequests.length : changeRequests.filter(r => r.status !== 'rejected').length)
                      : changeRequests.filter(r => r.status === f).length;

                    return (
                      <button
                        key={f}
                        onClick={() => setRequestFilter(f)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                          requestFilter === f 
                            ? 'bg-primary-purple border-primary-purple text-white shadow-md' 
                            : 'bg-white border-pastel-purple text-text-muted hover:border-primary-purple'
                        }`}
                      >
                        {labels[f]} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((req) => (
                  <motion.div 
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-pastel-purple shadow-sm overflow-hidden group hover:shadow-md transition-all"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'approved' ? 'bg-pastel-green text-green-700' :
                            req.status === 'rejected' ? 'bg-pastel-pink text-primary-purple' :
                            'bg-pastel-orange text-primary-purple'
                          }`}>
                            {req.status === 'approved' ? '승인됨' : req.status === 'rejected' ? '반려됨' : '대기중'}
                          </span>
                          <span className="text-[10px] text-text-muted font-bold">{req.timestamp}</span>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => rejectRequest(req.id)}
                                  className="px-3 py-1.5 bg-app-bg hover:bg-pastel-pink text-primary-purple text-xs font-bold rounded-lg transition-colors border border-pastel-purple"
                                >
                                  반려
                                </button>
                                <button 
                                  onClick={() => approveRequest(req.id)}
                                  className="px-3 py-1.5 bg-primary-purple hover:bg-primary-purple/90 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                >
                                  승인
                                </button>
                              </>
                            )}
                            
                            <button 
                              onClick={() => deleteRequest(req.id)}
                              className="p-1.5 text-text-muted hover:text-pastel-pink hover:bg-pastel-pink/10 rounded-lg transition-colors"
                              title="기록 삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row items-stretch gap-4 bg-app-bg/50 p-4 rounded-xl border border-pastel-purple/30">
                        <div className="flex-1 space-y-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase">우리 팀 (현재)</p>
                            <p className="font-bold text-sm text-text-main">{req.our.teamName}</p>
                            <p className="text-xs text-text-muted">{req.our.date} · {req.our.location}</p>
                          </div>
                          {req.status !== 'pending' && isAdmin && (
                            <a 
                              href={getSmsLink(req, 'our')}
                              onClick={() => updateSmsStatus(req.id, 'our')}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all shadow-sm border ${
                                req.sentSmsOur 
                                  ? 'bg-pastel-purple/20 text-text-muted border-pastel-purple/30' 
                                  : 'bg-white text-primary-purple border-primary-purple/30 hover:bg-pastel-purple/10'
                              }`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              {req.sentSmsOur ? '발송완료' : '안내문자발송'}
                            </a>
                          )}
                        </div>
                        
                        <div className="flex flex-row md:flex-col items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white border border-pastel-purple flex items-center justify-center shadow-sm">
                            <ChevronRight className="w-4 h-4 text-primary-purple" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-3 text-right">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase">상대 팀 (희망)</p>
                            <p className="font-bold text-sm text-primary-purple">{req.target.teamName}</p>
                            <p className="text-xs text-text-muted">{req.target.date} · {req.target.location}</p>
                          </div>
                          {req.status !== 'pending' && isAdmin && (
                            <div className="flex justify-end">
                              <a 
                                href={getSmsLink(req, 'target')}
                                onClick={() => updateSmsStatus(req.id, 'target')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all shadow-sm border ${
                                  req.sentSmsTarget 
                                    ? 'bg-pastel-purple/20 text-text-muted border-pastel-purple/30' 
                                    : 'bg-white text-primary-purple border-primary-purple/30 hover:bg-pastel-purple/10'
                                }`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                {req.sentSmsTarget ? '발송완료' : '안내문자발송'}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-text-muted bg-pastel-purple/20 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>상대 팀장님({req.target.leaderName})과 사전 협의가 완료된 요청입니다.</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredRequests.length === 0 && (
                  <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-dashed border-pastel-purple">
                    <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto">
                      <Database className="w-8 h-8 text-pastel-purple" />
                    </div>
                    <p className="text-text-muted font-bold">표시할 요청 내역이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'change' ? (
            <div className="space-y-6">
              {/* Change Instructions */}
              <div id="change-instructions" className="bg-white border border-pastel-purple rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm scroll-mt-24">
                <div className="inline-flex items-center gap-2 bg-primary-purple text-white px-4 py-2 rounded-full shadow-sm">
                  <AlertCircle className="w-4 h-4" />
                  <h3 className="text-sm font-black">차수 변경 요청 프로세스</h3>
                </div>

                <div className="bg-pastel-blue/20 p-5 rounded-2xl border-l-4 border-primary-purple text-sm text-text-main font-medium leading-relaxed space-y-3">
                  <p>함께 성장하는 컨설팅 문화를 위해 <span className="text-primary-purple font-bold">상대 팀의 상황을 먼저 배려</span>해 주셔서 감사합니다.</p>
                  <p>원활한 일정 조정을 위해 상대 팀장님과 <span className="bg-white/60 px-1.5 py-0.5 rounded border border-pastel-blue/30 font-bold text-blue-700">사전에 변경 가능 논의</span>를 거치신 후 신청해 주세요.</p>
                  <p>두 팀 모두 만족스러운 컨설팅이 될 수 있도록 정성껏 돕겠습니다!</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-app-bg rounded-2xl border border-pastel-purple/30 group hover:border-primary-purple transition-all">
                    <span className="w-6 h-6 rounded-full bg-white border border-pastel-purple flex items-center justify-center text-xs font-black text-primary-purple shrink-0 shadow-sm">1</span>
                    <p className="text-sm text-text-main font-bold leading-snug">
                      변경을 희망하는 <span className="bg-pastel-pink/60 px-1.5 py-0.5 rounded text-primary-purple">우리 팀</span>을 먼저 선택하세요.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-app-bg rounded-2xl border border-pastel-purple/30 group hover:border-primary-purple transition-all">
                    <span className="w-6 h-6 rounded-full bg-white border border-pastel-purple flex items-center justify-center text-xs font-black text-primary-purple shrink-0 shadow-sm">2</span>
                    <p className="text-sm text-text-main font-bold leading-snug">
                      <span className="text-primary-purple underline decoration-pastel-orange decoration-2 underline-offset-2">같은 키워드, 지역, 비슷한 인원</span> 등 조건이 맞는 <span className="bg-pastel-orange/40 px-1.5 py-0.5 rounded text-orange-700">상대 팀</span>을 선택하세요.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-app-bg rounded-2xl border border-pastel-purple/30 group hover:border-primary-purple transition-all">
                    <span className="w-6 h-6 rounded-full bg-white border border-pastel-purple flex items-center justify-center text-xs font-black text-primary-purple shrink-0 shadow-sm">3</span>
                    <p className="text-sm text-text-main font-bold leading-snug">
                      상대 팀장님과 <span className="bg-pastel-green/60 px-1.5 py-0.5 rounded text-green-700">사전 변경 논의</span>를 반드시 완료해 주세요.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-app-bg rounded-2xl border border-pastel-purple/30 group hover:border-primary-purple transition-all">
                    <span className="w-6 h-6 rounded-full bg-white border border-pastel-purple flex items-center justify-center text-xs font-black text-primary-purple shrink-0 shadow-sm">4</span>
                    <p className="text-sm text-text-main font-bold leading-snug">
                      협의 완료 체크 후 <span className="bg-primary-purple text-white px-2 py-0.5 rounded-lg shadow-sm">변경 요청 전송</span> 버튼을 클릭하세요.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-[11px] text-text-muted font-bold bg-pastel-purple/20 p-3 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>관리자 최종 승인 후 일정이 실시간으로 업데이트됩니다.</span>
                </div>
              </div>

              {/* Change Flow Stepper */}
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-pastel-purple shadow-sm">
                <div className="flex items-center justify-between max-w-md mx-auto relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-pastel-purple -z-0"></div>
                  
                  <div className={`flex flex-col items-center gap-3 z-10 bg-white px-2 ${changeStep === 'select_ours' ? 'text-primary-purple' : 'text-text-muted'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${changeStep === 'select_ours' ? 'border-primary-purple bg-primary-purple text-white font-black scale-110' : 'border-pastel-purple bg-white'}`}>1</div>
                    <span className="text-[11px] font-black uppercase tracking-tighter">우리팀 선택</span>
                  </div>
                  
                  <div className={`flex flex-col items-center gap-3 z-10 bg-white px-2 ${changeStep === 'select_theirs' ? 'text-primary-purple' : 'text-text-muted'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${changeStep === 'select_theirs' ? 'border-primary-purple bg-primary-purple text-white font-black scale-110' : 'border-pastel-purple bg-white'}`}>2</div>
                    <span className="text-[11px] font-black uppercase tracking-tighter">상대팀 검색</span>
                  </div>
                  
                  <div className={`flex flex-col items-center gap-3 z-10 bg-white px-2 ${changeStep === 'confirm' ? 'text-primary-purple' : 'text-text-muted'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${changeStep === 'confirm' ? 'border-primary-purple bg-primary-purple text-white font-black scale-110' : 'border-pastel-purple bg-white'}`}>3</div>
                    <span className="text-[11px] font-black uppercase tracking-tighter">요청 전송</span>
                  </div>
                </div>
              </div>

              {changeStep === 'select_ours' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-pastel-purple overflow-hidden">
                  <div className="p-6 md:p-8 bg-app-bg border-b border-pastel-purple space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-text-main text-lg">변경을 원하는 우리 팀을 선택하세요</h3>
                      <span className="text-xs font-bold text-primary-purple bg-pastel-purple px-3 py-1 rounded-full">전체 {schedules.length}개 팀</span>
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-purple transition-colors" />
                      <input 
                        type="text"
                        placeholder="우리 팀 이름을 적어주세요."
                        value={step1Search}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setStep1Search(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border-2 border-pastel-purple rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary-purple/10 focus:border-primary-purple outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="divide-y divide-pastel-purple/30 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {schedules
                      .filter(item => item.teamName.includes(step1Search))
                      .map(item => {
                        const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`p-6 flex items-center justify-between group transition-all ${isPending ? 'bg-app-bg opacity-50 cursor-not-allowed' : 'hover:bg-pastel-purple/30 cursor-pointer'}`}
                            onClick={() => !isPending && selectOurTeam(item)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-text-main text-base">{item.teamName}</p>
                                {isPending && (
                                  <span className="text-[10px] bg-pastel-orange text-primary-purple px-2 py-0.5 rounded-full font-bold shadow-sm">차수변경요청중</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-text-muted">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                                <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> {item.keyword}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {item.location}</span>
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item.count}명</span>
                              </div>
                            </div>
                            {!isPending && <ChevronRight className="w-6 h-6 text-pastel-purple group-hover:text-primary-purple group-hover:translate-x-1 transition-all" />}
                          </div>
                        );
                      })}
                    {schedules.filter(item => item.teamName.includes(step1Search)).length === 0 && (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto">
                          <Search className="w-8 h-8 text-pastel-purple" />
                        </div>
                        <p className="text-text-muted font-bold">검색 결과가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {changeStep === 'select_theirs' && ourTeam && (
                <div className="space-y-6">
                  <div className="bg-primary-purple text-white p-6 md:p-8 rounded-[32px] shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">선택된 우리 팀</p>
                      <p className="font-black text-xl md:text-2xl">{ourTeam.teamName}</p>
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1 text-xs font-bold opacity-90">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {ourTeam.date}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {ourTeam.location}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {ourTeam.count}명</span>
                      </div>
                    </div>
                    <button onClick={() => setChangeStep('select_ours')} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95">우리팀 다시 선택</button>
                  </div>

                  <div className="bg-white rounded-[32px] shadow-sm border border-pastel-purple overflow-hidden">
                    <div className="p-6 md:p-8 bg-app-bg border-b border-pastel-purple space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <h3 className="font-black text-text-main text-lg">교환 가능한 상대 팀 리스트</h3>
                        <p className="text-[11px] font-bold text-primary-purple bg-pastel-purple px-3 py-1 rounded-full">조건: 인원 ±3명 & 동일 키워드 & 동일 장소 & 다른 날짜</p>
                      </div>
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-purple transition-colors" />
                        <input 
                          type="text"
                          placeholder="상대 팀 이름을 적어주세요."
                          value={step2Search}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setStep2Search(e.target.value)}
                          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-pastel-purple rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary-purple/10 focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-pastel-purple/30 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {schedules
                        .filter(item => item.id !== ourTeam.id && item.teamName.includes(step2Search))
                        .sort((a, b) => {
                          const aComp = Math.abs(ourTeam.count - a.count) <= 3 && 
                                       (ourTeam.keyword.split('_').pop() === a.keyword.split('_').pop()) &&
                                       (ourTeam.location === a.location) &&
                                       (ourTeam.date !== a.date);
                          const bComp = Math.abs(ourTeam.count - b.count) <= 3 && 
                                       (ourTeam.keyword.split('_').pop() === b.keyword.split('_').pop()) &&
                                       (ourTeam.location === b.location) &&
                                       (ourTeam.date !== b.date);
                          if (aComp && !bComp) return -1;
                          if (!aComp && bComp) return 1;
                          return 0;
                        })
                        .map(item => {
                          const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                          const isCompatible = !isPending && Math.abs(ourTeam.count - item.count) <= 3 && 
                                              (ourTeam.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
                                              (ourTeam.location === item.location) &&
                                              (ourTeam.date !== item.date);
                          const reason = isPending ? "이미 차수 변경 요청이 진행 중인 팀입니다." : getCompatibilityReason(item);

                          return (
                            <div 
                              key={item.id} 
                              className={`p-6 flex items-center justify-between transition-all ${isCompatible ? 'hover:bg-pastel-green/20 cursor-pointer' : 'bg-app-bg/50'}`}
                              onClick={() => isCompatible && selectTargetTeam(item)}
                            >
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-text-main text-base">{item.teamName}</p>
                                  {isPending ? (
                                    <span className="text-[10px] bg-pastel-orange text-primary-purple px-2 py-0.5 rounded-full font-bold shadow-sm">차수변경요청중</span>
                                  ) : isCompatible ? (
                                    <div className="flex items-center gap-1 bg-pastel-green text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                                      <RefreshCw className="w-2.5 h-2.5" />
                                      변경 가능
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] bg-pastel-purple text-text-muted px-2 py-0.5 rounded-full font-bold">변경 불가</span>
                                      <a 
                                        href={getManagerContactSms(item)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[9px] bg-pastel-pink text-primary-purple px-2 py-0.5 rounded-full font-black shadow-sm flex items-center gap-1"
                                      >
                                        <MessageCircle className="w-2.5 h-2.5" /> 담당자문의
                                      </a>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-text-muted">
                                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                                  <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> {item.keyword}</span>
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {item.location}</span>
                                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item.count}명</span>
                                </div>
                                {!isCompatible && <p className="text-[10px] text-red-400 mt-1 font-bold italic">사유: {reason}</p>}
                              </div>
                              {isCompatible && <ChevronRight className="w-6 h-6 text-green-500 group-hover:translate-x-1 transition-all" />}
                            </div>
                          );
                        })}
                      {schedules.filter(item => item.id !== ourTeam.id && item.teamName.includes(step2Search)).length === 0 && (
                        <div className="py-20 text-center space-y-4">
                          <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto">
                            <Search className="w-8 h-8 text-pastel-purple" />
                          </div>
                          <p className="text-text-muted font-bold">검색 결과가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {changeStep === 'confirm' && ourTeam && targetTeam && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[40px] shadow-2xl border-2 border-pastel-purple p-6 md:p-12 space-y-10 text-center"
                >
                  <div className="w-20 h-20 bg-pastel-orange rounded-[32px] flex items-center justify-center mx-auto shadow-lg shadow-pastel-orange/20">
                    <AlertCircle className="w-10 h-10 text-primary-purple" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl md:text-3xl font-black text-text-main tracking-tight">관리자에게 변경 요청을 보내시겠습니까?</h3>
                    <p className="text-sm md:text-base text-text-muted font-bold">요청이 승인되면 일정이 최종적으로 교체됩니다.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="bg-app-bg p-6 md:p-8 rounded-[32px] border border-pastel-purple text-left space-y-4 shadow-inner">
                      <span className="inline-block text-[10px] font-black text-text-muted uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-pastel-purple/30">현재 (우리팀)</span>
                      <div>
                        <p className="font-black text-xl text-text-main">{ourTeam.teamName}</p>
                        <div className="mt-4 space-y-2 text-sm font-bold text-text-muted">
                          <p className="flex items-center gap-2.5"><Calendar className="w-4 h-4 text-primary-purple" /> {ourTeam.date}</p>
                          <p className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-primary-purple" /> {ourTeam.location}</p>
                          <p className="flex items-center gap-2.5"><Key className="w-4 h-4 text-primary-purple" /> {ourTeam.keyword}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-2xl border-2 border-pastel-purple items-center justify-center z-10 shadow-xl">
                      <RefreshCw className="w-7 h-7 text-primary-purple animate-spin-slow" />
                    </div>

                    <div className="bg-pastel-blue/30 p-6 md:p-8 rounded-[32px] border border-pastel-blue/50 text-left space-y-4 shadow-inner">
                      <span className="inline-block text-[10px] font-black text-primary-purple uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-pastel-blue/30">변경 희망 (상대팀)</span>
                      <div>
                        <p className="font-black text-xl text-text-main">{targetTeam.teamName}</p>
                        <div className="mt-4 space-y-2 text-sm font-bold text-primary-purple">
                          <p className="flex items-center gap-2.5"><Calendar className="w-4 h-4" /> {targetTeam.date}</p>
                          <p className="flex items-center gap-2.5"><MapPin className="w-4 h-4" /> {targetTeam.location}</p>
                          <p className="flex items-center gap-2.5"><Key className="w-4 h-4" /> {targetTeam.keyword}</p>
                        </div>
                      </div>
                      <div className="mt-6 p-4 bg-white/80 rounded-2xl border border-pastel-blue/30 shadow-sm">
                        <p className="text-[10px] font-black text-primary-purple mb-2 uppercase tracking-widest">상대 팀장 연락처</p>
                        <a 
                          href={`sms:${targetTeam.phone}`}
                          className="flex items-center gap-3 hover:text-primary-purple transition-colors"
                        >
                          <div className="w-10 h-10 shrink-0 rounded-full bg-primary-purple flex items-center justify-center text-white shadow-md">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-text-main">{targetTeam.leaderName} 팀장</span>
                            <span className="text-base font-black text-primary-purple tracking-tight">{targetTeam.phone}</span>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pastel-purple/30 p-6 md:p-8 rounded-[32px] border border-pastel-purple/50 space-y-6 shadow-inner">
                    <div className="text-sm md:text-base font-bold text-primary-purple leading-relaxed space-y-3">
                      <p>함께 성장하는 컨설팅 문화를 위해 <span className="underline decoration-2 underline-offset-4">상대 팀의 상황을 먼저 배려</span>해 주셔서 감사합니다.</p>
                      <p>원활한 일정 조정을 위해 상대 팀장님과 <span className="bg-white px-2 py-0.5 rounded border border-pastel-purple/30">사전에 변경 가능 논의</span>를 거치신 후 신청해 주세요.</p>
                    </div>
                    <label className="flex items-center justify-center gap-4 cursor-pointer group bg-white p-5 rounded-2xl border-2 border-pastel-purple/50 shadow-sm hover:border-primary-purple transition-all">
                      <input 
                        type="checkbox" 
                        checked={isAgreed}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setIsAgreed(e.target.checked)}
                        className="w-6 h-6 rounded-lg border-pastel-purple text-primary-purple focus:ring-primary-purple cursor-pointer transition-all"
                      />
                      <span className="text-base font-black text-text-main group-hover:text-primary-purple transition-colors">
                        상대팀과의 변경협의가 완료되었습니까?
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-6">
                    <button 
                      onClick={() => setChangeStep('select_theirs')}
                      className="flex-1 py-5 rounded-2xl font-black text-text-muted bg-app-bg hover:bg-pastel-purple transition-all active:scale-95"
                    >
                      이전 단계로
                    </button>
                    <button 
                      onClick={submitChangeRequest}
                      disabled={!isAgreed}
                      className={`flex-1 py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${isAgreed ? 'bg-primary-purple hover:bg-primary-purple/90 shadow-primary-purple/20' : 'bg-pastel-purple text-text-muted cursor-not-allowed shadow-none'}`}
                    >
                      변경 요청 전송하기
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : filterValue === 'requests' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-text-main">차수 변경 요청 내역</h3>
                <span className="text-xs text-text-muted">총 {changeRequests.length}건</span>
              </div>
              <div className="bg-white rounded-xl border border-pastel-purple overflow-hidden shadow-sm">
                <div className="divide-y divide-pastel-purple/30">
                  {changeRequests.map(req => (
                    <div key={req.id} className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-muted uppercase">{req.timestamp}</span>
                        <div className="flex items-center gap-2">
                          {isAdmin && req.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectRequest(req.id);
                                }}
                                className="px-4 py-2 bg-app-bg text-text-muted text-xs font-bold rounded-lg hover:bg-pastel-pink hover:text-primary-purple transition-colors touch-manipulation min-h-[36px]"
                              >
                                반려
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveRequest(req.id);
                                }}
                                className="px-4 py-2 bg-primary-purple text-white text-xs font-bold rounded-lg hover:bg-primary-purple/90 transition-colors shadow-sm touch-manipulation min-h-[36px]"
                              >
                                승인
                              </button>
                            </div>
                          )}
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${req.status === 'pending' ? 'bg-pastel-orange text-primary-purple' : req.status === 'approved' ? 'bg-pastel-green text-green-600' : 'bg-app-bg text-text-muted'}`}>
                            {req.status === 'pending' ? '승인 대기중' : req.status === 'approved' ? '승인 완료' : '반려됨'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-app-bg p-3 rounded-lg border border-pastel-purple/30">
                          <p className="text-[10px] font-bold text-text-muted mb-1">우리 팀</p>
                          <p className="text-sm font-bold text-text-main">{req.our.teamName}</p>
                          <p className="text-[10px] text-text-muted">{req.our.date} | {req.our.keyword} | {req.our.location}</p>
                        </div>
                        <RefreshCw className="w-4 h-4 text-text-muted" />
                        <div className="flex-1 bg-pastel-blue p-3 rounded-lg border border-pastel-blue/30">
                          <p className="text-[10px] font-bold text-primary-purple mb-1">상대 팀</p>
                          <p className="text-sm font-bold text-text-main">{req.target.teamName}</p>
                          <p className="text-[10px] text-text-muted">{req.target.date} | {req.target.keyword} | {req.target.location}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {changeRequests.length === 0 && (
                    <div className="p-20 text-center text-text-muted">
                      <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      요청된 내역이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Table Header Info */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary-purple rounded-full animate-pulse"></span>
                  <p className="text-sm font-bold text-text-main">
                    {filterType === 'all' ? '전체 일정' : 
                     filterType === 'month' ? `${filterValue}월 일정` :
                     filterType === 'location' ? `${filterValue} 일정` :
                     `${filterValue} 키워드 일정`}
                  </p>
                </div>
                <p className="text-xs text-text-muted">총 {filteredData.length}건</p>
              </div>

              {/* Schedule Table - Dashboard Style */}
              <div className="bg-white rounded-2xl shadow-sm border border-pastel-purple overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-app-bg border-b border-pastel-purple text-text-muted font-bold">
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-pastel-purple transition-colors"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-1">
                            날짜
                            {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-pastel-purple transition-colors"
                          onClick={() => handleSort('teamName')}
                        >
                          <div className="flex items-center gap-1">
                            팀명
                            {sortConfig.key === 'teamName' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-pastel-purple transition-colors"
                          onClick={() => handleSort('keyword')}
                        >
                          <div className="flex items-center gap-1">
                            키워드
                            {sortConfig.key === 'keyword' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-pastel-purple transition-colors"
                          onClick={() => handleSort('location')}
                        >
                          <div className="flex items-center gap-1">
                            장소
                            {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-pastel-purple transition-colors"
                          onClick={() => handleSort('count')}
                        >
                          <div className="flex items-center gap-1">
                            인원
                            {sortConfig.key === 'count' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-4 py-3">운영담당자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pastel-purple/10">
                      {filteredData.map((item, idx) => {
                        const matches = searchQuery ? schedules.filter(s => s.teamName.includes(searchQuery.trim())) : [];
                        const searchedTeamObj = matches.length === 1 ? matches[0] : null;
                        const isSearchedTeam = searchedTeamObj && item.id === searchedTeamObj.id;
                        
                        const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                        
                        const isCompatibleWithSearched = !isPending && searchedTeamObj && item.id !== searchedTeamObj.id &&
                                                        Math.abs(searchedTeamObj.count - item.count) <= 3 && 
                                                        (searchedTeamObj.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
                                                        (searchedTeamObj.location === item.location) &&
                                                        (searchedTeamObj.date !== item.date);

                        const isSameKeyword = !isCompatibleWithSearched && searchedTeamObj && item.id !== searchedTeamObj.id &&
                                             (searchedTeamObj.keyword.split('_').pop() === item.keyword.split('_').pop());

                        return (
                          <React.Fragment key={item.id}>
                            {searchedTeamObj && idx === 0 && (
                              <tr className="bg-primary-purple/5">
                                <td colSpan={6} className="px-4 py-2 text-[10px] font-black text-primary-purple uppercase tracking-widest">검색된 우리 팀</td>
                              </tr>
                            )}
                            {searchedTeamObj && idx === 1 && isCompatibleWithSearched && (
                              <tr className="bg-pastel-green/10">
                                <td colSpan={6} className="px-4 py-2 text-[10px] font-black text-green-700 uppercase tracking-widest">교체 가능 팀 (조건 일치)</td>
                              </tr>
                            )}
                            {searchedTeamObj && idx > 0 && !isCompatibleWithSearched && isSameKeyword && !filteredData[idx-1].keyword.includes(searchedTeamObj!.keyword.split('_').pop()!) && (
                              <tr className="bg-pastel-blue/10">
                                <td colSpan={6} className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest">같은 키워드 팀 (조건 확인 필요)</td>
                              </tr>
                            )}
                            <tr 
                              className={`transition-colors cursor-pointer group ${isSearchedTeam ? 'bg-primary-purple text-white shadow-inner' : 'hover:bg-app-bg'} ${isPending ? 'opacity-60' : ''}`}
                              onClick={() => setSelectedTeam(item)}
                            >
                    <td className="px-4 py-3 font-medium">{item.date}</td>
                    <td className={`px-4 py-3 font-bold flex items-center gap-2 ${isSearchedTeam ? 'text-white' : 'text-text-main'}`}>
                      {item.teamName}
                      {isPending && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-pastel-orange text-primary-purple text-[9px] rounded-full font-bold shadow-sm">
                          차수변경요청중
                        </span>
                      )}
                      {isCompatibleWithSearched && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            quickChange(searchedTeamObj, item);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 bg-pastel-green text-green-700 text-[9px] rounded-full hover:bg-green-100 transition-colors shadow-sm"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          차수변경신청
                        </button>
                      )}
                      {isSearchedTeam && (
                        <div className="flex items-center gap-1">
                          <a 
                            href={getManagerContactSms(item)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-0.5 bg-pastel-pink text-primary-purple text-[9px] rounded-full hover:bg-red-100 transition-colors shadow-sm"
                          >
                            <MessageCircle className="w-2.5 h-2.5" />
                            담당자문의
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${isSearchedTeam ? 'bg-white/20 text-white border-white/30' : getKeywordStyle(item.keyword)}`}>
                        {item.keyword}
                      </span>
                    </td>
                    <td className="px-4 py-3 opacity-80">
                      <a 
                        href={`https://map.naver.com/v5/search/${encodeURIComponent(getMapSearchTerm(item.location))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-primary-purple transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.location}
                      </a>
                    </td>
                    <td className="px-4 py-3 opacity-80">{item.count}명</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const manager = getManagerForKeyword(item.keyword);
                        return manager ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setToast({ message: `${manager.name}: ${manager.phone}`, type: 'success' });
                            }}
                            className="text-[11px] font-bold text-primary-purple hover:underline flex items-center gap-1"
                          >
                            <Users className="w-3 h-3" />
                            {manager.name.split(' ')[0]}
                          </button>
                        ) : '-';
                      })()}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-20 text-center text-text-muted">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            해당하는 일정이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-pastel-purple/10">
                  {filteredData.map((item, idx) => {
                    const matches = searchQuery ? schedules.filter(s => s.teamName.includes(searchQuery.trim())) : [];
                    const searchedTeamObj = matches.length === 1 ? matches[0] : null;
                    const isSearchedTeam = searchedTeamObj && item.id === searchedTeamObj.id;
                    
                    const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                    
                    const isCompatible = !isPending && searchedTeamObj && item.id !== searchedTeamObj.id &&
                                        Math.abs(searchedTeamObj.count - item.count) <= 3 && 
                                        (searchedTeamObj.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
                                        (searchedTeamObj.location === item.location) &&
                                        (searchedTeamObj.date !== item.date);

                    const isSameKeyword = !isCompatible && searchedTeamObj && item.id !== searchedTeamObj.id &&
                                         (searchedTeamObj.keyword.split('_').pop() === item.keyword.split('_').pop());

                    return (
                      <React.Fragment key={item.id}>
                        {searchedTeamObj && idx === 0 && (
                          <div className="px-5 py-2 bg-primary-purple/5 text-[10px] font-black text-primary-purple uppercase tracking-widest border-b border-pastel-purple/20">검색된 우리 팀</div>
                        )}
                        {searchedTeamObj && idx === 1 && isCompatible && (
                          <div className="px-5 py-2 bg-pastel-green/10 text-[10px] font-black text-green-700 uppercase tracking-widest border-b border-pastel-purple/20">교체 가능 팀 (조건 일치)</div>
                        )}
                        {searchedTeamObj && idx > 0 && !isCompatible && isSameKeyword && !filteredData[idx-1].keyword.includes(searchedTeamObj!.keyword.split('_').pop()!) && (
                          <div className="px-5 py-2 bg-pastel-blue/10 text-[10px] font-black text-blue-700 uppercase tracking-widest border-b border-pastel-purple/20">같은 키워드 팀 (조건 확인 필요)</div>
                        )}
                        <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedTeam(item)}
                        className={`p-5 space-y-4 active:bg-app-bg transition-all ${isSearchedTeam ? 'bg-primary-purple/5 border-l-4 border-primary-purple' : isCompatible ? 'bg-pastel-green/10 border-l-4 border-green-500' : ''} ${isPending ? 'opacity-60' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-text-main text-base leading-tight">{item.teamName}</span>
                              {isSearchedTeam && <span className="text-[9px] bg-primary-purple text-white px-2 py-0.5 rounded-full font-black shadow-sm">검색됨</span>}
                              {isSearchedTeam && (
                                <div className="flex items-center gap-1">
                                  <a 
                                    href={getManagerContactSms(item)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[9px] bg-pastel-pink text-primary-purple px-2 py-0.5 rounded-full font-black shadow-sm flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" /> 담당자문의
                                  </a>
                                </div>
                              )}
                              {isCompatible && <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black shadow-sm">교환가능</span>}
                              {isPending && (
                                <span className="text-[9px] bg-pastel-orange text-primary-purple px-2 py-0.5 rounded-full font-black shadow-sm">
                                  차수변경요청중
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-text-muted">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> 
                                <a 
                                  href={`https://map.naver.com/v5/search/${encodeURIComponent(getMapSearchTerm(item.location))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline decoration-pastel-purple decoration-1 underline-offset-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {item.location}
                                </a>
                              </span>
                              <span>•</span>
                              {(() => {
                                const manager = getManagerForKeyword(item.keyword);
                                return manager ? (
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setToast({ message: `${manager.name}: ${manager.phone}`, type: 'success' });
                                    }}
                                    className="flex items-center gap-1 text-primary-purple"
                                  >
                                    <Users className="w-3 h-3" /> {manager.name.split(' ')[0]}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] shadow-sm shrink-0 ${
                            (item.keyword.startsWith('우수_') || item.keyword.includes('우수조직')) ? 'bg-pastel-green text-green-700 border-green-200 shadow-sm' :
                            item.keyword.includes('회복') ? 'bg-pastel-pink text-red-600' : 
                            item.keyword.includes('혁신') ? 'bg-pastel-orange text-orange-600' :
                            item.keyword.includes('신뢰') ? 'bg-pastel-blue text-blue-600' :
                            item.keyword.includes('리더') ? 'bg-pastel-purple text-primary-purple' : 'bg-pastel-green text-green-600'
                          }`}>
                            {(item.keyword.startsWith('우수_') || item.keyword.includes('우수조직')) ? `우수_${item.keyword.split('_').pop()}` : item.keyword.split('_').pop()}
                          </span>
                        </div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <div className="flex items-center gap-2 text-text-muted">
                              <div className="w-6 h-6 rounded-full bg-app-bg flex items-center justify-center">
                                <Users className="w-3 h-3" />
                              </div>
                              <span>{item.count}명 참여</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCompatible && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    quickChange(searchedTeamObj, item);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-pastel-green text-green-700 text-[10px] rounded-lg hover:bg-green-100 transition-colors shadow-sm font-black"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  차수변경신청
                                </button>
                              )}
                              <div className="flex items-center gap-1 text-primary-purple font-black">
                                상세보기 <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
                  {filteredData.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-8 h-8 text-pastel-purple" />
                      </div>
                      <p className="text-text-muted font-bold">해당하는 일정이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-text-main/40 backdrop-blur-sm"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 text-center space-y-6 border border-pastel-purple"
            >
              <div className="w-16 h-16 bg-pastel-pink rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-primary-purple" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-main">전체 삭제</h3>
                <p className="text-sm text-text-muted">정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-text-muted bg-app-bg hover:bg-pastel-purple transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleClearAll}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-primary-purple hover:bg-primary-purple/90 transition-colors shadow-lg shadow-pastel-purple"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Detail Popup */}
      <AnimatePresence>
        {selectedTeam && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-text-main/40 backdrop-blur-sm"
              onClick={() => {
                if (!isEditing) setSelectedTeam(null);
              }}
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-sm md:rounded-3xl rounded-t-[40px] shadow-2xl overflow-hidden border-t md:border border-pastel-purple max-h-[90vh] flex flex-col"
            >
              {/* Mobile Drag Handle */}
              <div className="md:hidden w-12 h-1.5 bg-white/30 rounded-full mx-auto mt-4 absolute top-0 left-1/2 -translate-x-1/2 z-10" />
              
              <div className="bg-primary-purple p-6 md:p-8 text-white relative shrink-0">
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  {isAdmin && !isEditing && (
                    <>
                      <button 
                        onClick={() => {
                          setIsEditing(true);
                          setEditForm(selectedTeam);
                        }}
                        className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all text-xs font-black"
                        title="수정"
                      >
                        수정
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(selectedTeam.id)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-pastel-pink/20 transition-all text-pastel-pink"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedTeam(null);
                      setIsEditing(false);
                      setEditForm(null);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4 mt-2 md:mt-0">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {isEditing ? 'EDIT TEAM INFO' : 'TEAM DETAILS'}
                    </span>
                    {isEditing && editForm ? (
                      <input 
                        type="text"
                        value={editForm.teamName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, teamName: e.target.value})}
                        className="text-xl font-black leading-tight bg-white/10 border-2 border-white/30 rounded-xl px-3 py-1.5 w-full outline-none focus:bg-white/20 focus:border-white/50 transition-all"
                      />
                    ) : (
                      <h3 className="text-2xl font-black leading-tight tracking-tight">{selectedTeam.teamName}</h3>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar pb-12 md:pb-8">
                {isEditing && editForm ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">날짜</label>
                        <input 
                          type="text" 
                          value={editForm.date}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, date: e.target.value})}
                          className="w-full p-3 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">장소</label>
                        <input 
                          type="text" 
                          value={editForm.location}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, location: e.target.value})}
                          className="w-full p-3 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">팀장명</label>
                        <input 
                          type="text" 
                          value={editForm.leaderName}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, leaderName: e.target.value})}
                          className="w-full p-3 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">연락처</label>
                        <input 
                          type="text" 
                          value={editForm.phone}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full p-3 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">키워드</label>
                        <input 
                          type="text" 
                          value={editForm.keyword}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, keyword: e.target.value})}
                          className="w-full p-3 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">인원</label>
                        <input 
                          type="number" 
                          value={editForm.count}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, count: parseInt(e.target.value) || 0})}
                          className="w-full p-3 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">관리자 메모 (비공개)</label>
                      <textarea 
                        value={editForm.memo || ''}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditForm({...editForm, memo: e.target.value})}
                        placeholder="팀별 특이사항이나 운영 시 주의사항을 기록하세요."
                        className="w-full p-4 bg-app-bg border-2 border-pastel-purple rounded-2xl text-sm font-bold h-24 resize-none focus:border-primary-purple outline-none transition-all"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => {
                          const isNew = !schedules.some(s => s.id === selectedTeam?.id);
                          if (isNew) {
                            setSelectedTeam(null);
                          }
                          setIsEditing(false);
                          setEditForm(null);
                        }}
                        className="flex-1 py-4 rounded-2xl font-black text-text-muted bg-app-bg hover:bg-pastel-purple transition-all active:scale-95"
                      >
                        취소
                      </button>
                      <button 
                        onClick={handleEditSave}
                        className="flex-1 py-4 rounded-2xl font-black text-white bg-primary-purple hover:bg-primary-purple/90 transition-all shadow-xl shadow-primary-purple/20 active:scale-95"
                      >
                        저장하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                      <div className="space-y-1.5 flex-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">팀장</p>
                        <p className="font-black text-text-main text-xl">{selectedTeam.leaderName}</p>
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">연락처</p>
                        <a 
                          href={`sms:${selectedTeam.phone}`}
                          className="flex items-center gap-3 font-black text-primary-purple hover:text-primary-purple/80 transition-all text-xl"
                        >
                          <div className="w-10 h-10 rounded-full bg-pastel-purple flex items-center justify-center shadow-sm">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <span className="tracking-tight">{selectedTeam.phone}</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                      <div className="space-y-1.5 flex-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">운영 담당자</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-pastel-purple/30 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-primary-purple" />
                          </div>
                          <div>
                            {(() => {
                              const manager = getManagerForKeyword(selectedTeam.keyword);
                              return manager ? (
                                <>
                                  <p className="font-bold text-text-main">{manager.name}</p>
                                  <p className="text-xs text-text-muted">{manager.phone}</p>
                                </>
                              ) : (
                                <p className="font-bold text-text-main">운영팀 문의</p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-pastel-purple/30"></div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-app-bg rounded-2xl border border-pastel-purple/30">
                        <span className="text-text-muted font-bold flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Calendar className="w-4 h-4 text-primary-purple" />
                          </div>
                          일정
                        </span>
                        <span className="font-black text-text-main">{selectedTeam.date}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-app-bg rounded-2xl border border-pastel-purple/30">
                        <span className="text-text-muted font-bold flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <MapPin className="w-4 h-4 text-primary-purple" />
                          </div>
                          장소
                        </span>
                        <a 
                          href={`https://map.naver.com/v5/search/${encodeURIComponent(getMapSearchTerm(selectedTeam.location))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black text-primary-purple hover:underline flex items-center gap-1"
                        >
                          {selectedTeam.location}
                          <ChevronRight className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-app-bg rounded-2xl border border-pastel-purple/30">
                        <span className="text-text-muted font-bold flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Key className="w-4 h-4 text-primary-purple" />
                          </div>
                          키워드
                        </span>
                        <span className="font-black text-primary-purple">{selectedTeam.keyword}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-app-bg rounded-2xl border border-pastel-purple/30">
                        <span className="text-text-muted font-bold flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Users className="w-4 h-4 text-primary-purple" />
                          </div>
                          인원
                        </span>
                        <span className="font-black text-text-main">{selectedTeam.count}명</span>
                      </div>
                    </div>

                    {isAdmin && selectedTeam.memo && (
                      <div className="bg-pastel-orange/10 p-5 rounded-2xl border border-pastel-orange/30 space-y-2">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">관리자 메모</p>
                        <p className="text-sm font-bold text-text-main leading-relaxed">{selectedTeam.memo}</p>
                      </div>
                    )}

                    <a 
                      href={`sms:${selectedTeam.phone}`}
                      className="flex items-center justify-center gap-2 w-full py-4 bg-primary-purple hover:bg-primary-purple/90 text-white rounded-2xl font-bold shadow-lg shadow-pastel-purple transition-all active:scale-95"
                    >
                      <MessageCircle className="w-5 h-5" />
                      팀장에게 문자보내기
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-text-main/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-6 rounded-3xl shadow-2xl w-full max-w-xs text-center space-y-4"
            >
              <div className="w-16 h-16 bg-pastel-pink rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-primary-purple" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">팀 삭제</h3>
                <p className="text-sm text-text-muted mt-1">정말로 이 팀을 삭제하시겠습니까?<br/>삭제된 데이터는 복구할 수 없습니다.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-text-muted bg-app-bg hover:bg-pastel-purple transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={() => deleteConfirmId !== null && deleteTeam(deleteConfirmId)}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-primary-purple hover:bg-primary-purple/90 transition-colors"
                >
                  삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Footer Navigation (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pastel-purple px-6 py-3 flex justify-around items-center z-30 md:hidden">
        <button 
          onClick={() => {
            handleReset(); 
            setActiveTab('progress');
            setTimeout(() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'progress' && searchQuery ? 'text-primary-purple' : 'text-text-muted'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">우리팀 검색</span>
        </button>
        <button onClick={startChangeFlow} className={`flex flex-col items-center gap-1 ${activeTab === 'change' ? 'text-primary-purple' : 'text-text-muted'}`}>
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px] font-bold">차수변경</span>
        </button>
        <button onClick={() => setActiveTab('managers')} className={`flex flex-col items-center gap-1 ${activeTab === 'managers' ? 'text-primary-purple' : 'text-text-muted'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">담당자</span>
        </button>
      </nav>
    </div>
  );
}
