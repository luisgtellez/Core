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

import { RichTextEditor } from "@/components/RichTextEditor";
import { getFirebaseAuth } from "@/lib/firebase";
import { createThought, subscribeThoughts, type Thought } from "@/lib/thoughts";

const auth = getFirebaseAuth();
const emptyThought = { content: "", contentHtml: "", emotion: "Calmo", place: "Casa" };
const emotions = ["Calmo", "Ansioso", "Tenso", "Feliz", "Triste"];
const places = ["Casa", "Oficina", "Café", "Parque", "Viaje"];
const imgArrowLeftAlt = "https://www.figma.com/api/mcp/asset/c8334df2-da68-4d7d-ab99-3c6801a19ff4.svg";

type Screen = "home" | "editor" | "prompts";

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
  const [draft, setDraft] = useState(emptyThought);
  const [editorVersion, setEditorVersion] = useState(0);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthLoading(false);
    if (!currentUser) setThoughts([]);
  }), []);

  useEffect(() => {
    if (!user) return;
    return subscribeThoughts(user.uid, setThoughts, (error) => setSaveError(`No se pudo sincronizar: ${error.message}`));
  }, [user]);

  useEffect(() => {
    if (screen !== "home") return;

    const handleScroll = () => setHasScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [screen]);

  const placesUsed = useMemo(() => new Set(thoughts.map((thought) => thought.place)).size, [thoughts]);

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

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !draft.content.trim()) {
      setSaveError("Escribe algo antes de guardar.");
      return;
    }
    setSaveBusy(true);
    setSaveError("");
    const content = draft.content.trim();
    try {
      const created = await createThought({ ...draft, content, contentText: content, userId: user.uid });
      setThoughts((current) => [{ id: created.id, ...draft, content, contentText: content, userId: user.uid, createdAt: null, updatedAt: null }, ...current]);
      setDraft(emptyThought);
      setEditorVersion((current) => current + 1);
      setScreen("home");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaveBusy(false);
    }
  }

  if (authLoading) return <div className="core-loading">Loading Core...</div>;

  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={authError} busy={authBusy} onSubmit={handleAuth} />;

  if (screen === "prompts") return <PromptScreen onBack={() => setScreen("home")} onChoose={(prompt) => { setDraft({ ...emptyThought, content: prompt, contentHtml: `<p>${prompt}</p>` }); setScreen("editor"); }} />;

  if (screen === "editor") return (
    <main className="core-app editor-screen">
      <Header screen={screen} onHome={() => setScreen("home")} />
      <section className="editor-layout">
        <button className="icon-button back-button" type="button" aria-label="Back" onClick={() => setScreen("home")}><img src={imgArrowLeftAlt} alt="" width={24} height={24} /></button>
        <form className="editor-form" onSubmit={handleSave}>
          <div className="editor-toolbar-row">
            <div />
            <RichTextEditor key={editorVersion} content={draft.contentHtml} onChange={(html, text) => setDraft((current) => ({ ...current, contentHtml: html, content: text }))} />
            <button className="save-link" type="submit" disabled={saveBusy}>{saveBusy ? "Saving" : "Save"}</button>
          </div>
          <p className="editor-prompt">I am thinking about...</p>
          <div className="editor-details">
            <label>Emotion<select value={draft.emotion} onChange={(event) => setDraft((current) => ({ ...current, emotion: event.target.value }))}>{emotions.map((emotion) => <option key={emotion}>{emotion}</option>)}</select></label>
            <label>Place<select value={draft.place} onChange={(event) => setDraft((current) => ({ ...current, place: event.target.value }))}>{places.map((place) => <option key={place}>{place}</option>)}</select></label>
          </div>
          {saveError && <p className="form-error editor-error">{saveError}</p>}
        </form>
      </section>
    </main>
  );

  return (
    <main className="core-app home-screen">
      <Header screen={screen} onHome={() => setScreen("home")} />
      <section className="home-hero" onClick={() => setScreen("editor")}>
        <p className="date-label">{new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p>
        <button className="hero-question" type="button">What are we thinking today?</button>
        <p className="hero-hint">Tap anywhere in the question to begin</p>
        <button className="prompt-button" type="button" onClick={(event) => { event.stopPropagation(); setScreen("prompts"); }}>Not sure where to start?</button>
      </section>
      <section className="past-thoughts" aria-label="Past thoughts"><div className="thought-track">{thoughts.length ? thoughts.map((thought) => <ThoughtCard key={thought.id} thought={thought} />) : <EmptyThought />}</div></section>
      {!hasScrolled && <div className="thoughts-overlay" aria-hidden="true" />}
      <footer className="home-footer"><span>{thoughts.length} thoughts · {placesUsed} places</span><button type="button" onClick={() => signOut(auth)}>Sign out</button></footer>
    </main>
  );
}

function AuthScreen({ mode, setMode, email, setEmail, password, setPassword, error, busy, onSubmit }: { mode: "login" | "register"; setMode: (mode: "login" | "register") => void; email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; error: string; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <main className="auth-shell"><section className="auth-card"><div className="auth-intro"><span className="wordmark">core</span><p className="eyebrow">A quiet place to come back to yourself</p><h1>Your thoughts,<br />held gently.</h1><p>Write what is present. Notice what returns. Keep it yours across every device.</p></div><form className="auth-form" onSubmit={onSubmit}><div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button></div><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit" disabled={busy}>{busy ? "Opening..." : mode === "login" ? "Enter Core" : "Create account"}</button></form></section></main>;
}

function Header({ screen, onHome }: { screen: Screen; onHome: () => void }) {
  return <header className="core-header"><button className={`nav-tab ${screen !== "prompts" ? "active" : ""}`} type="button" onClick={onHome}>Write</button><button className="nav-tab" type="button">Track</button></header>;
}

function ThoughtCard({ thought }: { thought: Thought }) {
  return <article className="thought-card"><p className="thought-date">{formatThoughtDate(thought)}</p>{thought.contentHtml ? <div className="thought-content rich-content" dangerouslySetInnerHTML={{ __html: thought.contentHtml }} /> : <h2>{thought.content}</h2>}<p className="thought-meta">{thought.emotion} · {thought.place}</p></article>;
}

function EmptyThought() {
  return <article className="thought-card empty-card"><p className="thought-date">Your first thought</p><h2>Your thoughts will live here.</h2><p className="thought-meta">Scroll to explore them later</p></article>;
}

function PromptScreen({ onBack, onChoose }: { onBack: () => void; onChoose: (prompt: string) => void }) {
  const prompts = ["What has been taking up space in your mind?", "What felt lighter today?", "What are you avoiding, and why?", "What would you like to remember about this moment?"];
  return <main className="core-app prompt-screen"><button className="icon-button prompt-back" type="button" aria-label="Back" onClick={onBack}><img src={imgArrowLeftAlt} alt="" width={24} height={24} /></button><div className="prompt-intro"><p className="eyebrow">A gentle beginning</p><h1>Not sure where to start?</h1><p>Choose a question and let the first sentence take care of itself.</p></div><div className="prompt-list">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => onChoose(prompt)}>{prompt}<span>↗</span></button>)}</div></main>;
}

function formatThoughtDate(thought: Thought) {
  if (!thought.createdAt?.toDate) return "Just now";
  return new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long" }).format(thought.createdAt.toDate());
}