"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import {
  RichEditorProvider,
  RichEditorSurface,
  RichEditorToolbar,
} from "@/components/RichTextEditor";
import { getFirebaseAuth } from "@/lib/firebase";
import { createThought, subscribeThoughts, type Thought } from "@/lib/thoughts";
import { Plus } from "lucide-react";

const auth = getFirebaseAuth();
const emotions = ["Serenity", "Joy", "Sadness", "Anger", "Anguish", "Envy", "Anxiety"];
const places = ["Home", "Office", "Café", "Park", "Travel"];
const emptyDraft = { content: "", contentHtml: "", emotion: "Serenidad", place: "Casa" };
const emotionStyle: Record<string, { bg: string; border: string; textColor: string }> = {
  // English (new)
  Joy:      { bg: "#FAF9F3", border: "rgba(216,206,154,0.2)", textColor: "#8C8664" },
  Sadness:  { bg: "#F9F3F2", border: "rgba(207,157,146,0.2)", textColor: "#87665F" },
  Anger:    { bg: "#F4F6F6", border: "rgba(163,177,184,0.2)", textColor: "#6A7378" },
  Anguish:  { bg: "#F4F1F5", border: "rgba(163,141,173,0.2)", textColor: "#6A5C70" },
  Envy:     { bg: "#F4F6F4", border: "rgba(165,179,161,0.2)", textColor: "#6B7469" },
  Anxiety:  { bg: "#F9F6F9", border: "rgba(203,181,205,0.2)", textColor: "#847685" },
  Serenity: { bg: "#FAF6F3", border: "rgba(212,182,158,0.2)", textColor: "#8A7667" },
  // Spanish (legacy)
  Alegría:   { bg: "#FAF9F3", border: "rgba(216,206,154,0.2)", textColor: "#8C8664" },
  Tristeza:  { bg: "#F9F3F2", border: "rgba(207,157,146,0.2)", textColor: "#87665F" },
  Enojo:     { bg: "#F4F6F6", border: "rgba(163,177,184,0.2)", textColor: "#6A7378" },
  Angustia:  { bg: "#F4F1F5", border: "rgba(163,141,173,0.2)", textColor: "#6A5C70" },
  Envidia:   { bg: "#F4F6F4", border: "rgba(165,179,161,0.2)", textColor: "#6B7469" },
  Ansiedad:  { bg: "#F9F6F9", border: "rgba(203,181,205,0.2)", textColor: "#847685" },
  Serenidad: { bg: "#FAF6F3", border: "rgba(212,182,158,0.2)", textColor: "#8A7667" },
  Calmo:    { bg: "#F4F6F4", border: "rgba(165,179,161,0.2)", textColor: "#6B7469" },
  Ansioso:  { bg: "#F9F6F9", border: "rgba(203,181,205,0.2)", textColor: "#847685" },
  Tenso:    { bg: "#F4F6F6", border: "rgba(163,177,184,0.2)", textColor: "#6A7378" },
  Feliz:    { bg: "#FAF9F3", border: "rgba(216,206,154,0.2)", textColor: "#8C8664" },
  Triste:   { bg: "#F9F3F2", border: "rgba(207,157,146,0.2)", textColor: "#87665F" },
};
const fallbackEmotionStyle = { bg: "#FAF6F3", border: "rgba(212,182,158,0.2)", textColor: "#8A7667" };

const emotionAccentColors: Record<string, string> = {
  // English (new) - Stronger, more saturated colors for Track screen
  Joy:      "#D8CE9A",
  Sadness:  "#CF9D92",
  Anger:    "#A3B1B8",
  Anguish:  "#A38DAD",
  Envy:     "#A5B3A1",
  Anxiety:  "#CBB5CD",
  Serenity: "#D4B69E",
  // Spanish (legacy)
  Alegría:   "#D8CE9A",
  Tristeza:  "#CF9D92",
  Enojo:     "#A3B1B8",
  Angustia:  "#A38DAD",
  Envidia:   "#A5B3A1",
  Ansiedad:  "#CBB5CD",
  Serenidad: "#D4B69E",
  Calmo:    "#A5B3A1",
  Ansioso:  "#CBB5CD",
  Tenso:    "#A3B1B8",
  Feliz:    "#D8CE9A",
  Triste:   "#CF9D92",
};
const fallbackAccentColor = "#D4B69E";
function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

function LeftArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

function RightArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

const heroQuestions = [
  "What are we thinking today?",
  "What is on your mind now?",
  "What do you want to notice?",
  "What feels true right now?",
];

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

type Screen = "home" | "editor" | "prompts" | "reading" | "track";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [screen, setScreen] = useState<Screen>("home");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editorVersion, setEditorVersion] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);
  const [activeThought, setActiveThought] = useState<Thought | null>(null);
  const [today, setToday] = useState(formatToday);
  const [heroText, setHeroText] = useState(heroQuestions[0]);
  const [filterEmotion, setFilterEmotion] = useState<string | null>(null);
  const [filterDates, setFilterDates] = useState<string[]>([]);
  const [filterSort, setFilterSort] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const thoughtTrackRef = useRef<HTMLDivElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthLoading(false);
    if (!currentUser) setThoughts([]);
  }), []);

  useEffect(() => {
    if (!user) return;
    return subscribeThoughts(user.uid, setThoughts, (error) =>
      setSaveError(`No se pudo sincronizar: ${error.message}`),
    );
  }, [user]);

  useEffect(() => {
    if (screen !== "home") return;
    const check = () => {
      const track = thoughtTrackRef.current;
      if (track) {
        const headerH = window.innerWidth <= 640 ? 64 : 76;
        setShowFilters(track.getBoundingClientRect().top <= headerH);
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "home") return;
    const handleScroll = () => setHasScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [screen]);

  useEffect(() => {
    const refresh = () => setToday(formatToday());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    if (screen !== "home") return;
    let questionIndex = 0;
    let progress = heroQuestions[0].length;
    let mode: "hold" | "erase" | "type" = "hold";
    let holdTicks = 0;
    let initialized = false;
    const interval = window.setInterval(() => {
      if (!initialized) {
        setHeroText(heroQuestions[0]);
        initialized = true;
        return;
      }
      if (mode === "hold") {
        holdTicks++;
        if (holdTicks > 210) {
          mode = "erase";
          holdTicks = 0;
        }
        return;
      }
      if (mode === "erase") {
        progress = Math.max(0, progress - 1);
        setHeroText(heroQuestions[questionIndex].slice(0, progress));
        if (progress === 0) {
          questionIndex = (questionIndex + 1) % heroQuestions.length;
          mode = "type";
        }
        return;
      }
      const target = heroQuestions[questionIndex];
      progress = Math.min(target.length, progress + 1);
      setHeroText(target.slice(0, progress));
      if (progress === target.length) {
        mode = "hold";
      }
    }, 55);
    return () => window.clearInterval(interval);
  }, [screen]);

  const placesUsed = useMemo(
    () => new Set(thoughts.map((thought) => thought.place)).size,
    [thoughts],
  );

  const usedEmotions = useMemo(
    () => Array.from(new Set(thoughts.map((t) => t.emotion))),
    [thoughts],
  );

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    thoughts.forEach((t) => {
      if (!t.createdAt?.toDate) return;
      const d = t.createdAt.toDate();
      dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [thoughts]);

  const filteredThoughts = useMemo(() => {
    let result = [...thoughts];
    if (filterEmotion) result = result.filter((t) => t.emotion === filterEmotion);
    if (filterDates.length > 0) {
      result = result.filter((t) => {
        if (!t.createdAt?.toDate) return false;
        const thoughtDate = t.createdAt.toDate();
        const dateStr = `${thoughtDate.getFullYear()}-${String(thoughtDate.getMonth() + 1).padStart(2, '0')}-${String(thoughtDate.getDate()).padStart(2, '0')}`;
        return filterDates.includes(dateStr);
      });
    }
    if (filterSort === "oldest") result.reverse();
    return result;
  }, [thoughts, filterEmotion, filterDates, filterSort]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (authMode === "login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo autenticar.");
    } finally {
      setAuthBusy(false);
    }
  }

  function requestSave() {
    if (!draft.content.trim()) {
      setSaveError("Escribe algo antes de guardar.");
      return;
    }
    setSaveError("");
    setIsConfirming(true);
  }

  async function confirmSave() {
    if (!user) return;
    setSaveBusy(true);
    setSaveError("");
    const content = draft.content.trim();
    try {
      const created = await createThought({
        ...draft,
        content,
        contentText: content,
        userId: user.uid,
      });
      setThoughts((current) => [
        {
          id: created.id,
          ...draft,
          content,
          contentText: content,
          userId: user.uid,
          createdAt: null,
          updatedAt: null,
        },
        ...current,
      ]);
      setDraft(emptyDraft);
      setEditorVersion((current) => current + 1);
      setIsConfirming(false);
      setIsOpeningEditor(false);
      setScreen("home");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaveBusy(false);
    }
  }

  function openEditor() {
    setIsOpeningEditor(true);
    window.setTimeout(() => setScreen("editor"), 420);
  }

  function openThought(thought: Thought) {
    setActiveThought(thought);
    setScreen("reading");
  }

  function backToHome() {
    setIsOpeningEditor(false);
    setIsConfirming(false);
    setScreen("home");
  }

  if (authLoading) return <div className="core-loading">Loading Core...</div>;

  if (!user)
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={authError}
        busy={authBusy}
        onSubmit={handleAuth}
      />
    );

  if (screen === "prompts")
    return (
      <PromptScreen
        onBack={backToHome}
        onChoose={(prompt) => {
          setDraft({ ...emptyDraft, content: prompt, contentHtml: `<p>${prompt}</p>` });
          setEditorVersion((current) => current + 1);
          setScreen("editor");
        }}
      />
    );

  if (screen === "reading" && activeThought)
    return <ReadingScreen thought={activeThought} onBack={backToHome} />;

  if (screen === "track")
    return (
      <TrackScreen
        thoughts={thoughts}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onBack={() => setScreen("home")}
      />
    );

  if (screen === "editor")
    return (
      <main className="core-app editor-screen">
        <Header screen={screen} onHome={backToHome} onTrack={() => setScreen("track")} />
        <section className="editor-layout">
          <RichEditorProvider
            key={editorVersion}
            content={draft.contentHtml}
            onChange={(html, text) =>
              setDraft((current) => ({ ...current, contentHtml: html, content: text }))
            }
          >
            <div className="editor-top">
              <button
                className="icon-button back-button"
                type="button"
                aria-label="Back"
                onClick={backToHome}
              >
                <BackArrow />
              </button>
              <div className="editor-toolbar-wrap">
                <RichEditorToolbar />
              </div>
              <button
                className="save-link"
                type="button"
                onClick={requestSave}
                disabled={saveBusy}
              >
                Save
              </button>
            </div>
            <RichEditorSurface />
          </RichEditorProvider>
          {saveError && !isConfirming && (
            <p className="form-error editor-error">{saveError}</p>
          )}
        </section>
        {isConfirming && (
          <ConfirmSheet
            draft={draft}
            saveBusy={saveBusy}
            saveError={saveError}
            onCancel={() => setIsConfirming(false)}
            onChangeEmotion={(emotion) =>
              setDraft((current) => ({ ...current, emotion }))
            }
            onChangePlace={(place) => setDraft((current) => ({ ...current, place }))}
            onConfirm={confirmSave}
          />
        )}
      </main>
    );

  return (
    <main
      className={`core-app home-screen ${isOpeningEditor ? "is-opening-editor" : ""}`}
    >
      <Header screen={screen} onHome={backToHome} onTrack={() => setScreen("track")} />
      <section className="home-hero" onClick={openEditor}>
        <p className="date-label">{today}</p>
        <div className="hero-question-wrap">
          <button className="hero-question" type="button">
            {heroText}<span className="hero-cursor" aria-hidden="true" />
          </button>
        </div>
        <p className="hero-hint">Tap anywhere on the screen to write</p>
        <button
          className="prompt-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setScreen("prompts");
          }}
        >
          Not sure where to start?
        </button>
      </section>
      <section className="past-thoughts" aria-label="Past thoughts">

        {thoughts.length >= 4 && (
          <FilterBar
            visible={showFilters}
            activeEmotion={filterEmotion}
            sort={filterSort}
            onOpenFilter={() => setIsFilterOpen(true)}
            onSort={setFilterSort}
          />
        )}
        <div className="thought-track" ref={thoughtTrackRef}>
          {filteredThoughts.length ? (
            filteredThoughts.map((thought) => (
              <ThoughtCard
                key={thought.id}
                thought={thought}
                onOpen={() => openThought(thought)}
              />
            ))
          ) : (
            <EmptyThought />
          )}
        </div>
      </section>
      {!hasScrolled && <div className="thoughts-overlay" aria-hidden="true" />}
      {isFilterOpen && (
        <FilterSheet
          usedEmotions={usedEmotions}
          activeEmotion={filterEmotion}
          onEmotion={setFilterEmotion}
          availableDates={availableDates}
          selectedDates={filterDates}
          onDatesChange={setFilterDates}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
      {showFilters && (
        <button className="fab" type="button" aria-label="New thought" onClick={openEditor}>
          <Plus size={22} strokeWidth={2} />
        </button>
      )}
      <footer className="home-footer">
        <span>
          {thoughts.length} thoughts · {placesUsed} places
        </span>
        <button type="button" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </footer>
    </main>
  );
}

