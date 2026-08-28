"use client";

import { useEffect, useMemo, useState } from "react";
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

const auth = getFirebaseAuth();
const emotions = ["Serenidad", "Alegría", "Tristeza", "Enojo", "Angustia", "Envidia", "Ansiedad"];
const places = ["Casa", "Oficina", "Café", "Parque", "Viaje"];
const emptyDraft = { content: "", contentHtml: "", emotion: "Serenidad", place: "Casa" };
const emotionStyle: Record<string, { bg: string; border: string; textColor: string }> = {
  Alegría:   { bg: "#FAF9F3", border: "rgba(216,206,154,0.2)", textColor: "#8C8664" },
  Tristeza:  { bg: "#F9F3F2", border: "rgba(207,157,146,0.2)", textColor: "#87665F" },
  Enojo:     { bg: "#F4F6F6", border: "rgba(163,177,184,0.2)", textColor: "#6A7378" },
  Angustia:  { bg: "#F4F1F5", border: "rgba(163,141,173,0.2)", textColor: "#6A5C70" },
  Envidia:   { bg: "#F4F6F4", border: "rgba(165,179,161,0.2)", textColor: "#6B7469" },
  Ansiedad:  { bg: "#F9F6F9", border: "rgba(203,181,205,0.2)", textColor: "#847685" },
  Serenidad: { bg: "#FAF6F3", border: "rgba(212,182,158,0.2)", textColor: "#8A7667" },
  // Legacy names for existing thoughts
  Calmo:    { bg: "#F4F6F4", border: "rgba(165,179,161,0.2)", textColor: "#6B7469" },
  Ansioso:  { bg: "#F9F6F9", border: "rgba(203,181,205,0.2)", textColor: "#847685" },
  Tenso:    { bg: "#F4F6F6", border: "rgba(163,177,184,0.2)", textColor: "#6A7378" },
  Feliz:    { bg: "#FAF9F3", border: "rgba(216,206,154,0.2)", textColor: "#8C8664" },
  Triste:   { bg: "#F9F3F2", border: "rgba(207,157,146,0.2)", textColor: "#87665F" },
};
const fallbackEmotionStyle = { bg: "#FAF6F3", border: "rgba(212,182,158,0.2)", textColor: "#8A7667" };
const imgArrowLeftAlt = "https://www.figma.com/api/mcp/asset/c8334df2-da68-4d7d-ab99-3c6801a19ff4.svg";
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

type Screen = "home" | "editor" | "prompts" | "reading";

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
  const [filterSort, setFilterSort] = useState<"newest" | "oldest">("newest");

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

  const filteredThoughts = useMemo(() => {
    let result = [...thoughts];
    if (filterEmotion) result = result.filter((t) => t.emotion === filterEmotion);
    if (filterSort === "oldest") result.reverse();
    return result;
  }, [thoughts, filterEmotion, filterSort]);

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

  if (screen === "editor")
    return (
      <main className="core-app editor-screen">
        <Header screen={screen} onHome={backToHome} />
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
                <img src={imgArrowLeftAlt} alt="" width={24} height={24} />
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
      <Header screen={screen} onHome={backToHome} />
      <section className="home-hero" onClick={openEditor}>
        <p className="date-label">{today}</p>
        <div className="hero-question-wrap">
          <button className="hero-question" type="button">
            {heroText}<span className="hero-cursor" aria-hidden="true" />
          </button>
        </div>
        <p className="hero-hint">Tap anywhere in the question to begin</p>
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
            usedEmotions={usedEmotions}
            activeEmotion={filterEmotion}
            sort={filterSort}
            onEmotion={setFilterEmotion}
            onSort={setFilterSort}
          />
        )}
        <div className="thought-track">
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

function Header({ screen, onHome }: { screen: Screen; onHome: () => void }) {
  return (
    <header className="core-header">
      <button
        className={`nav-tab ${screen !== "prompts" ? "active" : ""}`}
        type="button"
        onClick={onHome}
      >
        Write
      </button>
      <button className="nav-tab" type="button">
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

function FilterBar({
  usedEmotions,
  activeEmotion,
  sort,
  onEmotion,
  onSort,
}: {
  usedEmotions: string[];
  activeEmotion: string | null;
  sort: "newest" | "oldest";
  onEmotion: (e: string | null) => void;
  onSort: (s: "newest" | "oldest") => void;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-emotions">
        <button
          type="button"
          className={`badge ${activeEmotion === null ? "is-active" : ""}`}
          onClick={() => onEmotion(null)}
        >
          All
        </button>
        {usedEmotions.map((emotion) => (
          <button
            key={emotion}
            type="button"
            className={`badge ${activeEmotion === emotion ? "is-active" : ""}`}
            onClick={() => onEmotion(activeEmotion === emotion ? null : emotion)}
          >
            {emotion}
          </button>
        ))}
      </div>
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
  return (
    <main className="core-app reading-screen">
      <Header screen="home" onHome={onBack} />
      <section className="reading-layout">
        <button
          className="icon-button back-button"
          type="button"
          aria-label="Back"
          onClick={onBack}
        >
          <img src={imgArrowLeftAlt} alt="" width={24} height={24} />
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
        <img src={imgArrowLeftAlt} alt="" width={24} height={24} />
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

function formatThoughtDate(thought: Thought) {
  if (!thought.createdAt?.toDate) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(thought.createdAt.toDate());
}
