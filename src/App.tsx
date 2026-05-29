import { useState, useEffect, useRef } from 'react';
import {
  IonApp, IonContent, IonHeader, IonToolbar, IonFooter,
  IonTabBar, IonTabButton, IonIcon, IonLabel, IonButton,
  setupIonicReact
} from '@ionic/react';
import {
  homeOutline, barChartOutline, timeOutline, trophyOutline,
  bookOutline, timerOutline, trendingUpOutline
} from 'ionicons/icons';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

import { db, auth } from './firebase';
import { signOut } from 'firebase/auth';
import AuthGate from './auth/AuthGate';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

setupIonicReact();

const LABELS = ['A', 'B', 'C', 'D'];
type TabView = 'dashboard' | 'progress' | 'history' | 'badges';
type AppView = TabView | 'difficulty' | 'quiz' | 'results' | 'study-list' | 'study-read';

// ─── APP ──────────────────────────────────────────────────────────────────────
const AppInner: React.FC = () => {
  const [view, setView]           = useState<AppView>('dashboard');
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const goTab = (tab: TabView) => { setActiveTab(tab); setView(tab); };
  const showTabs = ['dashboard', 'progress', 'history', 'badges'].includes(view);

  return (
    <IonApp>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#FFFFFF', '--border-width': '0' } as any}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#E25A53', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IonIcon icon={bookOutline} style={{ color: 'white', fontSize: '18px' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#2d2d2d', fontSize: '14px', lineHeight: 1.2 }}>LET Review</div>
                <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Path to Success</div>
              </div>
            </div>
            <IonButton
              fill="clear"
              color="medium"
              style={{ fontWeight: 700, fontSize: '11px' }}
              onClick={() => signOut(auth)}
            >
              Exit
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#EBE9E1' } as any}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
          {view === 'dashboard' && <DashboardView
            onStart={(category) => {
              setSelectedCategory(category);
              setView('difficulty');
            }}
            onStudy={(category) => {
              setSelectedCategory(category);
              setView('study-list');
            }}
          />}
          {view === 'progress'  && <ProgressView />}
          {view === 'history' && <HistoryView />}
          {view === 'badges' && <BadgesView />}
          {view === 'study-list' && (
            <StudyListView
              category={selectedCategory}
              onSelect={(module) => {
                setSelectedModule(module);
                setView('study-read');
              }}
              onBack={() => goTab('dashboard')}
            />
          )}
          {view === 'study-read' && (
            <StudyReadView
              module={selectedModule}
              onBack={() => setView('study-list')}
              onPractice={() => {
                setSelectedDifficulty('all');
                setView('quiz');
              }}
            />
          )}
          {view === 'difficulty' && (
            <DifficultyView
              category={selectedCategory}
              onSelect={(difficulty) => {
                setSelectedDifficulty(difficulty);
                setView('quiz');
              }}
              onBack={() => goTab('dashboard')}
            />
          )}
          {view === 'quiz' && (
            <QuizView
              category={selectedCategory}
              difficulty={selectedDifficulty}
              onFinish={(answers, questions) => {
                setQuizAnswers(answers);
                setQuizQuestions(questions);
                setView('results');
              }}
              onExit={() => goTab('dashboard')}
            />
          )}
          {view === 'results' && (
            <ResultsView
              answers={quizAnswers}
              questions={quizQuestions}
              onBack={() => goTab('dashboard')}
              onRetry={() => {
                setQuizAnswers([]);
                setView('quiz');
              }}
            />
          )}
        </div>
      </IonContent>

      {showTabs && (
        <IonFooter className="ion-no-border">
          <IonTabBar slot="bottom" style={{ '--background': '#fff', borderTop: '1px solid #eee', paddingTop: '4px', paddingBottom: '4px' } as any}>
            {([
              { tab: 'dashboard' as TabView, icon: homeOutline,     label: 'Home'     },
              { tab: 'progress'  as TabView, icon: barChartOutline, label: 'Progress' },
              { tab: 'history'   as TabView, icon: timeOutline,     label: 'History'  },
              { tab: 'badges'    as TabView, icon: trophyOutline,   label: 'Badges'   },
            ]).map(({ tab, icon, label }) => (
              <IonTabButton
                key={tab} tab={tab}
                selected={activeTab === tab}
                onClick={() => goTab(tab)}
                style={{ '--color-selected': '#E25A53', '--color': '#ccc' } as any}
              >
                <IonIcon icon={icon} />
                <IonLabel style={{ fontSize: '10px', fontWeight: 700 }}>{label}</IonLabel>
              </IonTabButton>
            ))}
          </IonTabBar>
        </IonFooter>
      )}
    </IonApp>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const DashboardView: React.FC<{ onStart: (category: string) => void; onStudy: (category: string) => void }> = ({ onStart, onStudy }) => {
  const [stats, setStats] = useState<{ totalAttempts: number; avgScore: number }>({ totalAttempts: 0, avgScore: 0 });
  const [catStats, setCatStats] = useState<Record<string, { attempts: number; avg: string; best: string }>>({});
  const [availableCategories, setAvailableCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const uid = (auth as any)?.currentUser?.uid;

        // Load quiz results for stats (per user)
        const snap = await getDocs(query(collection(db, 'results'), where('uid', '==', uid)));
        const results = snap.docs.map(d => d.data() as { category: string; score: number });

        if (results.length > 0) {
          const totalAttempts = results.length;
          const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / totalAttempts);

          const byCategory: Record<string, number[]> = {};
          results.forEach(r => {
            if (!byCategory[r.category]) byCategory[r.category] = [];
            byCategory[r.category].push(r.score);
          });
          const built: Record<string, { attempts: number; avg: string; best: string }> = {};
          Object.entries(byCategory).forEach(([cat, scores]) => {
            built[cat] = {
              attempts: scores.length,
              avg: `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`,
              best: `${Math.max(...scores)}%`,
            };
          });

          setStats({ totalAttempts, avgScore });
          setCatStats(built);
        }

        // Check which categories have questions available
        const qSnap = await getDocs(collection(db, 'questions'));
        const cats = new Set<string>();
        qSnap.docs.forEach(d => {
          const cat = d.data().category;
          if (cat) cats.add(cat);
        });
        setAvailableCategories(cats);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };
    load();
  }, []);

  const getStats = (cat: string) =>
    catStats[cat] ?? { attempts: 0, avg: '0%', best: '0%' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px 28px', border: '1px solid rgba(255,255,255,0.8)' }}>
      <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#333', margin: 0 }}>Welcome Back!</h2>
      <p style={{ color: '#aaa', fontWeight: 600, marginTop: '4px', marginBottom: 0, fontSize: '13px' }}>
        Ready to continue your LET preparation journey?
      </p>
    </div>

    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ flex: '0 0 58%', background: '#E25A53', borderRadius: '24px', padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
            <IonIcon icon={timerOutline} style={{ fontSize: '20px' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', lineHeight: 1.2 }}>Exam Simulation</span>
        </div>
        <p style={{ fontSize: '11px', opacity: 0.9, margin: 0, lineHeight: 1.5 }}>
          Experience the real LET exam with timed questions from all categories.
        </p>
      </div>
      <div style={{ flex: 1, background: '#fff', borderRadius: '24px', padding: '16px', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{ background: 'rgba(226,90,83,0.1)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <IonIcon icon={trendingUpOutline} style={{ color: '#E25A53', fontSize: '16px' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#333', textTransform: 'uppercase' }}>Quick Stats</div>
            <div style={{ fontSize: '8px', color: '#bbb', fontWeight: 700, textTransform: 'uppercase' }}>Your progress overview</div>
          </div>
        </div>
        <div style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#000000', fontWeight: 700, textTransform: 'uppercase' }}>Total Attempts</span>
          <span style={{ fontWeight: 900, color: '#333', fontSize: '13px' }}>{stats.totalAttempts}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#000000', fontWeight: 700, textTransform: 'uppercase' }}>Average Score</span>
          <span style={{ fontWeight: 900, color: '#E25A53', fontSize: '18px' }}>{stats.totalAttempts > 0 ? `${stats.avgScore}%` : '—'}</span>
        </div>
      </div>
    </div>

    <div style={{ fontSize: '11px', fontWeight: 900, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.18em', paddingLeft: '4px' }}>
      Review by Category
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <CategoryCard title="General Education"     subtitle="Foundation of teaching principles" emoji="📚" color="#E25A53" stats={getStats('General Education')} onStart={() => onStart('General Education')} onStudy={() => onStudy('General Education')} disabled={!availableCategories.has('General Education')} />
      <CategoryCard title="Professional Education" subtitle="Teaching methods and strategies"   emoji="🎓" color="#E25A53" stats={getStats('Professional Education')} onStart={() => onStart('Professional Education')} onStudy={() => onStudy('Professional Education')} disabled={!availableCategories.has('Professional Education')} />
      <CategoryCard title="Major/Specialization"  subtitle="Subject matter expertise"           emoji="⭐" color="#C9C2A8" stats={getStats('Major/Specialization')} onStart={() => onStart('Major/Specialization')} onStudy={() => onStudy('Major/Specialization')} disabled={!availableCategories.has('Major/Specialization')} />
    </div>
    </div>
  );
};

const CategoryCard = ({ title, subtitle, color, emoji, stats, onStart, onStudy, disabled }: any) => (
  <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.8)' }}>
    <div style={{ background: color, padding: '16px 20px' }}>
      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{emoji}</div>
      <div style={{ fontWeight: 900, fontSize: '14px', color: '#fff', lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>{subtitle}</div>
    </div>
    <div style={{ padding: '14px 16px', background: '#fafaf8' }}>
      <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '10px', padding: '8px 12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: '#000000', fontWeight: 700, textTransform: 'uppercase' }}>Attempts</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#555' }}>{stats.attempts > 0 ? stats.attempts : 'No attempts yet'}</span>
      </div>
      {stats.attempts > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: '9px', color: '#000000', fontWeight: 700, textTransform: 'uppercase' }}>Avg Score</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#E25A53' }}>{stats.avg}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: '#000000', fontWeight: 700, textTransform: 'uppercase' }}>Best Score</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#E25A53' }}>{stats.best}</span>
          </div>
        </>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        <button onClick={onStudy} style={{ width: '100%', background: '#EBE9E1', border: 'none', borderRadius: '16px', padding: '12px', fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase', cursor: 'pointer' }}>Study Mode</button>
        <button onClick={disabled ? undefined : onStart} style={{ width: '100%', background: disabled ? '#C9C2A8' : '#E25A53', border: 'none', borderRadius: '16px', padding: '12px', fontSize: '10px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : '0 4px 12px rgba(226,90,83,0.25)' }}>Take Quiz</button>
      </div>
    </div>
  </div>
);

// ─── PROGRESS VIEW ────────────────────────────────────────────────────────────
const ProgressView: React.FC = () => {
  const [categoryStats, setCategoryStats] = useState<Array<{
    name: string; tag: string; attempts: number; avg: number; best: number; lastDate: string;
  }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = (auth as any)?.currentUser?.uid;
        const snap = await getDocs(query(collection(db, 'results'), where('uid', '==', uid)));
        const results = snap.docs.map(d => {
          const data = d.data();

          return {
            category: data.category as string,
            score: data.score as number,
            timestamp: data.timestamp,
          };
        });

        // Group by category
        const byCategory: Record<string, { scores: number[]; lastDate: string }> = {};
        results.forEach(r => {
          if (!byCategory[r.category]) byCategory[r.category] = { scores: [], lastDate: '' };
          byCategory[r.category].scores.push(r.score);
          if (r.timestamp?.toDate) {
            const d = r.timestamp.toDate() as Date;
            const formatted = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
            byCategory[r.category].lastDate = formatted;
          }
        });

        const built = Object.entries(byCategory).map(([name, { scores, lastDate }]) => {
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          const best = Math.max(...scores);
          const tag = avg >= 75 ? 'Strong' : avg >= 50 ? 'Moderate' : 'Weak';
          return { name, tag, attempts: scores.length, avg, best, lastDate };
        });

        setCategoryStats(built);
      } catch (err) {
        console.error('Failed to load progress:', err);
      }
    };
    load();
  }, []);

  const totalAttempts     = categoryStats.reduce((s, c) => s + c.attempts, 0);
  const overallAvg        = categoryStats.length
    ? Math.round(categoryStats.reduce((s, c) => s + c.avg, 0) / categoryStats.length)
    : 0;
  const categoriesStudied = categoryStats.length;

  const strong   = categoryStats.filter(c => c.avg >= 75).map(c => c.name);
  const moderate = categoryStats.filter(c => c.avg >= 50 && c.avg < 75).map(c => c.name);
  const weak     = categoryStats.filter(c => c.avg < 50).map(c => c.name);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Progress Tracking card */}
      <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#2d2d2d', margin: '0 0 16px' }}>Progress Tracking</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatCard label="Total Attempts"     value={String(totalAttempts)}    color="#4F62E5" bg="rgba(79,98,229,0.08)"  icon="📘" />
          <StatCard label="Overall Average"    value={`${overallAvg}%`}         color="#22A06B" bg="rgba(34,160,107,0.08)" icon="📈" />
          <StatCard label="Categories Studied" value={String(categoriesStudied)} color="#9061F9" bg="rgba(144,97,249,0.08)" icon="🎯" />
        </div>
      </div>

      {/* Performance by Category */}
      <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#2d2d2d', margin: '0 0 18px' }}>Performance by Category</h2>
        {categoryStats.length === 0
          ? <p style={{ color: '#aaa', fontSize: '13px' }}>No quiz attempts yet.</p>
          : categoryStats.map((cat, i) => (
          <div key={cat.name}>
            {i > 0 && <div style={{ height: '1px', background: '#f0f0f0', margin: '18px 0' }} />}
            <CategoryPerformance cat={cat} />
          </div>
        ))}
      </div>

      {/* Strength Analysis */}
      <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#2d2d2d', margin: '0 0 16px' }}>Strength Analysis</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <StrengthBox title="Strong Areas"      color="#22A06B" bg="rgba(34,160,107,0.07)"  border="rgba(34,160,107,0.25)"  items={strong}   emptyText="No strong areas yet. Keep practicing!" />
          <StrengthBox title="Moderate Areas"    color="#4F62E5" bg="rgba(79,98,229,0.07)"   border="rgba(79,98,229,0.25)"   items={moderate} emptyText="None" />
          <StrengthBox title="Needs Improvement" color="#E25A53" bg="rgba(226,90,83,0.07)"   border="rgba(226,90,83,0.25)"   items={weak}     emptyText="None" />
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: string; bg: string; icon: string }> = ({ label, value, color, bg, icon }) => (
  <div style={{ flex: 1, background: bg, borderRadius: '16px', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <span style={{ fontSize: '9px', fontWeight: 800, color, textTransform: 'uppercase', lineHeight: 1.2 }}>{label}</span>
    </div>
    <span style={{ fontSize: '22px', fontWeight: 900, color: '#2d2d2d' }}>{value}</span>
  </div>
);

const CategoryPerformance: React.FC<{ cat: { name: string; tag: string; attempts: number; avg: number; best: number; lastDate: string } }> = ({ cat }) => (
  <div>
    {/* Header row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#2d2d2d' }}>{cat.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{ background: '#FDECEA', color: '#E25A53', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>{cat.tag}</span>
          <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 600 }}>{cat.attempts} attempt{cat.attempts !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '20px', fontWeight: 900, color: '#4F62E5' }}>{cat.avg}%</div>
        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 600 }}>avg score</div>
      </div>
    </div>

    {/* Best / Last row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
      <div>
        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>Best Score</div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#E25A53' }}>{cat.best}%</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>Last Attempt</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>{cat.lastDate}</div>
      </div>
    </div>

    {/* Progress bar */}
    <div style={{ background: '#EBE9E1', borderRadius: '99px', height: '6px', overflow: 'hidden', marginBottom: '12px' }}>
      <div style={{ width: `${cat.avg}%`, height: '100%', background: 'linear-gradient(90deg, #4F62E5, #7B8FF5)', borderRadius: '99px' }} />
    </div>

    {/* Recommendation */}
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
      <span style={{ fontSize: '13px' }}>💡</span>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#555' }}>Recommendation</div>
        <div style={{ fontSize: '11px', color: '#E25A53', fontWeight: 700, marginTop: '2px' }}>
          Needs improvement. Review materials more.
        </div>
      </div>
    </div>
  </div>
);

const StrengthBox: React.FC<{ title: string; color: string; bg: string; border: string; items: string[]; emptyText: string }> = ({ title, color, bg, border, items, emptyText }) => (
  <div style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '12px 10px' }}>
    <div style={{ fontSize: '10px', fontWeight: 900, color, marginBottom: '8px', textTransform: 'uppercase', lineHeight: 1.3 }}>{title}</div>
    {items.length === 0
      ? <p style={{ fontSize: '10px', color, fontStyle: 'italic', margin: 0, lineHeight: 1.4, opacity: 0.8 }}>{emptyText}</p>
      : items.map(item => <div key={item} style={{ fontSize: '10px', color: '#444', fontWeight: 600, marginBottom: '4px' }}>• {item}</div>)
    }
  </div>
);

// ─── STUDY LIST VIEW ─────────────────────────────────────────────────────────
const StudyListView: React.FC<{
  category: string;
  onSelect: (module: any) => void;
  onBack: () => void;
}> = ({ category, onSelect, onBack }) => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'modules'));
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((m: any) => m.category === category);
        setModules(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '20px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, color: '#777', cursor: 'pointer' }}>
        ← Back
      </button>

      <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
        <span style={{ background: '#4F62E5', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
          📖 Study Mode
        </span>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#2d2d2d', margin: '10px 0 4px' }}>{category}</h2>
        <p style={{ fontSize: '12px', color: '#aaa', fontWeight: 600, margin: 0 }}>Select a module to start reading</p>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: '#aaa', fontSize: '13px' }}>Loading modules...</p>
        </div>
      ) : modules.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          <p style={{ color: '#aaa', fontSize: '13px', fontWeight: 600 }}>No study modules yet for this category.</p>
          <p style={{ color: '#bbb', fontSize: '11px', marginTop: '4px' }}>Check back after the admin publishes materials.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {modules.map((m: any) => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              {m.coverUrl ? (
                <img src={m.coverUrl} alt={m.title} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(79,98,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📄</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#2d2d2d', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{m.content?.slice(0, 80)}...</div>
              </div>
              <div style={{ color: '#4F62E5', fontSize: '18px', flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── STUDY READ VIEW ─────────────────────────────────────────────────────────
const StudyReadView: React.FC<{
  module: any;
  onBack: () => void;
  onPractice: () => void;
}> = ({ module, onBack, onPractice }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '20px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, color: '#777', cursor: 'pointer' }}>
      ← Back to Modules
    </button>

    {/* Cover image */}
    {module.coverUrl && (
      <img src={module.coverUrl} alt={module.title} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '24px' }} />
    )}

    {/* Header */}
    <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
      <span style={{ background: '#4F62E5', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
        {module.category}
      </span>
      <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#2d2d2d', margin: '12px 0 0' }}>{module.title}</h2>
    </div>

    {/* Content */}
    <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Study Material</h3>
      <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{module.content}</p>
    </div>

    {/* Practice Quiz CTA */}
    <div style={{ background: 'linear-gradient(135deg, #4F62E5, #7B8FF5)', borderRadius: '24px', padding: '24px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>✏️</div>
      <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Ready to Practice?</h3>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px', fontWeight: 600 }}>
        Test your understanding with practice questions about this topic.
      </p>
      <button
        onClick={onPractice}
        style={{ background: '#fff', border: 'none', borderRadius: '16px', padding: '13px 32px', fontSize: '13px', fontWeight: 900, color: '#4F62E5', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
      >
        Take Practice Quiz
      </button>
    </div>
  </div>
);

// ─── DIFFICULTY VIEW ─────────────────────────────────────────────────────────
const DIFFICULTIES = [
  { key: 'all',    label: 'All Levels',  desc: 'Mix of easy, medium, and hard',  emoji: '🎯', color: '#4F62E5' },
  { key: 'easy',   label: 'Easy',        desc: 'Great for beginners',             emoji: '🟢', color: '#22A06B' },
  { key: 'medium', label: 'Medium',      desc: 'Moderate challenge',              emoji: '🟡', color: '#F59E0B' },
  { key: 'hard',   label: 'Hard',        desc: 'Advanced level questions',        emoji: '🔴', color: '#E25A53' },
];

const DifficultyView: React.FC<{
  category: string;
  onSelect: (difficulty: string) => void;
  onBack: () => void;
}> = ({ category, onSelect, onBack }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <button
      onClick={onBack}
      style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '20px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, color: '#777', cursor: 'pointer' }}
    >
      ← Back
    </button>

    <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
      <span style={{ background: '#E25A53', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
        {category}
      </span>
      <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#2d2d2d', margin: '12px 0 4px' }}>Select Difficulty</h2>
      <p style={{ fontSize: '12px', color: '#aaa', fontWeight: 600, margin: 0 }}>Choose your challenge level</p>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {DIFFICULTIES.map(({ key, label, desc, emoji, color }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: '#fff', border: '1px solid rgba(255,255,255,0.8)',
            borderRadius: '20px', padding: '18px 20px', cursor: 'pointer',
            textAlign: 'left', width: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: `${color}18`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '22px', flexShrink: 0,
          }}>
            {emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#2d2d2d' }}>{label}</div>
            <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 600, marginTop: '2px' }}>{desc}</div>
          </div>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontSize: '14px', flexShrink: 0,
          }}>›</div>
        </button>
      ))}
    </div>
  </div>
);

const ExamTimer: React.FC<{
  totalSeconds: number;
  onTimeUp: () => void;
}> = ({ totalSeconds, onTimeUp }) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const pct        = (remaining / totalSeconds) * 100;
  const isWarning  = remaining <= totalSeconds * 0.2;
  const isCritical = remaining <= 60;

  return (
    <div style={{
      background: isCritical ? '#FEE2E2' : isWarning ? '#FEF9C3' : '#EEF2FF',
      border: `1.5px solid ${isCritical ? '#FECACA' : isWarning ? '#FDE68A' : '#C7D2FE'}`,
      borderRadius: '16px', padding: '10px 16px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: isCritical ? '#DC2626' : isWarning ? '#B45309' : '#4338CA', textTransform: 'uppercase' }}>
          {isCritical ? '🚨 Time almost up!' : isWarning ? '⚠️ Running low' : '⏱️ Time Remaining'}
        </span>
        <span style={{ fontSize: '22px', fontWeight: 900, color: isCritical ? '#DC2626' : isWarning ? '#B45309' : '#4F62E5', fontVariantNumeric: 'tabular-nums' }}>
          {pad(minutes)}:{pad(seconds)}
        </span>
      </div>
      <div style={{ height: '5px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '99px', transition: 'width 1s linear',
          background: isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#4F62E5',
        }} />
      </div>
    </div>
  );
};

// ─── QUIZ VIEW ────────────────────────────────────────────────────────────────
const QuizView: React.FC<{ 
  category: string;
  difficulty: string;
  onFinish: (answers: (number | null)[], questions: any[]) => void; 
  onExit: () => void 
}> = ({ category, difficulty, onFinish, onExit }) => {

  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>([]);
  const selectedRef = useRef<(number | null)[]>([]);

  // Keep ref in sync with state so ExamTimer's onTimeUp always sees latest answers
  const handleSelect = (i: number) => {
    const updated = [...selectedRef.current];
    updated[current] = i;
    selectedRef.current = updated;
    setSelected(updated);
  };

  const [secondsPerQuestion, setSecondsPerQuestion] = useState(30);
  const QUIZ_DURATION_SECONDS = secondsPerQuestion * (quizQuestions.length || 10);
  const handleTimeUp = () => onFinish(selectedRef.current, quizQuestions);

  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'quiz'));
        if (snap.exists()) {
          const data = snap.data();
          const keyMap: Record<string, string> = {
            'General Education': 'generalEd',
            'Professional Education': 'profEd',
            'Major/Specialization': 'major',
          };
          const key = keyMap[category];
          if (key && data[key]) setSecondsPerQuestion(data[key]);
        }
      } catch (err) {
        console.error('Could not fetch timer:', err);
      }
    };
    fetchTimer();
  }, [category]);

  useEffect(() => {
    // ─── SYNC LOGIC ───────────────────────────────────────────────────────────
    // 1. Check local version vs Firestore version
    // 2. If newer version available, download published_content/latest
    // 3. Save to localStorage for offline use
    // 4. Always use locally cached questions (works offline after first sync)

    const STORAGE_KEY = 'let_published_content';
    const VERSION_KEY = 'let_content_version';

    // Web admin saves options as optionA/optionB/optionC/optionD (strings)
    // and answer as 'A'/'B'/'C'/'D' (string).
    // This normalizes both formats into options[] array and answer as index number.
    const normalizeQuestion = (d: any, id: string) => {
      let options: string[];
      if (Array.isArray(d.options) && d.options.length > 0) {
        // Already an array (future-proof)
        options = d.options;
      } else {
        // Web admin format: optionA, optionB, optionC, optionD
        options = [
          d.optionA ?? 'Option A',
          d.optionB ?? 'Option B',
          d.optionC ?? 'Option C',
          d.optionD ?? 'Option D',
        ];
      }

      let answer: number;
      if (typeof d.answer === 'number') {
        answer = d.answer;
      } else if (typeof d.answer === 'string') {
        // Web admin saves 'A', 'B', 'C', 'D'
        answer = ['A', 'B', 'C', 'D'].indexOf(d.answer.toUpperCase());
        if (answer === -1) answer = 0;
      } else {
        answer = 0;
      }

      if (answer < 0 || answer >= options.length) answer = 0;

      return {
        id: id ?? d.id ?? '',
        question: d.question ?? 'No question text provided',
        options,
        answer,
        explanation: d.explanation ?? 'No explanation available.',
        category: d.category ?? category,
        difficulty: d.difficulty ?? 'easy',
      };
    };

    const parseQuestions = (allQuestions: any[]) => {
      return allQuestions
        .filter((d: any) => {
          const catMatch = (d.category ?? '') === category;
          const diffMatch = difficulty === 'all' || (d.difficulty ?? 'easy') === difficulty;
          return catMatch && diffMatch;
        })
        .map((d: any) => normalizeQuestion(d, d.id ?? ''));
    };

    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const allQuestions = JSON.parse(cached);
          const data = parseQuestions(allQuestions);
          if (data.length > 0) {
            setQuizQuestions(data);
            selectedRef.current = Array(data.length).fill(null);
            setSelected(Array(data.length).fill(null));
            setError(null);
            return true;
          }
        }
      } catch { /* ignore parse errors */ }
      return false;
    };

    const fetchAndCache = async () => {
      try {
        setLoading(true);
        setError(null);

        // Download published_content/latest (synced by web admin)
        const publishedSnap = await getDoc(doc(db, 'published_content', 'latest'));

        if (publishedSnap.exists()) {
          const publishedData = publishedSnap.data();
          const allQuestions: any[] = publishedData.questions ?? [];

          // Save to localStorage for offline use
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allQuestions));
          localStorage.setItem(VERSION_KEY, String(publishedData.version ?? 1));

          const data = parseQuestions(allQuestions);
          if (data.length === 0) {
            setError(`No questions found for category: ${category}`);
          }
          setQuizQuestions(data);
          selectedRef.current = Array(data.length).fill(null);
          setSelected(Array(data.length).fill(null));
        } else {
          // published_content/latest doesn't exist yet — fallback to direct Firestore query
          const q = query(collection(db, 'questions'), where('category', '==', category));
          const snap = await getDocs(q);
          const allData = snap.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id }));
          const data = allData
            .filter((d: any) => difficulty === 'all' || (d.difficulty ?? 'easy') === difficulty)
            .map((d: any) => normalizeQuestion(d, d.id));
          if (data.length === 0) setError(`No questions found for category: ${category}`);
          setQuizQuestions(data);
          selectedRef.current = Array(data.length).fill(null);
          setSelected(Array(data.length).fill(null));
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        // Offline — try loading from cache
        const loaded = loadFromCache();
        if (!loaded) setError('No internet connection and no cached content available.');
      } finally {
        setLoading(false);
      }
    };

    // Load from cache immediately (instant, works offline)
    const hasCached = loadFromCache();
    if (hasCached) setLoading(false);

    // Then check if a newer version is available from Firestore
    const checkVersion = async () => {
      try {
        const syncSnap = await getDoc(doc(db, 'settings', 'sync'));
        if (!syncSnap.exists()) {
          // No sync doc yet — just fetch directly
          if (!hasCached) await fetchAndCache();
          return;
        }
        const remoteVersion = syncSnap.data().version ?? 1;
        const localVersion = parseInt(localStorage.getItem(VERSION_KEY) ?? '0');

        if (remoteVersion > localVersion || !hasCached) {
          // Newer version available — download and cache
          await fetchAndCache();
        }
      } catch {
        // Offline — already loaded from cache above
        if (!hasCached) {
          setError('No internet connection and no cached content available.');
          setLoading(false);
        }
      }
    };

    checkVersion();

    // Listen for sync signal — kapag nag-Sync Now ang admin, mag-a-update agad
    const unsubscribe = onSnapshot(doc(db, 'settings', 'sync'), (snap) => {
      if (!snap.exists()) return;
      const remoteVersion = snap.data().version ?? 1;
      const localVersion = parseInt(localStorage.getItem(VERSION_KEY) ?? '0');
      if (remoteVersion > localVersion) {
        fetchAndCache();
      }
    });

    return () => unsubscribe();
  }, [category, difficulty]);

  const q = quizQuestions?.[current];

  const isLast = current === quizQuestions.length - 1;
  const answered = selected.filter(a => a !== null).length;

  const handleNext = () => {
    if (isLast) {
      onFinish(selectedRef.current, quizQuestions);
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' }}>
        <p>Loading questions for {category}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#E25A53', marginBottom: '20px' }}>{error}</p>
        <button onClick={onExit} style={{ padding: '12px 24px', background: '#E25A53', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  if (!quizQuestions.length || !q) {
    return (
      <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' }}>
        <p>No questions available for this category.</p>
        <button onClick={onExit} style={{ padding: '12px 24px', background: '#E25A53', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '16px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onExit} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '20px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, color: '#777', cursor: 'pointer' }}>
          ← Exit Quiz
        </button>

        <span style={{ fontSize: '11px', fontWeight: 700, color: '#aaa' }}>
          Answered: {answered}/{quizQuestions.length}
        </span>
      </div>

      {/* Category + Difficulty Badges */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ background: '#E25A53', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
          {category}
        </span>
        <span style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
          background: difficulty === 'easy' ? '#dcfce7' : difficulty === 'medium' ? '#fef9c3' : difficulty === 'hard' ? '#fee2e2' : '#e0e7ff',
          color:      difficulty === 'easy' ? '#16a34a' : difficulty === 'medium' ? '#b45309' : difficulty === 'hard' ? '#dc2626' : '#4338ca',
        }}>
          {difficulty === 'all' ? '🎯 All Levels' : difficulty === 'easy' ? '🟢 Easy' : difficulty === 'medium' ? '🟡 Medium' : '🔴 Hard'}
        </span>
      </div>

      {quizQuestions.length > 0 && secondsPerQuestion > 0 && (
        <ExamTimer
          key={`${quizQuestions.length}-${secondsPerQuestion}`}
          totalSeconds={secondsPerQuestion * quizQuestions.length}
          onTimeUp={handleTimeUp}
        />
      )}

      <div style={{ background: '#fff', borderRadius: '24px', padding: '22px 20px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ background: 'rgba(226,90,83,0.12)', color: '#E25A53', padding: '5px 13px', borderRadius: '20px', fontSize: '10px', fontWeight: 900 }}>
            Question {current + 1} of {quizQuestions.length}
          </span>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '70%' }}>
            {quizQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: i === current ? '#E25A53' : selected[i] !== null ? '#f5c4c4' : '#EBE9E1',
                  color: i === current ? '#fff' : selected[i] !== null ? '#E25A53' : '#aaa'
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#2d2d2d', margin: '0 0 20px', lineHeight: 1.4 }}>
          {q.question}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options && q.options.map((opt: string, i: number) => {
            const isChosen = selected[current] === i;

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  padding: '13px 16px',
                  borderRadius: '14px',
                  border: isChosen ? '1.5px solid #E25A53' : '1px solid #ebebeb',
                  background: isChosen ? 'rgba(226,90,83,0.06)' : '#fafaf8',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <span style={{
                  minWidth: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: isChosen ? '#E25A53' : '#EBE9E1',
                  color: isChosen ? '#fff' : '#aaa'
                }}>
                  {LABELS[i]}
                </span>

                <span style={{ fontSize: '13px', fontWeight: 600, color: isChosen ? '#E25A53' : '#555', flex: 1 }}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          style={{ padding: '13px 28px', borderRadius: '14px', border: '1px solid #ddd', background: current === 0 ? '#EBE9E1' : '#fff', fontSize: '12px', fontWeight: 800, color: current === 0 ? '#ccc' : '#666', cursor: current === 0 ? 'default' : 'pointer' }}
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          style={{ padding: '13px 32px', borderRadius: '14px', border: 'none', background: '#E25A53', fontSize: '12px', fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(226,90,83,0.3)' }}
        >
          {isLast ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
};

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────
const ResultsView: React.FC<{
  answers: (number | null)[];
  questions: any[];
  onBack: () => void;
  onRetry: () => void;
}> = ({ answers, questions, onBack, onRetry }) => {

  const total = questions.length;

  const score = answers.filter(
    (ans, i) => ans === questions[i]?.answer
  ).length;

  const pct = total ? Math.round((score / total) * 100) : 0;

  const feedback =
    pct >= 75
      ? 'Great job! Keep it up!'
      : pct >= 50
      ? 'Good job! Room for improvement.'
      : 'Keep practicing!';

  // Get category from first question if available
  const category = questions[0]?.category || 'Unknown';

  // Save result to Firestore once on mount (useRef guard prevents double-save in React StrictMode)
  const savedRef = useRef(false);
  useEffect(() => {
    if (total === 0 || savedRef.current) return;
    savedRef.current = true;

    const now = new Date();
    const dateStr = now.toLocaleString();

    // Save to 'attempts' (read by web admin dashboard)
    const uid = (auth as any)?.currentUser?.uid;

    // Save to 'attempts' (read by web admin dashboard)
    addDoc(collection(db, 'attempts'), {
      uid,
      category,
      score: pct,
      correct: score,
      total,
      date: dateStr,
      timestamp: serverTimestamp(),
    }).catch(err => console.error('Failed to save attempt:', err));

    // Save to 'results' (read by student app analytics)
    addDoc(collection(db, 'results'), {
      uid,
      category,
      score: pct,
      correct: score,
      total,
      date: dateStr,
      timestamp: serverTimestamp(),
    }).catch(err => console.error('Failed to save result:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '28px', padding: '32px 24px 24px', border: '1px solid rgba(255,255,255,0.8)', textAlign: 'center' }}>
        <div style={{ width: '88px', height: '88px', background: '#E25A53', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontWeight: 900, fontSize: '22px', border: '5px solid rgba(226,90,83,0.15)', boxShadow: '0 8px 24px rgba(226,90,83,0.25)' }}>{pct}%</div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#2d2d2d', margin: '0 0 6px' }}>Quiz Complete!</h2>
        <p style={{ color: '#aaa', fontWeight: 600, fontSize: '13px', margin: '0 0 16px' }}>You scored {score} out of {total}</p>
        <span style={{ display: 'inline-block', background: 'rgba(226,90,83,0.1)', color: '#E25A53', padding: '5px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, marginBottom: '12px' }}>{category}</span>
        <p style={{ color: '#E25A53', fontWeight: 800, fontSize: '13px', margin: '0 0 20px' }}>{feedback}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={onBack}  style={{ padding: '11px 18px', background: '#EBE9E1', border: 'none', borderRadius: '14px', fontSize: '11px', fontWeight: 800, color: '#888', cursor: 'pointer' }}>Back to Dashboard</button>
          <button style={{ padding: '11px 18px', background: '#EBE9E1', border: 'none', borderRadius: '14px', fontSize: '11px', fontWeight: 800, color: '#888', cursor: 'pointer' }}>Review Materials</button>
          <button onClick={onRetry} style={{ padding: '11px 18px', background: '#E25A53', border: 'none', borderRadius: '14px', fontSize: '11px', fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(226,90,83,0.3)' }}>Try Again</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '28px', padding: '24px 20px', border: '1px solid rgba(255,255,255,0.8)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#2d2d2d', margin: '0 0 20px' }}>Review Answers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect  = userAnswer === q.answer;
            return (
              <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: '#fafaf8' }}>
                  <div style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: isCorrect ? '#E25A53' : '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 900, marginTop: '1px' }}>{i + 1}</div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#333', margin: 0, lineHeight: 1.4 }}>{q.question}</p>
                </div>
                <div style={{ padding: '10px 16px 4px', background: '#fff' }}>
                  <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 600 }}>Your answer: </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isCorrect ? '#E25A53' : '#aaa' }}>{userAnswer !== null && q.options ? q.options[userAnswer] : 'Not answered'}</span>
                </div>
                {!isCorrect && q.options && (
                  <div style={{ padding: '2px 16px 6px', background: '#fff' }}>
                    <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 600 }}>Correct answer: </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#E25A53' }}>{q.options[q.answer]}</span>
                  </div>
                )}
                <div style={{ padding: '10px 16px 14px', background: 'rgba(226,90,83,0.04)', borderTop: '1px solid #f5f0f0' }}>
                  <p style={{ fontSize: '12px', color: '#777', margin: 0, lineHeight: 1.5 }}>{q.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
const FILTERS = [
  'All',
  'General Education',
  'Professional Education',
  'Major/Specialization',
  'Exam Simulation',
];

type HistoryItem = {
  category: string; score: number; correct: string;
  date: string; clock: string; feedback: string; color: string;
};

const HistoryView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = (auth as any)?.currentUser?.uid;
        const snap = await getDocs(query(collection(db, 'results'), where('uid', '==', uid)));
        const items: HistoryItem[] = snap.docs.map(d => {
          const data = d.data();

          const score: number = data.score ?? 0;
          const correct: number = data.correct ?? 0;
          const total: number = data.total ?? 0;
          const color = score >= 75 ? '#4F62E5' : '#FF4D4F';
          const feedback = score >= 75 ? 'Great job!' : score >= 50 ? 'Good job! Room for improvement.' : 'Review the materials and try again.';
          let date = '';
          let clock = '';
          if (data.timestamp?.toDate) {
            const dt = data.timestamp.toDate() as Date;
            date = `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
            clock = dt.toLocaleTimeString();
          }
          return { category: data.category ?? 'Unknown', score, correct: `${correct}/${total} correct`, date, clock, feedback, color };
        });
        // Sort newest first
        items.sort((a, b) => (a.date < b.date ? 1 : -1));
        setHistoryData(items);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    };
    load();
  }, []);

  const filteredData =
    selectedFilter === 'All'
      ? historyData
      : historyData.filter(item => item.category === selectedFilter);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '18px',
        border: '1px solid rgba(255,255,255,0.8)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#2d2d2d',
              margin: 0,
            }}
          >
            Quiz History
          </h2>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: '#999',
            fontWeight: 700,
          }}
        >
          🕐 {historyData.length} total attempts
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '18px',
        }}
      >
        {FILTERS.map(filter => {
          const active = selectedFilter === filter;

          return (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              style={{
                whiteSpace: 'nowrap',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                background: active ? '#4F62E5' : '#F3F4F6',
                color: active ? '#fff' : '#666',
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* History Cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {filteredData.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #ECECEC',
              borderRadius: '18px',
              padding: '16px',
              background: '#fff',
            }}
          >
            {/* Top */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    color: '#2d2d2d',
                    marginBottom: '6px',
                  }}
                >
                  {item.category}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: '#999',
                    fontWeight: 600,
                  }}
                >
                  <span>
                    📅 {item.date}
                  </span>

                  <span>
                    🕒 {item.clock}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: item.color,
                    lineHeight: 1,
                  }}
                >
                  {item.score}%
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#999',
                    fontWeight: 700,
                    marginTop: '4px',
                  }}
                >
                  {item.correct}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                height: '6px',
                background: '#E5E7EB',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: `${item.score}%`,
                  height: '100%',
                  background: item.color,
                  borderRadius: '999px',
                }}
              />
            </div>

            {/* Feedback */}
            <div
              style={{
                fontSize: '12px',
                color: '#888',
                fontWeight: 600,
              }}
            >
              💡 {item.feedback}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── BADGES VIEW ──────────────────────────────────────────────────────────────
const BADGES = [
  {
    title: 'Century Club',
    description: 'Complete 100 quiz questions',
    icon: '🎯',
    color: '#FF6B6B',
  },
  {
    title: 'Exam Ace',
    description: 'Score 95% or higher in Exam Simulation mode',
    icon: '🏆',
    color: '#D4A017',
  },
  {
    title: 'GenEd Master',
    description: 'Score 90% or higher in 5 General Education quizzes',
    icon: '🎓',
    color: '#6B7280',
  },
  {
    title: 'Specialization Star',
    description: 'Score 90% or higher in 5 Major/Specialization quizzes',
    icon: '⭐',
    color: '#EAB308',
  },
  {
    title: 'ProfEd Expert',
    description: 'Score 90% or higher in 5 Professional Education quizzes',
    icon: '📚',
    color: '#84CC16',
  },
  {
    title: '7-Day Streak',
    description: 'Complete quizzes for 7 consecutive days',
    icon: '🔥',
    color: '#FF7A59',
  },
];

const BadgesView: React.FC = () => {
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const computeUnlocked = (rows: any[]) => {
    // rows from `results` collection
    // Expected fields from ResultsView/Results saving:
    // - category: string
    // - score: number
    // - timestamp: Firestore timestamp (toDate)

    const totalAttempts = rows.length;

    const byCategoryScores: Record<string, number[]> = {};
    const byCategoryHighCount: Record<string, number> = {};

    // For streak: bucket unique local dates where there is at least 1 result
    const dayKeySet = new Set<string>();

    rows.forEach((r) => {
      const cat = String(r?.category ?? 'Unknown');
      const score = Number(r?.score ?? 0);

      if (!byCategoryScores[cat]) byCategoryScores[cat] = [];
      byCategoryScores[cat].push(score);

      if (!byCategoryHighCount[cat]) byCategoryHighCount[cat] = 0;
      if (score >= 90) byCategoryHighCount[cat]++;

      const ts = r?.timestamp;
      if (ts?.toDate) {
        const d: Date = ts.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dayKeySet.add(key);
      }
    });

    const unlockedMap: Record<string, boolean> = {};

    // Century Club: complete 100 quiz questions
    // We interpret as number of result rows >= 100.
    unlockedMap['Century Club'] = totalAttempts >= 100;

    // Exam Ace: score 95% or higher in Exam Simulation mode
    unlockedMap['Exam Ace'] = (byCategoryScores['Exam Simulation'] ?? []).some((s) => s >= 95);

    // GenEd Master / ProfEd Expert: score 90% or higher in 5 quizzes
    unlockedMap['GenEd Master'] = (byCategoryHighCount['General Education'] ?? 0) >= 5;
    unlockedMap['Specialization Star'] = (byCategoryHighCount['Major/Specialization'] ?? 0) >= 5;
    unlockedMap['ProfEd Expert'] = (byCategoryHighCount['Professional Education'] ?? 0) >= 5;

    // 7-Day Streak: at least 7 unique days with attempts.
    // (If you later add true consecutive-day logic, we can refine this.)
    unlockedMap['7-Day Streak'] = dayKeySet.size >= 7;

    return unlockedMap;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const uid = (auth as any)?.currentUser?.uid;
        const snap = await getDocs(query(collection(db, 'results'), where('uid', '==', uid)));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const unlockedMap = computeUnlocked(rows);
        if (active) setUnlocked(unlockedMap);
      } catch (e) {
        console.error('Failed to load badges:', e);
        if (active) setError('Failed to load badges.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const totalBadges = BADGES.length;
  const unlockedBadges = BADGES.reduce((s, b) => s + (unlocked[b.title] ? 1 : 0), 0);
  const progress = totalBadges ? (unlockedBadges / totalBadges) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Achievement Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '22px 20px',
          border: '1px solid rgba(255,255,255,0.8)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#2d2d2d',
                margin: '0 0 6px',
              }}
            >
              Achievements
            </h2>

            <p
              style={{
                fontSize: '12px',
                color: '#999',
                fontWeight: 600,
                margin: 0,
              }}
            >
              Earned {unlockedBadges} of {totalBadges} badges
            </p>
          </div>

          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(245,158,11,0.25)',
            }}
          >
            🏆
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            background: '#ECECEC',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#F59E0B',
              borderRadius: '999px',
            }}
          />
        </div>
      </div>

      {/* All Badges */}
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.8)',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 900,
            color: '#2d2d2d',
            margin: '0 0 18px',
          }}
        >
          Badges
        </h2>

        {loading && (
          <p style={{ color: '#999', fontSize: '13px', fontWeight: 700, margin: '0 0 14px' }}>Loading badges...</p>
        )}
        {error && (
          <p style={{ color: '#E25A53', fontSize: '13px', fontWeight: 800, margin: '0 0 14px' }}>{error}</p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {BADGES.map((badge, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ECECEC',
                borderRadius: '16px',
                padding: '18px 14px',
                textAlign: 'center',
                background: '#FAFAFA',
                opacity: unlocked[badge.title] ? 1 : 0.75,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: badge.color,
                  opacity: 0.7,
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  fontSize: '26px',
                }}
              >
                {badge.icon}

                {/* Lock */}
                {!unlocked[badge.title] && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '11px',
                      border: '2px solid #fff',
                    }}
                  >
                    🔒
                  </div>
                )}
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#6B7280',
                  marginBottom: '8px',
                }}
              >
                {badge.title}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: '10px',
                  color: '#B0B0B0',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                {badge.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AuthGate>
    <AppInner />
  </AuthGate>
);

export default App;
