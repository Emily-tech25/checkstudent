import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  MessageCircle, 
  FileText, 
  Plus, 
  Trash2, 
  Brain, 
  ChevronRight, 
  Search,
  Lock,
  Unlock,
  Download,
  GraduationCap,
  Quote,
  Send,
  Loader2,
  Calendar,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from './lib/utils';
import { Student, StudentLog, QAItem, TabType } from './types';
import { analyzeStudentRoadmap, suggestQAAnswer } from './services/geminiService';

// Mock Initial Data
const INITIAL_STUDENTS: Student[] = [
  { id: '1', name: 'Nguyễn Văn An', lastScore: 8.5, lastUpdate: '2026-04-22', lastNote: 'Học sinh này cần tập trung hơn vào các bài tập về nhà để củng cố kiến thức đã học trên lớp.', createdAt: Date.now() },
  { id: '2', name: 'Trần Thị Bình', lastScore: 7.2, lastUpdate: '2026-04-18', lastNote: 'Tiến bộ ở phần Đại số', createdAt: Date.now() },
  { id: '3', name: 'Lê Hoàng Minh', lastScore: 9.0, lastUpdate: '2026-04-21', lastNote: 'Làm bài rất tốt, cần duy trì phong độ', createdAt: Date.now() },
];

const INITIAL_LOGS: Record<string, StudentLog[]> = {
  '1': [
    { id: 'l1', score: 8.0, note: 'Lần 1: Bài kiểm tra đầu vào', date: '2026-04-01', timestamp: Date.now() - 2000000 },
    { id: 'l2', score: 8.5, note: 'Lần 2: Kiểm tra giữa kỳ', date: '2026-04-20', timestamp: Date.now() - 1000000 },
    { id: 'l7', score: 8.5, note: 'Học sinh này cần tập trung hơn vào các bài tập về nhà để củng cố kiến thức đã học trên lớp.', date: '2026-04-22', timestamp: Date.now() },
  ],
  '2': [
    { id: 'l3', score: 6.5, note: 'Lần 1: Bài kiểm tra đầu vào', date: '2026-04-01', timestamp: Date.now() - 2000000 },
    { id: 'l4', score: 7.2, note: 'Lần 2: Kiểm tra định kỳ', date: '2026-04-18', timestamp: Date.now() - 1500000 },
  ],
  '3': [
    { id: 'l5', score: 8.5, note: 'Lần 1: Bài kiểm tra đầu vào', date: '2026-04-01', timestamp: Date.now() - 2000000 },
    { id: 'l6', score: 9.0, note: 'Lần 2: Kiểm tra nâng cao', date: '2026-04-21', timestamp: Date.now() - 500000 },
  ],
};