function AuthScreen({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  error,
  busy,
  onSubmit,
}: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-intro">
          <span className="wordmark">core</span>
          <p className="eyebrow">A quiet place to come back to yourself</p>
          <h1>
            Your thoughts,
            <br />
            held gently.
          </h1>
          <p>
            Write what is present. Notice what returns. Keep it yours across every device.
          </p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Opening..." : mode === "login" ? "Enter Core" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Header({ screen, onHome, onTrack }: { screen: Screen; onHome: () => void; onTrack: () => void }) {
  return (
    <header className="core-header">
      <button
        className={`nav-tab ${screen === "home" || screen === "editor" || screen === "prompts" || screen === "reading" ? "active" : ""}`}
        type="button"
        onClick={onHome}
      >
        Write
      </button>
      <button
        className={`nav-tab ${screen === "track" ? "active" : ""}`}
        type="button"
        onClick={onTrack}
      >
        Track
      </button>
    </header>
  );
}

function ThoughtCard({ thought, onOpen }: { thought: Thought; onOpen: () => void }) {
  const es = emotionStyle[thought.emotion] ?? fallbackEmotionStyle;
  return (
    <button
      className="thought-card"
      type="button"
      style={{ background: es.bg, borderColor: es.border }}
      onClick={onOpen}
    >
      <p className="thought-date" style={{ color: es.textColor }}>
        {formatThoughtDate(thought)}
      </p>
      {thought.contentHtml ? (
        <div
          className="thought-content rich-content"
          style={{ color: es.textColor }}
          dangerouslySetInnerHTML={{ __html: thought.contentHtml }}
        />
      ) : (
        <h2 style={{ color: es.textColor }}>{thought.content}</h2>
      )}
      <p className="thought-meta">{thought.emotion} · {thought.place}</p>
    </button>
  );
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="1" y1="3.5" x2="12" y2="3.5" />
      <line x1="3" y1="6.5" x2="10" y2="6.5" />
      <line x1="5" y1="9.5" x2="8" y2="9.5" />
    </svg>
  );
}

