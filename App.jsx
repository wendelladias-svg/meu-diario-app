import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Utensils, 
  BookOpen, 
  GraduationCap, 
  Wallet, 
  Heart, 
  Calendar as CalendarIcon,
  BarChart3,
  CheckCircle2,
  Activity,
  TrendingUp,
  Trophy,
  History,
  CheckSquare,
  PieChart
} from 'lucide-react';

// --- Configuração do Banco de Dados em Nuvem ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

let app, auth, db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

if (typeof __firebase_config !== 'undefined') {
  try {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
}

// Formata uma data para o padrão YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

// Converte decimal para formato humano (ex: 8h 30m)
const formatSleepDisplay = (decimal) => {
  const h = Math.floor(decimal || 0);
  const m = Math.round(((decimal || 0) - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const HABITS = [
  { id: 'academia', label: 'Academia', icon: Dumbbell, color: 'bg-orange-100 text-orange-600 border-orange-200', active: 'bg-orange-500 text-white border-orange-600' },
  { id: 'alimentacao', label: 'Alimentação', icon: Utensils, color: 'bg-green-100 text-green-600 border-green-200', active: 'bg-green-500 text-white border-green-600' },
  { id: 'leitura', label: 'Leitura', icon: BookOpen, color: 'bg-blue-100 text-blue-600 border-blue-200', active: 'bg-blue-500 text-white border-blue-600' },
  { id: 'estudos', label: 'Estudos', icon: GraduationCap, color: 'bg-purple-100 text-purple-600 border-purple-200', active: 'bg-purple-500 text-white border-purple-600' },
  { id: 'financas', label: 'Finanças', icon: Wallet, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', active: 'bg-emerald-500 text-white border-emerald-600' },
  { id: 'cuidado', label: 'Cuidado Pessoal', icon: Heart, color: 'bg-rose-100 text-rose-600 border-rose-200', active: 'bg-rose-500 text-white border-rose-600' }
];

const generateMockData = () => {
  const data = {};
  const baseDate = new Date();
  
  for (let i = 0; i <= 60; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const modifier = i < 30 ? 0.2 : 0; 
    const isCompleted = Math.random() < (0.6 + modifier);

    data[dateStr] = {
      isCompleted: isCompleted,
      metrics: { 
        productivity: Math.max(0, Math.min(10, Math.floor(Math.random() * 5 + 4 + modifier * 10))), 
        stress: Math.max(0, Math.min(10, Math.floor(Math.random() * 6 + 2 - modifier * 5))), 
        sleep: Math.max(0, Math.min(24, +(6 + Math.random() * 3).toFixed(1)))
      },
      habits: { 
        academia: Math.random() < (0.4 + modifier), 
        alimentacao: Math.random() < (0.6 + modifier), 
        leitura: Math.random() < (0.5 + modifier), 
        estudos: Math.random() < (0.4 + modifier), 
        financas: Math.random() < 0.2, 
        cuidado: Math.random() < (0.3 + modifier) 
      }
    };
  }
  return data;
};

const INITIAL_DATA = generateMockData();
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function App() {
  const today = formatDate(new Date());
  const [currentDate, setCurrentDate] = useState(today);
  const [activeTab, setActiveTab] = useState('registro'); 
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [entries, setEntries] = useState(INITIAL_DATA);
  const [user, setUser] = useState(null);

  // 1. Inicializa Autenticação Segura
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Busca dados da Nuvem em Tempo Real
  useEffect(() => {
    if (!user || !db) return;
    const entriesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'entries');
    const unsubscribe = onSnapshot(entriesRef, (snapshot) => {
      const fetchedEntries = {};
      snapshot.forEach(doc => {
        fetchedEntries[doc.id] = doc.data();
      });
      // Mantém o histórico base e injeta os seus dados reais salvos
      setEntries(prev => ({ ...INITIAL_DATA, ...prev, ...fetchedEntries }));
    }, (error) => {
      console.error("Erro ao sincronizar dados:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Função para Salvar Alterações na Nuvem
  const saveEntryToCloud = async (dateStr, entryData) => {
    if (!user || !db) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'entries', dateStr);
      await setDoc(docRef, entryData, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar na nuvem:", error);
    }
  };

  // Estados para Gestos de Deslizar (Swipe)
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const currentEntry = entries[currentDate] || {
    isCompleted: false,
    metrics: { productivity: 5, stress: 5, sleep: 7 },
    habits: { academia: false, alimentacao: false, leitura: false, estudos: false, financas: false, cuidado: false }
  };

  const handleMetricChange = (metric, value) => {
    const numValue = value === '' ? '' : Number(value);
    const updatedEntry = {
      ...currentEntry,
      metrics: { ...currentEntry.metrics, [metric]: numValue }
    };
    setEntries(prev => ({ ...prev, [currentDate]: updatedEntry }));
    saveEntryToCloud(currentDate, updatedEntry);
  };

  const handleSleepTimeChange = (type, value) => {
    const currentDecimal = currentEntry.metrics.sleep || 0;
    const currentH = Math.floor(currentDecimal);
    const currentM = Math.round((currentDecimal - currentH) * 60);
    
    let newH = currentH;
    let newM = currentM;

    if (type === 'hours') newH = value === '' ? 0 : Number(value);
    if (type === 'minutes') newM = value === '' ? 0 : Number(value);

    const newDecimal = newH + (newM / 60);
    handleMetricChange('sleep', newDecimal);
  };

  const toggleHabit = (habitId) => {
    const updatedEntry = {
      ...currentEntry,
      habits: { ...currentEntry.habits, [habitId]: !currentEntry.habits[habitId] }
    };
    setEntries(prev => ({ ...prev, [currentDate]: updatedEntry }));
    saveEntryToCloud(currentDate, updatedEntry);
  };

  const toggleDayCompletion = () => {
    const updatedEntry = {
      ...currentEntry,
      isCompleted: !currentEntry.isCompleted
    };
    setEntries(prev => ({ ...prev, [currentDate]: updatedEntry }));
    saveEntryToCloud(currentDate, updatedEntry);
  };

  const changeDate = (offset) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    const newDateStr = formatDate(d);
    
    // Bloqueia ir para o futuro
    if (newDateStr > today) return;

    setCurrentDate(newDateStr);
    setCalendarViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Lógica de Swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentDate < today) {
      changeDate(1); // Desliza pra esquerda -> Vai pro dia seguinte
    } else if (isRightSwipe) {
      changeDate(-1); // Desliza pra direita -> Vai pro dia anterior
    }
  };

  const goToDateFromCalendar = (dateStr) => {
    setCurrentDate(dateStr);
    setActiveTab('registro');
  };

  const prevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));

  // --- Insights e Dados Visuais ---
  const completedHabitsCount = Object.values(currentEntry.habits).filter(Boolean).length;
  const habitProgress = (completedHabitsCount / HABITS.length) * 100;

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayData = entries[dateStr] || { metrics: { productivity: 0, stress: 0, sleep: 0 } };
      data.push({
        date: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        fullDate: dateStr,
        ...dayData.metrics
      });
    }
    return data;
  }, [entries, today]);

  const metricInsights = useMemo(() => {
    const getMetricsAvg = (startDayIdx, endDayIdx) => {
      let totalProd = 0; let totalStress = 0; let totalSleep = 0;
      let days = endDayIdx - startDayIdx + 1;
      for (let i = startDayIdx; i <= endDayIdx; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const metrics = entries[dateStr]?.metrics || { productivity: 0, stress: 0, sleep: 0 };
        totalProd += Number(metrics.productivity) || 0;
        totalStress += Number(metrics.stress) || 0;
        totalSleep += Number(metrics.sleep) || 0;
      }
      return {
        productivity: Number((totalProd / days).toFixed(1)),
        stress: Number((totalStress / days).toFixed(1)),
        sleep: Number((totalSleep / days).toFixed(1))
      };
    };
    return { thisMonth: getMetricsAvg(0, 29), lastMonth: getMetricsAvg(30, 59) };
  }, [entries, today]);

  const habitInsights = useMemo(() => {
    const getHabitCounts = (startDayIdx, endDayIdx) => {
      const counts = {};
      HABITS.forEach(h => counts[h.id] = 0);
      for (let i = startDayIdx; i <= endDayIdx; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        if (entries[dateStr] && entries[dateStr].habits) {
          HABITS.forEach(h => { if (entries[dateStr].habits[h.id]) counts[h.id]++; });
        }
      }
      return counts;
    };

    const weekly = getHabitCounts(0, 6);
    const lastWeek = getHabitCounts(7, 13);
    const thisMonth = getHabitCounts(0, 29);
    const lastMonth = getHabitCounts(30, 59);

    const totalThisWeek = Object.values(weekly).reduce((a, b) => a + b, 0);
    const totalLastWeek = Object.values(lastWeek).reduce((a, b) => a + b, 0);
    const totalThisMonth = Object.values(thisMonth).reduce((a, b) => a + b, 0);
    const totalLastMonth = Object.values(lastMonth).reduce((a, b) => a + b, 0);
    
    const weeklyImprovement = totalLastWeek === 0 ? (totalThisWeek > 0 ? 100 : 0) : Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100);
    const improvement = totalLastMonth === 0 ? (totalThisMonth > 0 ? 100 : 0) : Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100);

    let topHabitId = HABITS[0].id;
    let maxVal = -1;
    Object.entries(thisMonth).forEach(([id, count]) => {
      if (count > maxVal) { maxVal = count; topHabitId = id; }
    });
    const topHabit = HABITS.find(h => h.id === topHabitId);

    return { weekly, thisMonth, totalThisWeek, totalLastWeek, weeklyImprovement, totalThisMonth, totalLastMonth, improvement, topHabit, topHabitCount: maxVal };
  }, [entries, today]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans pb-24">
      {/* Header Fixo e Elegante */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-200 relative">
              <Activity className="w-5 h-5" />
              {user && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full shadow-sm" title="Sincronizado na Nuvem"></div>}
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">Meu Diário</h1>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            {today === currentDate ? 'Hoje' : new Date(currentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Suporte a Swipe */}
      <main 
        className="max-w-3xl mx-auto px-4 py-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        
        {/* ABA 1: REGISTRO */}
        {activeTab === 'registro' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Cabecalho do Dia */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
              {/* Barra de progresso de background sutil */}
              <div 
                className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-1000 ease-out" 
                style={{ width: `${habitProgress}%` }}
              ></div>

              <div className="flex items-center justify-between">
                <button onClick={() => changeDate(-1)} className="p-3 hover:bg-slate-100 rounded-full transition-transform active:scale-90 text-slate-400 hover:text-slate-700">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">
                    {new Date(currentDate).toLocaleDateString('pt-BR', { weekday: 'long' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={currentDate}
                      onChange={(e) => {
                        setCurrentDate(e.target.value);
                        setCalendarViewDate(new Date(e.target.value));
                      }}
                      className="font-black text-3xl text-slate-800 bg-transparent border-none outline-none cursor-pointer tracking-tight"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => changeDate(1)} 
                  disabled={currentDate >= today}
                  className={`p-3 rounded-full transition-transform active:scale-90 ${currentDate >= today ? 'opacity-20 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Status do Dia */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-500">Hábitos Concluídos</span>
                  <span className="text-lg font-bold text-slate-800">{completedHabitsCount} de {HABITS.length}</span>
                </div>
                {currentEntry.isCompleted && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1.5 rounded-full text-sm font-bold animate-in zoom-in">
                    <CheckCircle2 className="w-4 h-4" /> Finalizado
                  </div>
                )}
              </div>
            </div>

            {/* Hábitos e Rotinas (Movido para cima por ser a ação mais rápida) */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                Rotina Diária
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {HABITS.map(habit => {
                  const Icon = habit.icon;
                  const isCompleted = currentEntry.habits[habit.id];
                  
                  return (
                    <button
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id)}
                      className={`relative overflow-hidden p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 transform active:scale-95 ${
                        isCompleted 
                          ? `${habit.active} shadow-md` 
                          : 'bg-white border-slate-100 hover:border-indigo-100 text-slate-500 hover:text-indigo-600 shadow-sm'
                      }`}
                    >
                      <Icon className={`w-7 h-7 transition-transform ${isCompleted ? 'scale-110' : ''}`} />
                      <span className="font-semibold text-sm">{habit.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Métricas Diárias */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Métricas Pessoais
              </h2>
              
              <div className="space-y-8">
                {/* Produtividade */}
                <div className="bg-slate-50 p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="font-bold text-slate-700">Produtividade</label>
                    <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1">
                      <input 
                        type="number" min="0" max="10" step="0.1"
                        value={currentEntry.metrics.productivity}
                        onChange={(e) => handleMetricChange('productivity', e.target.value)}
                        className="w-12 text-right font-black text-indigo-600 bg-transparent outline-none"
                      />
                      <span className="font-bold text-slate-400">/10</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.1"
                    value={currentEntry.metrics.productivity || 0}
                    onChange={(e) => handleMetricChange('productivity', e.target.value)}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                {/* Estresse */}
                <div className="bg-slate-50 p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="font-bold text-slate-700">Estresse</label>
                    <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1">
                      <input 
                        type="number" min="0" max="10" step="0.1"
                        value={currentEntry.metrics.stress}
                        onChange={(e) => handleMetricChange('stress', e.target.value)}
                        className="w-12 text-right font-black text-rose-500 bg-transparent outline-none"
                      />
                      <span className="font-bold text-slate-400">/10</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.1"
                    value={currentEntry.metrics.stress || 0}
                    onChange={(e) => handleMetricChange('stress', e.target.value)}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100"
                  />
                </div>

                {/* Sono */}
                <div className="bg-slate-50 p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="font-bold text-slate-700">Sono</label>
                    <div className="flex items-center gap-2">
                      <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center">
                        <input 
                          type="number" min="0" max="24" step="1"
                          value={Math.floor(currentEntry.metrics.sleep || 0)}
                          onChange={(e) => handleSleepTimeChange('hours', e.target.value)}
                          className="w-10 text-right font-black text-blue-500 bg-transparent outline-none"
                        />
                        <span className="font-bold text-slate-400 pr-1">h</span>
                      </div>
                      <span className="text-slate-300 font-bold">:</span>
                      <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center">
                        <input 
                          type="number" min="0" max="59" step="1"
                          value={Math.round(((currentEntry.metrics.sleep || 0) - Math.floor(currentEntry.metrics.sleep || 0)) * 60)}
                          onChange={(e) => handleSleepTimeChange('minutes', e.target.value)}
                          className="w-10 text-right font-black text-blue-500 bg-transparent outline-none"
                        />
                        <span className="font-bold text-slate-400 pr-1">m</span>
                      </div>
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max={16 * 60} step="1"
                    value={Math.round((currentEntry.metrics.sleep || 0) * 60)}
                    onChange={(e) => handleMetricChange('sleep', Number(e.target.value) / 60)}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </section>

            {/* BOTÃO DE CHECK GERAL DO DIA */}
            <div className="pt-2 pb-6">
              <button
                onClick={toggleDayCompletion}
                className={`w-full py-5 rounded-3xl font-black text-lg tracking-wide flex justify-center items-center gap-3 transition-all duration-300 transform active:scale-95 ${
                  currentEntry.isCompleted 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl shadow-green-200 border-none' 
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'
                }`}
              >
                <CheckCircle2 className={`w-7 h-7 ${currentEntry.isCompleted ? 'text-white' : 'text-slate-400'}`} />
                {currentEntry.isCompleted ? 'DIA CONCLUÍDO' : 'FECHAR O DIA'}
              </button>
            </div>

          </div>
        )}

        {/* ABA 2: CALENDÁRIO */}
        {activeTab === 'calendario' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* O calendário original, mas com bordas mais arredondadas e sombras melhores */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <button onClick={prevMonth} className="p-3 hover:bg-slate-100 rounded-full transition-colors bg-slate-50 text-slate-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight">
                  {MONTH_NAMES[calendarViewDate.getMonth()]} <span className="text-indigo-500">{calendarViewDate.getFullYear()}</span>
                </h2>
                <button onClick={nextMonth} className="p-3 hover:bg-slate-100 rounded-full transition-colors bg-slate-50 text-slate-600">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-3">
                {WEEK_DAYS.map(day => (
                  <div key={day} className="text-center font-bold text-xs text-slate-400 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`blank-${i}`} className="aspect-square"></div>
                ))}
                
                {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const dStr = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isFuture = dStr > today;
                  const entryForDay = entries[dStr];
                  const isSelected = dStr === currentDate;
                  
                  let bgColor = 'bg-slate-50/50 text-slate-400'; 
                  
                  if (!isFuture) {
                    if (entryForDay && entryForDay.isCompleted) {
                      bgColor = 'bg-green-500 text-white shadow-md shadow-green-200 font-bold'; 
                    } else {
                      bgColor = 'bg-rose-50 text-rose-500 border border-rose-100 font-bold hover:bg-rose-100'; 
                    }
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => goToDateFromCalendar(dStr)}
                      disabled={isFuture}
                      className={`
                        aspect-square rounded-2xl flex items-center justify-center text-sm transition-all transform active:scale-90
                        ${bgColor}
                        ${isSelected && !isFuture ? 'ring-4 ring-indigo-500 ring-offset-2 scale-110 z-10' : ''}
                        ${isFuture ? 'opacity-50 cursor-not-allowed border border-slate-100' : 'cursor-pointer'}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-8 flex justify-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div> Concluído
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-50 border border-rose-200"></div> Pendente
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: ESTATÍSTICAS */}
        {activeTab === 'estatisticas' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Insights Mensais e Semanais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 rounded-3xl shadow-md shadow-teal-100 text-white relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="flex items-center gap-2 mb-4 opacity-90">
                  <h3 className="font-bold text-sm uppercase tracking-widest">Semanal</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-1 relative z-10">
                  <span className="text-5xl font-black tracking-tighter">{habitInsights.weeklyImprovement > 0 ? '+' : ''}{habitInsights.weeklyImprovement}%</span>
                </div>
                <p className="text-teal-50 text-sm font-medium relative z-10">
                  {habitInsights.totalThisWeek} hábitos (vs {habitInsights.totalLastWeek} anterior)
                </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-3xl shadow-md shadow-indigo-100 text-white relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="flex items-center gap-2 mb-4 opacity-90">
                  <h3 className="font-bold text-sm uppercase tracking-widest">Mensal</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-1 relative z-10">
                  <span className="text-5xl font-black tracking-tighter">{habitInsights.improvement > 0 ? '+' : ''}{habitInsights.improvement}%</span>
                </div>
                <p className="text-indigo-100 text-sm font-medium relative z-10">
                  {habitInsights.totalThisMonth} hábitos (vs {habitInsights.totalLastMonth} anterior)
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                  <Trophy className="w-5 h-5" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">O Campeão</h3>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className={`p-4 rounded-2xl ${habitInsights.topHabit.active} shadow-md`}>
                    <habitInsights.topHabit.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="block text-xl font-black text-slate-800 leading-tight">{habitInsights.topHabit.label}</span>
                    <span className="text-slate-500 font-medium text-sm">{habitInsights.topHabitCount} dias no mês</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequência Semanal */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-800">
                <History className="w-5 h-5 text-indigo-500" />
                Consistência da Semana
              </h2>
              
              <div className="space-y-5">
                {HABITS.map(habit => {
                  const count = habitInsights.weekly[habit.id];
                  const percentage = (count / 7) * 100;
                  const Icon = habit.icon;
                  
                  return (
                    <div key={habit.id} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${count > 0 ? habit.color : 'bg-slate-50 text-slate-300'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-bold text-slate-700">{habit.label}</span>
                          <span className="text-sm font-black text-slate-400">{count}/7</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${habit.active.split(' ')[0]}`} 
                            style={{ width: `${percentage}%`, backgroundColor: count > 0 ? undefined : 'transparent' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráficos */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-black mb-8 text-slate-800">Qualidade de Vida</h2>
              
              <div className="mb-12">
                <h3 className="font-bold text-slate-500 text-sm uppercase tracking-widest mb-6">Produtividade x Estresse</h3>
                <div className="h-48 border-b border-slate-200 pb-2">
                  <div className="relative w-full h-full flex items-end justify-between gap-2">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                      <div className="border-t border-slate-400 w-full"></div>
                      <div className="border-t border-slate-400 w-full"></div>
                      <div className="border-t border-slate-400 w-full"></div>
                    </div>
                    
                    <div className="absolute left-0 right-0 border-t-4 border-indigo-500 border-solid z-0 opacity-30 pointer-events-none" style={{ bottom: `${Math.min((metricInsights.thisMonth.productivity / 10) * 100, 100)}%` }}></div>
                    <div className="absolute left-0 right-0 border-t-2 border-indigo-400 border-dotted z-0 opacity-80 pointer-events-none" style={{ bottom: `${Math.min((metricInsights.lastMonth.productivity / 10) * 100, 100)}%` }}></div>
                    
                    <div className="absolute left-0 right-0 border-t-4 border-rose-500 border-dashed z-0 opacity-40 pointer-events-none" style={{ bottom: `${Math.min((metricInsights.thisMonth.stress / 10) * 100, 100)}%` }}></div>
                    <div className="absolute left-0 right-0 border-t-2 border-rose-400 border-dotted z-0 opacity-80 pointer-events-none" style={{ bottom: `${Math.min((metricInsights.lastMonth.stress / 10) * 100, 100)}%` }}></div>

                    {chartData.map((day, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1 h-full z-10 group relative">
                        <div className="flex items-end gap-1 w-full justify-center h-full">
                          <div 
                            className="w-1/3 bg-indigo-500 rounded-t-md transition-all duration-500"
                            style={{ height: `${Math.min((day.productivity / 10) * 100, 100)}%`, minHeight: day.productivity > 0 ? '4px' : '0' }}
                          ></div>
                          <div 
                            className="w-1/3 bg-rose-400 rounded-t-md transition-all duration-500"
                            style={{ height: `${Math.min((day.stress / 10) * 100, 100)}%`, minHeight: day.stress > 0 ? '4px' : '0' }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 mt-2">{day.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 mt-6 text-xs font-bold text-slate-500">
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                    <span className="flex items-center gap-2"><span className="w-6 border-t-4 border-solid border-indigo-500 opacity-40"></span> Produtividade Atual</span>
                    <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dotted border-indigo-400 opacity-80"></span> Anterior</span>
                    <span className="flex items-center gap-2"><span className="w-6 border-t-4 border-dashed border-rose-500 opacity-50"></span> Estresse Atual</span>
                    <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dotted border-rose-400 opacity-80"></span> Anterior</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-500 text-sm uppercase tracking-widest mb-6">Horas de Sono</h3>
                <div className="h-40 border-b border-slate-200 pb-2">
                  <div className="relative w-full h-full flex items-end justify-between gap-2">
                    
                    <div className="absolute left-0 right-0 border-t-4 border-blue-500 border-solid z-0 opacity-30 pointer-events-none" style={{ bottom: `${Math.min((metricInsights.thisMonth.sleep / 12) * 100, 100)}%` }}></div>
                    <div className="absolute left-0 right-0 border-t-2 border-blue-400 border-dotted z-0 opacity-80 pointer-events-none" style={{ bottom: `${Math.min((metricInsights.lastMonth.sleep / 12) * 100, 100)}%` }}></div>

                    {chartData.map((day, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full z-10 group">
                        <div 
                          className="w-full max-w-[2rem] bg-gradient-to-t from-blue-300 to-blue-400 rounded-t-xl transition-all duration-500 relative shadow-sm"
                          style={{ height: `${Math.min((day.sleep / 12) * 100, 100)}%`, minHeight: day.sleep > 0 ? '4px' : '0' }}
                        >
                           <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatSleepDisplay(day.sleep)}
                           </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 mt-2">{day.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-2"><span className="w-6 border-t-4 border-solid border-blue-500 opacity-40"></span> Atual ({formatSleepDisplay(metricInsights.thisMonth.sleep)})</span>
                  <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dotted border-blue-400 opacity-80"></span> Anterior ({formatSleepDisplay(metricInsights.lastMonth.sleep)})</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR (ESTILO APP NATIVO) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex justify-between items-center">
          
          <button 
            onClick={() => setActiveTab('registro')}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'registro' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'registro' ? 'bg-indigo-50 scale-110' : ''}`}>
              <CheckSquare className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === 'registro' ? 'text-indigo-600' : 'text-slate-500'}`}>Hoje</span>
          </button>

          <button 
            onClick={() => setActiveTab('calendario')}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'calendario' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'calendario' ? 'bg-indigo-50 scale-110' : ''}`}>
              <CalendarIcon className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === 'calendario' ? 'text-indigo-600' : 'text-slate-500'}`}>Agenda</span>
          </button>

          <button 
            onClick={() => setActiveTab('estatisticas')}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'estatisticas' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'estatisticas' ? 'bg-indigo-50 scale-110' : ''}`}>
              <PieChart className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === 'estatisticas' ? 'text-indigo-600' : 'text-slate-500'}`}>Métricas</span>
          </button>

        </div>
      </nav>
    </div>
  );
}