export default function App() {
  const [tab, setTab] = useState<TabType>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('sentry_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });
  const [logs, setLogs] = useState<Record<string, StudentLog[]>>(() => {
    const saved = localStorage.getItem('sentry_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });
  const [qa, setQa] = useState<QAItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [newStudentName, setNewStudentName] = useState('');
  const [newScore, setNewScore] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    localStorage.setItem('sentry_students', JSON.stringify(students));
    localStorage.setItem('sentry_logs', JSON.stringify(logs));
  }, [students, logs]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [students, searchTerm]);

  const handleAdminAuth = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      const pass = prompt("Nhập mật mã Giáo viên (mặc định 123456):");
      if (pass === "123456") {
        setIsAdmin(true);
      } else {
        alert("Mật khẩu không chính xác!");
      }
    }
  };

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name: newStudentName,
      createdAt: Date.now(),
      lastNote: 'Vừa được thêm mới',
    };
    setStudents([...students, newStudent]);
    setNewStudentName('');
  };

  const deleteStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Xóa vĩnh viễn học sinh này và mọi dữ liệu liên quan?")) {
      setStudents(students.filter(s => s.id !== id));
      const newLogs = { ...logs };
      delete newLogs[id];
      setLogs(newLogs);
    }
  };

  const openStudentDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
    setAiAnalysis(null);
  };

  const addLog = () => {
    if (!selectedStudent || !newScore) return;
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const newEntry: StudentLog = {
      id: Math.random().toString(36).substr(2, 9),
      score: parseFloat(newScore),
      note: newNote || 'Cập nhật định kỳ',
      date: dateStr,
      timestamp: Date.now()
    };

    const studentLogs = logs[selectedStudent.id] || [];
    const updatedLogs = [...studentLogs, newEntry];
    setLogs({ ...logs, [selectedStudent.id]: updatedLogs });

    setStudents(students.map(s => s.id === selectedStudent.id ? {
      ...s,
      lastScore: newScore,
      lastUpdate: dateStr,
      lastNote: newNote
    } : s));

    setIsLogFormOpen(false);
    setNewScore('');
    setNewNote('');
  };

  const handleAnalyzeAI = async () => {
    if (!selectedStudent) return;
    setIsLoadingAI(true);
    try {
      const studentLogs = logs[selectedStudent.id] || [];
      const analysis = await analyzeStudentRoadmap(selectedStudent.name, studentLogs);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error(err);
      alert("AI đang bận, vui lòng thử lại sau.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const submitQuestion = () => {
    if (!newQuestion.trim()) return;
    const newItem: QAItem = {
      id: Math.random().toString(36).substr(2, 9),
      question: newQuestion,
      answer: null,
      author: 'Phụ huynh/Học sinh',
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      createdAt: Date.now()
    };
    setQa([newItem, ...qa]);
    setNewQuestion('');
  };

  const handleAISuggest = async (id: string) => {
    const item = qa.find(i => i.id === id);
    if (!item) return;
    setIsLoadingAI(true);
    try {
      const suggestion = await suggestQAAnswer(item.question);
      setQa(qa.map(i => i.id === id ? { ...i, answer: suggestion } : i));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Geometric Background */}
      <div className="fixed inset-0 -z-10 bg-slate-50" />
      <div className="fixed top-0 left-0 right-0 h-1/2 -z-10 bg-gradient-to-b from-blue-50/50 to-transparent" />
      
      {/* Header */}
      <header className="relative h-64 flex flex-col items-center justify-center text-white overflow-hidden rounded-b-3xl shadow-lg">
        <div className="absolute inset-0 bg-slate-900 opacity-95 transition-all duration-500" />
        <img 
          src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1473&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover -z-10 mix-blend-overlay opacity-20" 
          alt="Banner"
        />
        
        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-20">
          <button 
            onClick={handleAdminAuth}
            className="card-glass border-slate-700 px-5 py-2.5 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs font-bold bg-white/10 backdrop-blur-xl text-white border-white/20"
          >
            {isAdmin ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isAdmin ? "QUẢN TRỊ VIÊN" : "CHẾ ĐỘ HỌC SINH"}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center px-4"
        >
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl italic shadow-lg shadow-blue-900/20">S</div>
            <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-white">
              StudySentry
            </h1>
          </div>
          <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-[0.2em] opacity-80">
            Hệ thống giám sát học tập thông minh
          </p>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Navigation */}
        <nav className="flex flex-wrap gap-3 mb-12 justify-center p-1.5 rounded-2xl w-fit mx-auto bg-white border border-slate-200 shadow-sm sticky top-6 z-40">
          <button 
            onClick={() => setTab('home')}
            className={cn("nav-btn", tab === 'home' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50")}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline text-xs uppercase tracking-wider">Danh sách lớp</span>
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => setTab('dashboard')}
              className={cn("nav-btn", tab === 'dashboard' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50")}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline text-xs uppercase tracking-wider">Bảng tổng hợp</span>
            </button>
          )}

          <button 
            onClick={() => setTab('qa')}
            className={cn("nav-btn", tab === 'qa' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50")}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline text-xs uppercase tracking-wider">Hỏi đáp</span>
          </button>

          <button 
            onClick={() => setTab('docs')}
            className={cn("nav-btn", tab === 'docs' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50")}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline text-xs uppercase tracking-wider">Tài liệu</span>
          </button>
        </nav>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'home' && (
              <div className="space-y-10 animate-slide-up">
                {/* Welcome Hero Section */}
                <div className="card-glass p-0 overflow-hidden mb-12 border-none shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                      <div className="w-10 h-1 bg-blue-600 mb-6"></div>
                      <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 uppercase tracking-tight mb-4 leading-none">
                        Quản lý <span className="text-blue-600">toàn diện</span> học tập
                      </h2>
                      <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-8 font-medium">
                        StudySentry kết nối giáo viên và phụ huynh, mang đến cái nhìn minh bạch 
                        và sâu sắc về hành trình tri thức của từng học sinh thông qua dữ liệu và trí tuệ nhân tạo.
                      </p>
                      <div className="flex flex-wrap gap-6 border-t border-slate-50 pt-8">
                        <div>
                          <p className="text-2xl font-black text-slate-900 leading-none mb-1">{students.length}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Học sinh đang học</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-900 leading-none mb-1">24/7</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giám sát hỗ trợ</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-900 leading-none mb-1">AI</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phân tích lộ trình</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-64 md:h-auto relative overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1471&auto=format&fit=crop" 
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt="Education"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent md:block hidden"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent md:hidden block"></div>
                    </div>
                  </div>
                </div>

                {/* Admin Add Student */}
                {isAdmin && (
                  <div className="card-glass p-8 border-t-4 border-blue-600 max-w-2xl mx-auto">
                    <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      Thêm học sinh mới
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Họ và tên học sinh..."
                        className="flex-1 p-3.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 bg-slate-50 transition-all text-sm font-medium"
                      />
                      <button 
                        onClick={addStudent}
                        className="bg-slate-900 text-white px-8 py-3.5 rounded-lg font-bold hover:bg-black active:scale-95 transition-all text-xs uppercase tracking-widest"
                      >
                        Thêm vào hệ thống
                      </button>
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative max-w-md mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm theo tên học sinh..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all shadow-sm text-sm"
                  />
                </div>

                {/* Student Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {filteredStudents.map(student => (
                    <motion.div 
                      key={student.id}
                      layoutId={`student-${student.id}`}
                      onClick={() => openStudentDetail(student)}
                      className="group card-glass p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-200 hover:shadow-md relative overflow-hidden"
                    >
                      <div className="w-14 h-14 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 text-lg font-bold mb-4 group-hover:scale-105 group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                        {student.name[0]}
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs md:text-sm mb-1 uppercase tracking-tight">{student.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {student.id.toUpperCase()}</p>
                      
                      {isAdmin && (
                        <button 
                          onClick={(e) => deleteStudent(student.id, e)}
                          className="absolute top-2 right-2 p-1.5 text-slate-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'dashboard' && isAdmin && (
              <div className="animate-slide-up">
                <div className="card-glass overflow-hidden border-t-8 border-slate-900">
                  <div className="p-6 md:p-8 flex items-center justify-between border-b bg-white">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        Tiến độ toàn khóa
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Tổng hợp dữ liệu học tập thời gian thực</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                      <Download className="w-3.5 h-3.5" />
                      Xuất báo cáo
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                        <tr>
                          <th className="p-5 text-left border-b">Học sinh</th>
                          <th className="p-5 text-center border-b">GPA Mới nhất</th>
                          <th className="p-5 text-left border-b">Ngày cập nhật</th>
                          <th className="p-5 text-left border-b">Ghi chú gần nhất</th>
                          <th className="p-5 text-right border-b">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-5">
                              <p className="font-bold text-slate-700 text-sm">{s.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Lớp 10 • {s.id.toUpperCase()}</p>
                            </td>
                            <td className="p-5 text-center">
                              <span className={cn(
                                "inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-black",
                                (typeof s.lastScore === 'number' && s.lastScore >= 8) ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                              )}>
                                {s.lastScore || '--'}
                              </span>
                            </td>
                            <td className="p-5 text-[10px] text-slate-500 font-bold uppercase">{s.lastUpdate || '--'}</td>
                            <td className="p-5 text-xs italic text-slate-400 max-w-xs truncate">"{s.lastNote || 'Chưa có dữ liệu mới'}"</td>
                            <td className="p-5 text-right">
                              <button 
                                onClick={() => openStudentDetail(s)}
                                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 underline underline-offset-4"
                              >
                                Xem hồ sơ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'qa' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
                {/* Ask a question */}
                <div className="card-glass p-8 border-l-4 border-blue-600">
                  <h4 className="text-sm font-black text-slate-800 mb-5 uppercase tracking-widest flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    Đặt câu hỏi cố vấn
                  </h4>
                  <div className="space-y-4">
                    <textarea 
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      rows={3}
                      placeholder="Nhập nội dung thắc mắc về kiến thức hoặc lộ trình học tập..."
                      className="w-full p-4 rounded-lg border border-slate-200 bg-slate-50 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium"
                    />
                    <button 
                      onClick={submitQuestion}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-lg font-bold shadow-lg shadow-slate-200 hover:bg-black active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <Send className="w-4 h-4" />
                      Gửi yêu cầu hỗ trợ
                    </button>
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-6">
                  {qa.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic text-sm">Chưa có bản tin phản hồi nào từ giáo viên.</div>
                  ) : qa.map(item => (
                    <div key={item.id} className="card-glass p-6 animate-slide-up bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.date}</span>
                        </div>
                        {isAdmin && (
                          <button onClick={() => setQa(qa.filter(i => i.id !== item.id))} className="text-slate-200 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 text-base mb-4 leading-relaxed">{item.question}</p>
                      
                      {item.answer ? (
                        <div className="p-5 bg-slate-50 rounded-lg border border-slate-100 flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-md shadow-blue-900/10 italic">GV</div>
                          <div className="text-sm text-slate-600 prose-slate prose-sm font-medium leading-relaxed">
                            <Markdown>{item.answer}</Markdown>
                          </div>
                        </div>
                      ) : (
                        isAdmin && (
                          <button 
                            onClick={() => handleAISuggest(item.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            AI Trợ lý phản hồi
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'docs' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto animate-slide-up">
                {[
                  { title: "Quizlet Master", desc: "Ngân hàng 5000+ từ vựng & cấu trúc ngữ pháp trọng tâm thi vào 10.", icon: <Brain className="w-6 h-6" /> },
                  { title: "Exam Center", desc: "Tuyển tập 100+ đề thi chính thức và đề thi thử các trường chuyên.", icon: <FileText className="w-6 h-6" /> },
                  { title: "Success Guide", desc: "Chiến thuật tâm lý và mẹo làm bài trắc nghiệm đạt điểm tối đa.", icon: <Star className="w-6 h-6" /> }
                ].map((doc, idx) => (
                  <div key={idx} className="group card-glass p-8 flex flex-col items-center text-center hover:border-blue-200">
                    <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                      {doc.icon}
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mb-3 uppercase tracking-tight">{doc.title}</h4>
                    <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">"{doc.desc}"</p>
                    <button className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all text-[10px] uppercase tracking-widest">
                      Truy cập thư viện
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Quote */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-16 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-center gap-2 text-slate-200 mb-8">
            <div className="w-12 h-0.5 bg-slate-100 rounded-full" />
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
            <div className="w-12 h-0.5 bg-slate-100 rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="p-5 border border-slate-100 rounded-xl">
              <span className="text-blue-600 font-bold block mb-2 text-[10px] uppercase tracking-widest">Tri thức</span>
              <p className="text-slate-800 font-extrabold text-sm uppercase">"Học, học nữa, học mãi"</p>
            </div>
            <div className="p-5 border border-slate-100 rounded-xl">
              <span className="text-blue-600 font-bold block mb-2 text-[10px] uppercase tracking-widest">Sức mạnh</span>
              <p className="text-slate-800 font-extrabold text-sm uppercase">"Tri thức là sức mạnh"</p>
            </div>
            <div className="p-5 border border-slate-100 rounded-xl">
              <span className="text-blue-600 font-bold block mb-2 text-[10px] uppercase tracking-widest">Tầm nhìn</span>
              <p className="text-slate-800 font-extrabold text-xs uppercase leading-tight">"Học để biết, để làm, chung sống và tự khẳng định"</p>
            </div>
            <div className="p-5 border border-slate-100 rounded-xl">
              <span className="text-blue-600 font-bold block mb-2 text-[10px] uppercase tracking-widest">Hành động</span>
              <p className="text-slate-800 font-extrabold text-sm uppercase">"Đường ngắn không đi không đến"</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-4">
              Dữ liệu được cập nhật thời gian thực từ hệ thống trường học
            </p>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">StudySentry &copy; 2026 • GEOMETRIC BALANCE EDITION</p>
          </div>
        </div>
      </footer>

      {/* Student Detail Modal */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col relative shadow-2xl z-10 border border-slate-200"
          >
            <div className="p-6 md:p-8 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-slate-200 uppercase italic">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight uppercase">
                    {selectedStudent.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hồ sơ học tập toàn diện • Lớp 10</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <button 
                    onClick={() => setIsLogFormOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Cập nhật điểm số
                  </button>
                )}
                <button 
                  onClick={handleAnalyzeAI}
                  disabled={isLoadingAI}
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:bg-black transition-all disabled:opacity-50"
                >
                  {isLoadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Phân tích lộ trình AI
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Stats & Charts */}
                <div className="lg:col-span-2 space-y-10">
                  {/* Chart */}
                  <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/30 h-[320px]">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-blue-600"></div>
                      Biểu đồ tăng trưởng GPA
                    </h4>
                    <div className="w-full h-full">
                      <ResponsiveContainer width="100%" height="80%">
                        <LineChart data={logs[selectedStudent.id] || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} domain={[0, 10]} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                            labelStyle={{ fontWeight: 'black', color: '#1e293b', marginBottom: '4px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Section */}
                  {aiAnalysis && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 rounded-2xl bg-slate-900 text-white relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Brain className="w-16 h-16" />
                      </div>
                      <h4 className="text-[10px] font-black text-blue-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        Hệ thống cố vấn AI (Gemini 2.0)
                      </h4>
                      <div className="prose prose-sm prose-invert max-w-none prose-headings:font-black prose-p:leading-relaxed text-slate-300 font-medium whitespace-pre-wrap">
                        <Markdown>{aiAnalysis}</Markdown>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Lịch sử cập nhật
                  </h4>
                  <div className="space-y-4">
                    {(logs[selectedStudent.id] || []).slice().reverse().map((entry) => (
                      <div key={entry.id} className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{entry.date}</span>
                          <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-black">{entry.score} Đ</div>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{entry.note}"</p>
                        
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              const newLogs = logs[selectedStudent.id].filter(l => l.id !== entry.id);
                              setLogs({ ...logs, [selectedStudent.id]: newLogs });
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {(!logs[selectedStudent.id] || logs[selectedStudent.id].length === 0) && (
                      <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-dashed border-slate-200 rounded-xl">
                        Chưa có dữ liệu lịch sử
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-slate-50 text-right">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Đóng hồ sơ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Update Score Modal */}
      {isLogFormOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Cập nhật lộ trình</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Điểm số luyện tập (GPA)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  placeholder="Ví dụ: 8.5"
                  className="w-full p-4 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 bg-slate-50 transition-all font-bold text-lg text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Nhận xét & Dặn dò</label>
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú cụ thể về tình hình học tập và các mảng kiến thức cần cải thiện..."
                  className="w-full p-4 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 bg-slate-50 transition-all text-sm italic font-medium text-slate-600"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsLogFormOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={addLog}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:bg-black transition-all"
                >
                  Lưu dữ liệu
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
