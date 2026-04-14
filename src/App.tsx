import { useState, useMemo, useRef, ChangeEvent, useEffect } from 'react';
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
  LogIn
} from 'lucide-react';
import { scheduleData, Schedule } from './data';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';
import { signOut } from 'firebase/auth';

import { Toast } from './components/Toast';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { IntroSection } from './components/IntroSection';

type FilterType = 'all' | 'month' | 'location' | 'keyword' | 'change';
type TabType = 'progress' | 'change' | 'calendar' | 'requests';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [changeRequests, setChangeRequests] = useState<{ id: number, our: Schedule, target: Schedule, status: 'pending' | 'approved' | 'rejected', timestamp: string }[]>([]);
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
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Schedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        // Check if admin
        setIsAdmin(currentUser.email === "idght351@gmail.com");
      } else {
        setIsAdmin(false);
      }
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
      if (data.length === 0 && isAdmin) {
        // Bootstrap initial data if empty and admin
        scheduleData.forEach(async (s) => {
          await setDoc(doc(db, 'schedules', s.id.toString()), s);
        });
      } else {
        setSchedules(data);
      }
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

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setToast({ message: '로그인에 실패했습니다.', type: 'error' });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setToast({ message: '로그아웃 되었습니다.', type: 'success' });
    } catch (error) {
      setToast({ message: '로그아웃에 실패했습니다.', type: 'error' });
    }
  };

  const upcomingSchedules = useMemo(() => {
    const today = new Date(2026, 3, 13);
    const nextWeek = new Date(2026, 3, 20);
    return schedules.filter(s => {
      const match = s.date.match(/(\d+)\/(\d+)/);
      if (!match) return false;
      const d = new Date(2026, parseInt(match[1]) - 1, parseInt(match[2]));
      return d >= today && d <= nextWeek;
    });
  }, [schedules]);

  const keywordStats = useMemo(() => {
    const stats: Record<string, { total: number, upcoming: number }> = {};
    
    schedules.forEach(s => {
      const kw = s.keyword.split('_').pop() || s.keyword;
      if (!stats[kw]) stats[kw] = { total: 0, upcoming: 0 };
      stats[kw].total++;
    });

    upcomingSchedules.forEach(s => {
      const kw = s.keyword.split('_').pop() || s.keyword;
      if (stats[kw]) {
        stats[kw].upcoming++;
      }
    });

    return Object.entries(stats)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].upcoming - a[1].upcoming || b[1].total - a[1].total);
  }, [schedules, upcomingSchedules]);

  const requestStats = useMemo(() => {
    const pendingRequests = changeRequests.filter(r => r.status === 'pending');
    const total = changeRequests.length;
    const pending = pendingRequests.length;
    
    const pendingDetails = pendingRequests.map(req => {
      return {
        id: req.id,
        ourName: req.our.teamName,
        ourDate: req.our.date,
        ourKeyword: req.our.keyword,
        targetName: req.target.teamName,
        targetDate: req.target.date,
        targetKeyword: req.target.keyword
      };
    }).slice(0, 3); // Show top 3

    return { total, pending, pendingDetails };
  }, [changeRequests]);

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

  const getSmsLink = (req: { our: Schedule, target: Schedule, status: string }) => {
    const isApproved = req.status === 'approved';
    const statusText = isApproved ? '승인' : '반려';
    
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
오늘도 기분 좋은 하루 보내세요!`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? ',' : ';';
    const phones = `${req.our.phone}${separator}${req.target.phone}`;
    const bodyPrefix = isIOS ? '&' : '?';
    
    return `sms:${phones}${bodyPrefix}body=${encodeURIComponent(message)}`;
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
      searchedTeamObj = schedules.find(item => item.teamName.includes(searchQuery.trim())) || null;
      if (searchedTeamObj) {
        const baseKeyword = searchedTeamObj.keyword.split('_').pop() || searchedTeamObj.keyword;
        const group = schedules.filter(item => item.keyword.includes(baseKeyword));
        // Put searched team at the top
        data = [searchedTeamObj, ...group.filter(item => item.id !== searchedTeamObj!.id)];
      } else {
        data = [];
      }
    } else {
      if (filterType === 'month') {
        data = schedules.filter(item => item.date.startsWith(filterValue));
      } else if (filterType === 'location') {
        data = schedules.filter(item => item.location.includes(filterValue));
      } else if (filterType === 'keyword') {
        if (filterValue === '우수팀') {
          data = schedules.filter(item => item.keyword.includes('우수팀'));
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
      if (item.keyword.includes('우수팀')) return '우수팀';
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
    const base = keyword.split('_').pop() || keyword;
    const colors: Record<string, string> = {
      '회복탄력성': 'bg-pastel-pink text-primary-purple border-pastel-pink/50',
      '혁신행동': 'bg-pastel-orange text-primary-purple border-pastel-orange/50',
      '팀 신뢰': 'bg-pastel-blue text-primary-purple border-pastel-blue/50',
      '리더십': 'bg-pastel-purple text-primary-purple border-pastel-purple/50',
      '자부심': 'bg-pastel-green text-primary-purple border-pastel-green/50',
      '팔로워십': 'bg-pastel-pink/50 text-primary-purple border-pastel-pink/30',
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
    const request = changeRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return;

    try {
      // 1. Swap schedules in Firestore
      const ourRef = doc(db, 'schedules', request.our.id.toString());
      const targetRef = doc(db, 'schedules', request.target.id.toString());
      
      await updateDoc(ourRef, { date: request.target.date, location: request.target.location });
      await updateDoc(targetRef, { date: request.our.date, location: request.our.location });
      
      // 2. Update request status in Firestore
      await updateDoc(doc(db, 'changeRequests', requestId.toString()), { status: 'approved' });
      
      setToast({ message: '요청이 승인되어 일정이 교체되었습니다.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'schedules/changeRequests');
    }
  };

  const rejectRequest = async (requestId: number) => {
    try {
      await updateDoc(doc(db, 'changeRequests', requestId.toString()), { status: 'rejected' });
      setToast({ message: '요청이 반려되었습니다.', type: 'error' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'changeRequests');
    }
  };

  const deleteTeam = async (id: number) => {
    try {
      await deleteDoc(doc(db, 'schedules', id.toString()));
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
    if (!editForm) return;
    
    try {
      await setDoc(doc(db, 'schedules', editForm.id.toString()), editForm);
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
      location: '서울'
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

  const quickChange = (our: Schedule, target: Schedule) => {
    setOurTeam(our);
    setTargetTeam(target);
    setIsAgreed(false);
    setActiveTab('change');
    setFilterType('change');
    setChangeStep('confirm');
    setSearchQuery('');
    setSelectedTeam(null);
    setActiveFilterMenu(null);
  };

  const getCompatibilityReason = (team: Schedule) => {
    if (!ourTeam) return "";
    const countDiff = Math.abs(ourTeam.count - team.count);
    const ourKey = ourTeam.keyword.split('_').pop();
    const targetKey = team.keyword.split('_').pop();
    const locationMatch = ourTeam.location === team.location;
    
    const reasons = [];
    if (countDiff > 2) reasons.push(`인원 차이(${countDiff}명)`);
    if (ourKey !== targetKey) reasons.push(`키워드 상이(${targetKey})`);
    if (!locationMatch) reasons.push(`장소 상이(${team.location})`);
    
    return reasons.join(', ');
  };

  const handleClearAll = () => {
    setSchedules([]);
    localStorage.removeItem('schedules');
    setShowClearConfirm(false);
    handleReset();
    setToast({ message: '모든 데이터가 삭제되었습니다.', type: 'success' });
  };

  const downloadExcel = () => {
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

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        let text = '';
        
        // Try UTF-8 first
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          text = utf8Decoder.decode(buffer);
        } catch (e) {
          // Fallback to EUC-KR (Common for Korean Excel CSVs)
          const eucDecoder = new TextDecoder('euc-kr');
          text = eucDecoder.decode(buffer);
        }

        // Split by lines and filter out empty ones
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length === 0) return;

        // Check if first line is header
        const firstLine = lines[0].toLowerCase();
        const startIdx = (firstLine.includes('날짜') || firstLine.includes('date') || firstLine.includes('팀명') || firstLine.includes('일정')) ? 1 : 0;
        
        const newSchedules: Schedule[] = lines.slice(startIdx).map((line, index) => {
          // Handle both Tab and Comma separators
          const parts = line.includes('\t') ? line.split('\t') : line.split(',');
          
          // Expected format based on prompt and Excel screenshot:
          // A:일정(date), B:키워드(keyword), C:팀명(teamName), D:팀장이름(leaderName), E:팀장전화번호(phone), F:인원수(count), G:일정(dup?), H:강사(inst1), I:보조(inst2), J:장소(location)
          return {
            id: Date.now() + index,
            date: parts[0]?.trim() || '',
            keyword: parts[1]?.trim() || '',
            teamName: parts[2]?.trim() || '',
            leaderName: parts[3]?.trim() || '',
            phone: parts[4]?.trim() || '',
            count: parseInt(parts[5]?.trim().replace(/[^0-9]/g, '')) || 0,
            instructor1: parts[7]?.trim() || '',
            instructor2: parts[8]?.trim() || '',
            location: parts[9]?.trim() || ''
          };
        });

        if (newSchedules.length > 0) {
          // Save to Firestore
          newSchedules.forEach(async (s) => {
            await setDoc(doc(db, 'schedules', s.id.toString()), s);
          });
          handleReset();
        }
      } catch (error) {
        console.error('File parsing error:', error);
      } finally {
        if (event.target) event.target.value = '';
      }
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
        user={user}
        logout={logout}
        login={login}
      />

      <main className="max-w-6xl mx-auto p-4 space-y-6 mt-4">
        <IntroSection />
        <SummaryCards 
          schedules={schedules}
          upcomingSchedules={upcomingSchedules}
          requestStats={requestStats}
          keywordStats={keywordStats}
          isDatePassed={isDatePassed}
        />

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
              {activeTab === 'requests' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-purple rounded-t-full" />}
            </button>
          </div>
        </section>

        {/* Team Search Section - Only show in Progress/Calendar view */}
        {(activeTab === 'progress' || activeTab === 'calendar') && (
          <section className="bg-white rounded-[24px] shadow-sm border border-pastel-purple p-2">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-purple transition-colors" />
              <input 
                type="text"
                placeholder="찾으시는 팀 이름을 입력해 주세요."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-14 pr-6 py-4 bg-transparent border-none focus:outline-none font-medium placeholder:text-text-muted text-lg"
              />
            </div>
          </section>
        )}

        {/* Filter Buttons Section - Redesigned */}
        {(activeTab === 'progress' || activeTab === 'calendar') && (
          <section className="bg-white p-8 rounded-[32px] border border-pastel-purple shadow-sm space-y-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 mr-4 border-r pr-8 border-pastel-purple">
                <div className="w-10 h-10 rounded-xl bg-pastel-purple flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary-purple" />
                </div>
                <span className="text-sm font-extrabold text-text-main uppercase tracking-tight">상세 필터링</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const next = activeFilterMenu === 'month' ? null : 'month';
                    setActiveFilterMenu(next);
                    if (next === null) { setFilterType('all'); setFilterValue(''); }
                  }}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${activeFilterMenu === 'month' ? 'bg-primary-purple border-primary-purple text-white shadow-lg shadow-primary-purple/20' : 'bg-app-bg border-transparent text-text-muted hover:border-pastel-purple'}`}
                >
                  월별 일정
                </button>
                <button 
                  onClick={() => {
                    const next = activeFilterMenu === 'location' ? null : 'location';
                    setActiveFilterMenu(next);
                    if (next === null) { setFilterType('all'); setFilterValue(''); }
                  }}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${activeFilterMenu === 'location' ? 'bg-primary-purple border-primary-purple text-white shadow-lg shadow-primary-purple/20' : 'bg-app-bg border-transparent text-text-muted hover:border-pastel-purple'}`}
                >
                  장소별 일정
                </button>
                <button 
                  onClick={() => {
                    const next = activeFilterMenu === 'keyword' ? null : 'keyword';
                    setActiveFilterMenu(next);
                    if (next === null) { setFilterType('all'); setFilterValue(''); }
                  }}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${activeFilterMenu === 'keyword' ? 'bg-primary-purple border-primary-purple text-white shadow-lg shadow-primary-purple/20' : 'bg-app-bg border-transparent text-text-muted hover:border-pastel-purple'}`}
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
            <div className="bg-white rounded-2xl shadow-sm border border-pastel-purple p-6 calendar-container">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate="2026-05-01"
                locale="ko"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
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
                    <div className="p-1 overflow-hidden">
                      <div className="font-black truncate text-[10px] mb-0.5">{eventInfo.event.title}</div>
                      <div className="flex flex-wrap gap-1 opacity-80">
                        <span className="text-[8px] bg-white/40 px-1 rounded">{s.location}</span>
                        <span className="text-[8px] bg-white/40 px-1 rounded">{s.count}명</span>
                      </div>
                      <div className="text-[8px] mt-0.5 font-medium truncate opacity-70">
                        #{s.keyword.includes('우수조직') ? `우수_${s.keyword.split('_').pop()}` : s.keyword.split('_').pop()}
                      </div>
                    </div>
                  );
                }}
                dayCellClassNames={(arg) => {
                  const day = arg.date.getDay();
                  return (day === 0 || day === 5 || day === 6) ? 'unavailable-day' : '';
                }}
                eventClick={(info) => {
                  setSelectedTeam(info.event.extendedProps as Schedule);
                }}
                editable={isAdmin}
                eventDrop={(info) => {
                  const newDate = info.event.start;
                  if (newDate) {
                    const day = newDate.getDay();
                    if (day === 0 || day === 5 || day === 6) {
                      setToast({ message: '금, 토, 일요일은 일정을 배치할 수 없습니다.', type: 'error' });
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
                          <div className="flex gap-2">
                            {req.status === 'pending' ? (
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
                            ) : (
                              <a 
                                href={getSmsLink(req)}
                                className="px-3 py-1.5 bg-white border border-pastel-purple text-xs font-bold rounded-lg hover:bg-pastel-purple transition-colors flex items-center gap-2 text-primary-purple shadow-sm"
                              >
                                <Phone className="w-3.5 h-3.5" /> 단체 안내 문자 발송
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 bg-app-bg/50 p-4 rounded-xl border border-pastel-purple/30">
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] font-bold text-text-muted uppercase">우리 팀 (현재)</p>
                          <p className="font-bold text-sm text-text-main">{req.our.teamName}</p>
                          <p className="text-xs text-text-muted">{req.our.date} · {req.our.location}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-white border border-pastel-purple flex items-center justify-center shadow-sm">
                            <ChevronRight className="w-4 h-4 text-primary-purple" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1 text-right">
                          <p className="text-[10px] font-bold text-text-muted uppercase">상대 팀 (희망)</p>
                          <p className="font-bold text-sm text-primary-purple">{req.target.teamName}</p>
                          <p className="text-xs text-text-muted">{req.target.date} · {req.target.location}</p>
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
              <div className="bg-pastel-purple border border-pastel-purple rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-primary-purple flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  차수 변경 요청 프로세스 (관리자 승인 필요)
                </h3>
                <div className="bg-white/60 p-5 rounded-xl border border-pastel-purple/30 text-sm text-text-main font-medium leading-relaxed space-y-3">
                  <p>함께 성장하는 컨설팅 문화를 위해 상대 팀의 상황을 먼저 배려해 주셔서 감사합니다.</p>
                  <p>원활한 일정 조정을 위해 상대 팀장님과 사전에 변경 가능 논의를 거치신 후 신청해 주세요.</p>
                  <p>두 팀 모두 만족스러운 컨설팅이 될 수 있도록 정성껏 돕겠습니다!</p>
                </div>
                <ol className="text-sm text-primary-purple space-y-2 list-decimal list-inside font-bold">
                  <li>변경을 희망하는 <b className="text-primary-purple underline decoration-pastel-pink underline-offset-4">우리 팀</b>을 먼저 선택하세요.</li>
                  <li><b className="text-primary-purple">같은 키워드, 같은 지역, 비슷한 규모의 인원</b> 등 조건이 맞는 <b className="text-primary-purple underline decoration-pastel-pink underline-offset-4">상대 팀</b>을 선택하세요.</li>
                  <li>상대 팀장님과 <b className="text-primary-purple underline decoration-pastel-pink underline-offset-4">사전 변경 논의</b>를 반드시 완료해 주세요.</li>
                  <li>협의 완료 체크 후 <b className="text-primary-purple underline decoration-pastel-pink underline-offset-4">변경 요청 전송</b> 버튼을 클릭하세요.</li>
                </ol>
                <p className="text-xs text-text-muted mt-2 font-bold">* 관리자 최종 승인 후 일정이 업데이트됩니다.</p>
              </div>

              {/* Change Flow Stepper */}
              <div className="flex items-center justify-between px-8 bg-white py-6 rounded-xl border border-pastel-purple shadow-sm">
                <div className={`flex flex-col items-center gap-2 ${changeStep === 'select_ours' ? 'text-primary-purple' : 'text-text-muted'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${changeStep === 'select_ours' ? 'border-primary-purple bg-pastel-purple font-bold scale-110' : 'border-pastel-purple'}`}>1</div>
                  <span className="text-xs font-bold">우리팀 선택</span>
                </div>
                <div className="h-px bg-pastel-purple flex-1 mx-4"></div>
                <div className={`flex flex-col items-center gap-2 ${changeStep === 'select_theirs' ? 'text-primary-purple' : 'text-text-muted'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${changeStep === 'select_theirs' ? 'border-primary-purple bg-pastel-purple font-bold scale-110' : 'border-pastel-purple'}`}>2</div>
                  <span className="text-xs font-bold">상대팀 검색</span>
                </div>
                <div className="h-px bg-pastel-purple flex-1 mx-4"></div>
                <div className={`flex flex-col items-center gap-2 ${changeStep === 'confirm' ? 'text-primary-purple' : 'text-text-muted'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${changeStep === 'confirm' ? 'border-primary-purple bg-pastel-purple font-bold scale-110' : 'border-pastel-purple'}`}>3</div>
                  <span className="text-xs font-bold">요청 전송</span>
                </div>
              </div>

              {changeStep === 'select_ours' && (
                <div className="bg-white rounded-2xl shadow-sm border border-pastel-purple overflow-hidden">
                  <div className="p-4 bg-app-bg border-b border-pastel-purple">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-text-main">변경을 원하는 우리 팀을 선택하세요</h3>
                      <span className="text-xs text-text-muted">전체 {schedules.length}개 팀</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input 
                        type="text"
                        placeholder="우리 팀 이름을 적어주세요."
                        value={step1Search}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setStep1Search(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-pastel-purple rounded-lg text-sm focus:ring-2 focus:ring-primary-purple/20 focus:border-primary-purple outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="divide-y divide-pastel-purple/30 max-h-[500px] overflow-y-auto">
                    {schedules
                      .filter(item => item.teamName.includes(step1Search))
                      .map(item => {
                        const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`p-4 flex items-center justify-between group transition-colors ${isPending ? 'bg-app-bg opacity-50 cursor-not-allowed' : 'hover:bg-pastel-purple cursor-pointer'}`}
                            onClick={() => !isPending && selectOurTeam(item)}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-text-main">{item.teamName}</p>
                                {isPending && (
                                  <span className="text-[10px] bg-pastel-orange text-primary-purple px-2 py-0.5 rounded-full font-bold">차수변경요청중</span>
                                )}
                              </div>
                              <p className="text-xs text-text-muted">{item.date} | {item.keyword} | {item.location} | {item.count}명</p>
                            </div>
                            {!isPending && <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary-purple transition-colors" />}
                          </div>
                        );
                      })}
                    {schedules.filter(item => item.teamName.includes(step1Search)).length === 0 && (
                      <div className="p-10 text-center text-text-muted text-sm">검색 결과가 없습니다.</div>
                    )}
                  </div>
                </div>
              )}

              {changeStep === 'select_theirs' && ourTeam && (
                <div className="space-y-4">
                  <div className="bg-primary-purple text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-80">선택된 우리 팀</p>
                      <p className="font-bold text-lg">{ourTeam.teamName}</p>
                      <p className="text-xs opacity-80">{ourTeam.date} | {ourTeam.keyword} | {ourTeam.location} | {ourTeam.count}명</p>
                    </div>
                    <button onClick={() => setChangeStep('select_ours')} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">변경</button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-pastel-purple overflow-hidden">
                    <div className="p-4 bg-app-bg border-b border-pastel-purple">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-text-main">교환 가능한 상대 팀 리스트</h3>
                          <p className="text-xs text-text-muted mt-1">조건: 인원 ±2명 & 동일 키워드 & 동일 장소</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input 
                          type="text"
                          placeholder="상대 팀 이름을 적어주세요."
                          value={step2Search}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setStep2Search(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-pastel-purple rounded-lg text-sm focus:ring-2 focus:ring-primary-purple/20 focus:border-primary-purple outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-pastel-purple/30 max-h-[400px] overflow-y-auto">
                      {schedules
                        .filter(item => item.id !== ourTeam.id && item.teamName.includes(step2Search))
                        .sort((a, b) => {
                          const aComp = Math.abs(ourTeam.count - a.count) <= 2 && 
                                       (ourTeam.keyword.split('_').pop() === a.keyword.split('_').pop()) &&
                                       (ourTeam.location === a.location);
                          const bComp = Math.abs(ourTeam.count - b.count) <= 2 && 
                                       (ourTeam.keyword.split('_').pop() === b.keyword.split('_').pop()) &&
                                       (ourTeam.location === b.location);
                          if (aComp && !bComp) return -1;
                          if (!aComp && bComp) return 1;
                          return 0;
                        })
                        .map(item => {
                          const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                          const isCompatible = !isPending && Math.abs(ourTeam.count - item.count) <= 2 && 
                                              (ourTeam.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
                                              (ourTeam.location === item.location);
                          const reason = isPending ? "이미 차수 변경 요청이 진행 중인 팀입니다." : getCompatibilityReason(item);

                          return (
                            <div 
                              key={item.id} 
                              className={`p-4 flex items-center justify-between transition-colors ${isCompatible ? 'hover:bg-pastel-green/30 cursor-pointer' : 'opacity-40 bg-app-bg cursor-not-allowed grayscale'}`}
                              onClick={() => isCompatible && selectTargetTeam(item)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-text-main">{item.teamName}</p>
                                  {isPending ? (
                                    <span className="text-[10px] bg-pastel-orange text-primary-purple px-2 py-0.5 rounded-full font-bold">차수변경요청중</span>
                                  ) : isCompatible ? (
                                    <div className="flex items-center gap-1 bg-pastel-green text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                      <RefreshCw className="w-2.5 h-2.5" />
                                      변경 가능
                                    </div>
                                  ) : (
                                    <span className="text-[10px] bg-pastel-purple text-text-muted px-2 py-0.5 rounded-full font-bold">변경 불가</span>
                                  )}
                                </div>
                                <p className="text-xs text-text-muted">{item.date} | {item.keyword} | {item.location} | {item.count}명</p>
                                {!isCompatible && <p className="text-[10px] text-text-muted mt-1 font-medium italic">사유: {reason}</p>}
                              </div>
                              {isCompatible && <ChevronRight className="w-5 h-5 text-green-400" />}
                            </div>
                          );
                        })}
                      {schedules.filter(item => item.id !== ourTeam.id && item.teamName.includes(step2Search)).length === 0 && (
                        <div className="p-10 text-center text-text-muted text-sm">검색 결과가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {changeStep === 'confirm' && ourTeam && targetTeam && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-3xl shadow-xl border-2 border-pastel-purple p-8 space-y-8 text-center"
                >
                  <div className="w-16 h-16 bg-pastel-orange rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-primary-purple" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-text-main tracking-tight">관리자에게 변경 요청을 보내시겠습니까?</h3>
                    <p className="text-text-muted">요청이 승인되면 일정이 최종적으로 교체됩니다.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <div className="bg-app-bg p-6 rounded-2xl border border-pastel-purple text-left">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">현재 (우리팀)</span>
                      <p className="font-bold text-lg text-text-main mt-1">{ourTeam.teamName}</p>
                      <div className="mt-3 space-y-1 text-sm text-text-muted">
                        <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {ourTeam.date}</p>
                        <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {ourTeam.location}</p>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border border-pastel-purple items-center justify-center z-10 shadow-sm">
                      <RefreshCw className="w-5 h-5 text-primary-purple" />
                    </div>

                    <div className="bg-pastel-blue p-6 rounded-2xl border border-pastel-blue/50 text-left">
                      <span className="text-[10px] font-bold text-primary-purple uppercase tracking-widest">변경 희망 (상대팀)</span>
                      <p className="font-bold text-lg text-text-main mt-1">{targetTeam.teamName}</p>
                      <div className="mt-3 space-y-1 text-sm text-primary-purple">
                        <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {targetTeam.date}</p>
                        <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {targetTeam.location}</p>
                      </div>
                      <div className="mt-4 p-3 bg-white/50 rounded-xl border border-pastel-blue/30">
                        <p className="text-[10px] font-bold text-primary-purple mb-1">상대 팀장 연락처</p>
                        <a 
                          href={`tel:${targetTeam.phone}`}
                          className="text-sm font-bold text-text-main hover:text-primary-purple transition-colors flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {targetTeam.leaderName} 팀장 ({targetTeam.phone})
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pastel-purple p-6 rounded-2xl border border-pastel-purple/50 space-y-4 shadow-inner">
                    <div className="text-sm font-bold text-primary-purple leading-relaxed space-y-2">
                      <p>함께 성장하는 컨설팅 문화를 위해 상대 팀의 상황을 먼저 배려해 주셔서 감사합니다.</p>
                      <p>원활한 일정 조정을 위해 상대 팀장님과 사전에 변경 가능 논의를 거치신 후 신청해 주세요.</p>
                      <p>두 팀 모두 만족스러운 컨설팅이 될 수 있도록 정성껏 돕겠습니다!</p>
                    </div>
                    <label className="flex items-center justify-center gap-3 cursor-pointer group bg-white p-4 rounded-xl border border-pastel-purple/30 shadow-sm hover:border-primary-purple transition-all">
                      <input 
                        type="checkbox" 
                        checked={isAgreed}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setIsAgreed(e.target.checked)}
                        className="w-5 h-5 rounded border-pastel-purple text-primary-purple focus:ring-primary-purple cursor-pointer"
                      />
                      <span className="text-sm font-bold text-text-main group-hover:text-primary-purple transition-colors">
                        상대팀과의 변경협의가 완료되었습니까?
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setChangeStep('select_theirs')}
                      className="flex-1 py-4 rounded-2xl font-bold text-text-muted bg-app-bg hover:bg-pastel-purple transition-colors"
                    >
                      취소
                    </button>
                    <button 
                      onClick={submitChangeRequest}
                      disabled={!isAgreed}
                      className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${isAgreed ? 'bg-primary-purple hover:bg-primary-purple/90 shadow-pastel-purple' : 'bg-pastel-purple text-text-muted cursor-not-allowed shadow-none'}`}
                    >
                      변경 요청 전송
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
                            <>
                              <button 
                                onClick={() => rejectRequest(req.id)}
                                className="px-3 py-1 bg-app-bg text-text-muted text-[10px] font-bold rounded hover:bg-pastel-pink hover:text-primary-purple transition-colors"
                              >
                                반려
                              </button>
                              <button 
                                onClick={() => approveRequest(req.id)}
                                className="px-3 py-1 bg-primary-purple text-white text-[10px] font-bold rounded hover:bg-primary-purple/90 transition-colors"
                              >
                                승인
                              </button>
                            </>
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
                <div className="overflow-x-auto">
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pastel-purple/10">
                      {filteredData.map((item, idx) => {
                        const isSearchedTeam = searchQuery && item.teamName.includes(searchQuery.trim());
                        const searchedTeamObj = searchQuery ? schedules.find(s => s.teamName.includes(searchQuery.trim())) : null;
                        
                        const isPending = changeRequests.some(r => r.status === 'pending' && (r.our.id === item.id || r.target.id === item.id));
                        
                        const isCompatibleWithSearched = !isPending && searchedTeamObj && item.id !== searchedTeamObj.id &&
                                                        Math.abs(searchedTeamObj.count - item.count) <= 2 && 
                                                        (searchedTeamObj.keyword.split('_').pop() === item.keyword.split('_').pop()) &&
                                                        (searchedTeamObj.location === item.location);

                        return (
                  <tr 
                    key={item.id} 
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
                          차수변경가능
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${isSearchedTeam ? 'bg-white/20 text-white border-white/30' : getKeywordStyle(item.keyword)}`}>
                        {item.keyword}
                      </span>
                    </td>
                    <td className="px-4 py-3 opacity-80">{item.location}</td>
                    <td className="px-4 py-3 opacity-80">{item.count}명</td>
                  </tr>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-pastel-purple"
            >
              <div className="bg-primary-purple p-6 text-white relative">
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {isAdmin && !isEditing && (
                    <>
                      <button 
                        onClick={() => {
                          setIsEditing(true);
                          setEditForm(selectedTeam);
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-white/20 transition-colors text-xs font-bold"
                        title="수정"
                      >
                        수정
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(selectedTeam.id)}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-pastel-pink"
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
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    {isEditing ? '팀 정보 수정' : '팀 상세 정보'}
                  </span>
                </div>
                {isEditing && editForm ? (
                  <input 
                    type="text"
                    value={editForm.teamName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, teamName: e.target.value})}
                    className="text-xl font-bold leading-tight bg-white/10 border border-white/30 rounded px-2 py-1 w-full outline-none focus:bg-white/20"
                  />
                ) : (
                  <h3 className="text-xl font-bold leading-tight">{selectedTeam.teamName}</h3>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                {isEditing && editForm ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">날짜</label>
                        <input 
                          type="text" 
                          value={editForm.date}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, date: e.target.value})}
                          className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">장소</label>
                        <input 
                          type="text" 
                          value={editForm.location}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, location: e.target.value})}
                          className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">팀장명</label>
                        <input 
                          type="text" 
                          value={editForm.leaderName}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, leaderName: e.target.value})}
                          className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">연락처</label>
                        <input 
                          type="text" 
                          value={editForm.phone}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">키워드</label>
                        <input 
                          type="text" 
                          value={editForm.keyword}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, keyword: e.target.value})}
                          className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">인원</label>
                        <input 
                          type="number" 
                          value={editForm.count}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, count: parseInt(e.target.value) || 0})}
                          className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">관리자 메모 (비공개)</label>
                      <textarea 
                        value={editForm.memo || ''}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditForm({...editForm, memo: e.target.value})}
                        placeholder="팀별 특이사항이나 운영 시 주의사항을 기록하세요."
                        className="w-full p-2 bg-app-bg border border-pastel-purple rounded-lg text-sm h-20 resize-none"
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
                        className="flex-1 py-3 rounded-xl font-bold text-text-muted bg-app-bg hover:bg-pastel-purple transition-colors"
                      >
                        취소
                      </button>
                      <button 
                        onClick={handleEditSave}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-primary-purple hover:bg-primary-purple/90 transition-colors shadow-lg shadow-pastel-purple"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-text-muted uppercase">팀장</p>
                        <p className="font-bold text-text-main">{selectedTeam.leaderName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-text-muted uppercase">연락처</p>
                        <a 
                          href={`tel:${selectedTeam.phone}`}
                          className="font-medium text-text-muted hover:text-primary-purple transition-colors"
                        >
                          {selectedTeam.phone}
                        </a>
                      </div>
                    </div>

                    <div className="h-px bg-pastel-purple/30"></div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted flex items-center gap-2"><Calendar className="w-4 h-4" /> 일정</span>
                        <span className="font-bold text-text-main">{selectedTeam.date}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted flex items-center gap-2"><MapPin className="w-4 h-4" /> 장소</span>
                        <span className="font-bold text-text-main">{selectedTeam.location}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted flex items-center gap-2"><Key className="w-4 h-4" /> 키워드</span>
                        <span className="font-bold text-primary-purple">{selectedTeam.keyword}</span>
                      </div>
                    </div>

                    {isAdmin && selectedTeam.memo && (
                      <div className="p-4 bg-pastel-purple/20 rounded-xl border border-pastel-purple/30 space-y-1">
                        <p className="text-[10px] font-bold text-primary-purple uppercase tracking-wider">관리자 메모</p>
                        <p className="text-xs text-text-main leading-relaxed">{selectedTeam.memo}</p>
                      </div>
                    )}

                    <a 
                      href={`tel:${selectedTeam.phone}`}
                      className="flex items-center justify-center gap-2 w-full py-4 bg-primary-purple hover:bg-primary-purple/90 text-white rounded-2xl font-bold shadow-lg shadow-pastel-purple transition-all active:scale-95"
                    >
                      <Phone className="w-5 h-5" />
                      팀장에게 바로연결
                    </a>
                  </>
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
        <button onClick={handleReset} className={`flex flex-col items-center gap-1 ${filterType === 'all' ? 'text-primary-purple' : 'text-text-muted'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">홈</span>
        </button>
        <button onClick={startChangeFlow} className={`flex flex-col items-center gap-1 ${filterType === 'change' ? 'text-primary-purple' : 'text-text-muted'}`}>
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px] font-bold">변경</span>
        </button>
      </nav>
    </div>
  );
}