function FilterBar({
  visible,
  activeEmotion,
  sort,
  onOpenFilter,
  onSort,
}: {
  visible: boolean;
  activeEmotion: string | null;
  sort: "newest" | "oldest";
  onOpenFilter: () => void;
  onSort: (s: "newest" | "oldest") => void;
}) {
  return (
    <div className={`filter-bar${visible ? " is-visible" : ""}`}>
      <button
        type="button"
        className={`filter-trigger${activeEmotion ? " has-filter" : ""}`}
        onClick={onOpenFilter}
      >
        {activeEmotion ?? "Filter"} <FilterIcon />
      </button>
      <button
        type="button"
        className="filter-sort"
        onClick={() => onSort(sort === "newest" ? "oldest" : "newest")}
      >
        {sort === "newest" ? "Newest ↓" : "Oldest ↑"}
      </button>
    </div>
  );
}

function FilterSheet({
  usedEmotions,
  activeEmotion,
  onEmotion,
  availableDates,
  selectedDates,
  onDatesChange,
  onClose,
}: {
  usedEmotions: string[];
  activeEmotion: string | null;
  onEmotion: (e: string | null) => void;
  availableDates: string[];
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  onClose: () => void;
}) {
  function pick(emotion: string | null) {
    onEmotion(emotion === activeEmotion ? null : emotion);
  }
  
  function toggleDate(dateStr: string) {
    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter(d => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr]);
    }
  }
  
  function clearDates() {
    onDatesChange([]);
  }
  
  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }
  
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-sheet filter-sheet">
        <button className="confirm-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">Filter thoughts</p>
        <h2>What emotion are you looking for?</h2>
        <div className="badge-row">
          <button
            type="button"
            className={`badge ${activeEmotion === null ? "is-active" : ""}`}
            onClick={() => pick(null)}
          >
            All
          </button>
          {usedEmotions.map((emotion) => (
            <button
              key={emotion}
              type="button"
              className={`badge ${activeEmotion === emotion ? "is-active" : ""}`}
              onClick={() => pick(emotion)}
            >
              {emotion}
            </button>
          ))}
        </div>
        
        {availableDates.length > 0 && (
          <>
            <h2 className="filter-section-title">Select dates</h2>
            <div className="date-filter-grid">
              {availableDates.map((dateStr) => (
                <button
                  key={dateStr}
                  type="button"
                  className={`date-badge ${selectedDates.includes(dateStr) ? "is-active" : ""}`}
                  onClick={() => toggleDate(dateStr)}
                >
                  {formatDate(dateStr)}
                </button>
              ))}
            </div>
            {selectedDates.length > 0 && (
              <button type="button" className="clear-dates-btn" onClick={clearDates}>
                Clear dates ({selectedDates.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyThought() {
  return (
    <article className="thought-card empty-card">
      <p className="thought-date">Your first thought</p>
      <h2>Your thoughts will live here.</h2>
      <p className="thought-meta">Scroll to explore them later</p>
    </article>
  );
}

function ReadingScreen({ thought, onBack }: { thought: Thought; onBack: () => void }) {
  const es = emotionStyle[thought.emotion] ?? fallbackEmotionStyle;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <main
      className="core-app reading-screen"
      style={{ "--screen-bg": es.bg } as React.CSSProperties}
    >
      <Header screen="home" onHome={onBack} onTrack={() => {}} />
      <section className="reading-layout">
        <button
          className="icon-button back-button"
          type="button"
          aria-label="Back"
          onClick={onBack}
        >
          <BackArrow />
        </button>
        <div className="reading-body">
          <p className="reading-date">{formatThoughtDate(thought)}</p>
          <p className="reading-meta">
            {thought.emotion} · {thought.place}
          </p>
          {thought.contentHtml ? (
            <div
              className="reading-content rich-content"
              dangerouslySetInnerHTML={{ __html: thought.contentHtml }}
            />
          ) : (
            <p className="reading-content">{thought.content}</p>
          )}
        </div>
      </section>
    </main>
  );
}

function PromptScreen({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  onChoose: (prompt: string) => void;
}) {
  const prompts = [
    "What has been taking up space in your mind?",
    "What felt lighter today?",
    "What are you avoiding, and why?",
    "What would you like to remember about this moment?",
  ];
  return (
    <main className="core-app prompt-screen">
      <button
        className="icon-button prompt-back"
        type="button"
        aria-label="Back"
        onClick={onBack}
      >
        <BackArrow />
      </button>
      <div className="prompt-intro">
        <p className="eyebrow">A gentle beginning</p>
        <h1>Not sure where to start?</h1>
        <p>Choose a question and let the first sentence take care of itself.</p>
      </div>
      <div className="prompt-list">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onChoose(prompt)}>
            {prompt}
            <span>↗</span>
          </button>
        ))}
      </div>
    </main>
  );
}

function ConfirmSheet({
  draft,
  saveBusy,
  saveError,
  onCancel,
  onChangeEmotion,
  onChangePlace,
  onConfirm,
}: {
  draft: typeof emptyDraft;
  saveBusy: boolean;
  saveError: string;
  onCancel: () => void;
  onChangeEmotion: (emotion: string) => void;
  onChangePlace: (place: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-sheet">
        <button
          className="confirm-close"
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
        >
          ×
        </button>
        <p className="eyebrow">Before saving</p>
        <h2>How were you feeling?</h2>
        <div className="badge-row">
          {emotions.map((emotion) => (
            <button
              key={emotion}
              type="button"
              className={`badge ${draft.emotion === emotion ? "is-active" : ""}`}
              onClick={() => onChangeEmotion(emotion)}
            >
              {emotion}
            </button>
          ))}
        </div>
        <h2 className="second">Where were you?</h2>
        <div className="badge-row">
          {places.map((place) => (
            <button
              key={place}
              type="button"
              className={`badge ${draft.place === place ? "is-active" : ""}`}
              onClick={() => onChangePlace(place)}
            >
              {place}
            </button>
          ))}
        </div>
        {saveError && <p className="form-error">{saveError}</p>}
        <button
          className="primary-button confirm-save"
          type="button"
          onClick={onConfirm}
          disabled={saveBusy}
        >
          {saveBusy ? "Saving..." : "Save thought"}
        </button>
      </div>
    </div>
  );
}

function TrackScreen({
  thoughts,
  selectedMonth,
  onMonthChange,
  onBack,
}: {
  thoughts: Thought[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onBack: () => void;
}) {
  const streak = calculateStreak(thoughts);
  const monthsWithEntries = getMonthsWithEntries(thoughts);
  const selectedMonthThoughts = thoughts.filter((t) => {
    if (!t.createdAt?.toDate) return false;
    const d = t.createdAt.toDate();
    return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
  });
  const emotionBalance = calculateEmotionBalance(selectedMonthThoughts);
  const calendar = generateCalendar(selectedMonth, thoughts);
  const currentMonthIndex = monthsWithEntries.findIndex(
    (m) => m.getMonth() === selectedMonth.getMonth() && m.getFullYear() === selectedMonth.getFullYear(),
  );
  const canGoPrev = currentMonthIndex < monthsWithEntries.length - 1;
  const canGoNext = currentMonthIndex > 0;

  return (
    <main className="core-app track-screen">
      <Header screen="track" onHome={onBack} onTrack={() => {}} />
      <div className="track-content">
        <StreakBanner streak={streak} />
        <MonthSelector
          month={selectedMonth}
          onPrev={canGoPrev ? () => onMonthChange(monthsWithEntries[currentMonthIndex + 1]) : undefined}
          onNext={canGoNext ? () => onMonthChange(monthsWithEntries[currentMonthIndex - 1]) : undefined}
        />
        <div className="track-grid">
          <DailyEmotionsCard calendar={calendar} />
          <EmotionalBalanceCard balance={emotionBalance} />
        </div>
      </div>
    </main>
  );
}

function calculateStreak(thoughts: Thought[]): number {
  if (!thoughts.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMap = new Map<string, boolean>();
  thoughts.forEach((t) => {
    if (!t.createdAt?.toDate) return;
    const d = t.createdAt.toDate();
    d.setHours(0, 0, 0, 0);
    dayMap.set(d.toISOString(), true);
  });
  let streak = 0;
  let checkDate = new Date(today);
  while (dayMap.has(checkDate.toISOString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function getMonthsWithEntries(thoughts: Thought[]): Date[] {
  const monthSet = new Set<string>();
  thoughts.forEach((t) => {
    if (!t.createdAt?.toDate) return;
    const d = t.createdAt.toDate();
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthSet.add(key);
  });
  return Array.from(monthSet)
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return new Date(year, month, 1);
    })
    .sort((a, b) => b.getTime() - a.getTime());
}

function calculateEmotionBalance(thoughts: Thought[]): Array<{ emotion: string; count: number; percentage: number }> {
  if (!thoughts.length) return [];
  const emotionCounts: Record<string, number> = {};
  thoughts.forEach((t) => {
    emotionCounts[t.emotion] = (emotionCounts[t.emotion] || 0) + 1;
  });
  const total = thoughts.length;
  return Object.entries(emotionCounts)
    .map(([emotion, count]) => ({
      emotion,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

type CalendarDay = {
  date: Date;
  dayNumber: number;
  emotion?: string;
  hasEntry: boolean;
  isToday: boolean;
};

function generateCalendar(month: Date, thoughts: Thought[]): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const calendar: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMap = new Map<string, string>();
  thoughts.forEach((t) => {
    if (!t.createdAt?.toDate) return;
    const d = t.createdAt.toDate();
    if (d.getMonth() === monthIndex && d.getFullYear() === year) {
      const key = d.getDate().toString();
      if (!dayMap.has(key)) dayMap.set(key, t.emotion);
    }
  });
  for (let i = 0; i < startDayOfWeek; i++) {
    const date = new Date(year, monthIndex, 1 - (startDayOfWeek - i));
    calendar.push({
      date,
      dayNumber: date.getDate(),
      hasEntry: false,
      isToday: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const emotion = dayMap.get(day.toString());
    calendar.push({
      date,
      dayNumber: day,
      emotion,
      hasEntry: !!emotion,
      isToday: date.getTime() === today.getTime(),
    });
  }
  return calendar;
}

function StreakBanner({ streak }: { streak: number }) {
  const message = streak > 0 ? "You're keeping your mind calm!" : "Start a new streak today!";
  const badge = streak > 0 ? "Active" : null;
  return (
    <div className="streak-banner">
      <div className="streak-icon">🔥</div>
      <div className="streak-info">
        <h2 className="streak-count">{streak} Days Streak</h2>
        <p className="streak-message">{message}</p>
      </div>
      {badge && <span className="streak-badge">{badge}</span>}
    </div>
  );
}

function MonthSelector({
  month,
  onPrev,
  onNext,
}: {
  month: Date;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month);
  return (
    <div className="month-selector">
      <button type="button" className="month-arrow" onClick={onPrev} disabled={!onPrev} aria-label="Previous month">
        <LeftArrow />
      </button>
      <h2 className="month-label">{monthName}</h2>
      <button type="button" className="month-arrow" onClick={onNext} disabled={!onNext} aria-label="Next month">
        <RightArrow />
      </button>
    </div>
  );
}

function DailyEmotionsCard({ calendar }: { calendar: CalendarDay[] }) {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="track-card">
      <h3 className="track-card-title">Daily Emotions</h3>
      <div className="calendar-grid">
        {weekDays.map((day) => (
          <div key={day} className="calendar-day-label">
            {day}
          </div>
        ))}
        {calendar.map((day, i) => (
          <CalendarDayCircle key={i} day={day} />
        ))}
      </div>
    </div>
  );
}

function CalendarDayCircle({ day }: { day: CalendarDay }) {
  const accentColor = day.emotion ? emotionAccentColors[day.emotion] ?? fallbackAccentColor : null;
  const bgColor = day.hasEntry && accentColor ? accentColor : day.hasEntry ? "#E8E6E3" : "#F5F4F2";
  const className = `calendar-day ${day.isToday ? "is-today" : ""} ${!day.hasEntry ? "no-entry" : ""}`;
  return (
    <div className={className} style={{ background: bgColor }}>
      <span>{day.dayNumber}</span>
    </div>
  );
}

function EmotionalBalanceCard({ balance }: { balance: Array<{ emotion: string; percentage: number }> }) {
  const total = balance.reduce((sum, b) => sum + b.percentage, 0);
  return (
    <div className="track-card">
      <h3 className="track-card-title">Emotional Balance</h3>
      <div className="balance-bar">
        {balance.map((b) => {
          const accentColor = emotionAccentColors[b.emotion] ?? fallbackAccentColor;
          return (
            <div
              key={b.emotion}
              className="balance-segment"
              style={{ width: `${(b.percentage / total) * 100}%`, background: accentColor }}
            />
          );
        })}
      </div>
      <div className="balance-legend">
        {balance.map((b) => {
          const accentColor = emotionAccentColors[b.emotion] ?? fallbackAccentColor;
          return (
            <div key={b.emotion} className="balance-item">
              <div className="balance-dot" style={{ background: accentColor }} />
              <span className="balance-emotion">{b.emotion}</span>
              <span className="balance-percentage">{b.percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatThoughtDate(thought: Thought) {
  if (!thought.createdAt?.toDate) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(thought.createdAt.toDate());
}
