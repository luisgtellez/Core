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

import { getFirebaseAuth } from "@/lib/firebase";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  createThought,
  subscribeThoughts,
  type Thought,
} from "@/lib/thoughts";

const auth = getFirebaseAuth();

const initialThoughtForm = {
  content: "",
  contentHtml: "",
  emotion: "Calmo",
  place: "Casa",
};

const emotionOptions = ["Calmo", "Ansioso", "Tenso", "Feliz", "Triste"];
const placeOptions = ["Casa", "Oficina", "Café", "Parque", "Viaje"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [thoughtForm, setThoughtForm] = useState(initialThoughtForm);
  const [editorVersion, setEditorVersion] = useState(0);
  const [thoughtBusy, setThoughtBusy] = useState(false);
  const [thoughtError, setThoughtError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setThoughts([]);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeThoughts(
      user.uid,
      (nextThoughts) => {
        setThoughts(nextThoughts);
        setThoughtError("");
      },
      (error) => {
        setThoughtError(
          `No se pudo leer el historial en tiempo real: ${error.message}`,
        );
      },
    );
    return unsubscribe;
  }, [user]);

  const stats = useMemo(() => {
    const uniqueEmotions = new Set(thoughts.map((thought) => thought.emotion));
    const uniquePlaces = new Set(thoughts.map((thought) => thought.place));

    return [
      { label: "Pensamientos", value: String(thoughts.length) },
      { label: "Emociones", value: String(uniqueEmotions.size) },
      { label: "Lugares", value: String(uniquePlaces.size) },
    ];
  }, [thoughts]);

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        return;
      }

      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo autenticar.";
      setAuthError(message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleThoughtSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setThoughtError("Necesitas iniciar sesión antes de guardar un pensamiento.");
      return;
    }

    if (!thoughtForm.content.trim()) {
      setThoughtError("Escribe algo antes de guardar.");
      return;
    }

    setThoughtBusy(true);
    setThoughtError("");
    const content = thoughtForm.content.trim();

    try {
      const created = await createThought({
        content,
        contentHtml: thoughtForm.contentHtml,
        contentText: content,
        emotion: thoughtForm.emotion,
        place: thoughtForm.place,
        userId: user.uid,
      });

      setThoughts((current) => [
        {
          id: created.id,
          content,
          contentHtml: thoughtForm.contentHtml,
          contentText: content,
          emotion: thoughtForm.emotion,
          place: thoughtForm.place,
          userId: user.uid,
          createdAt: null,
          updatedAt: null,
        },
        ...current,
      ]);

      setThoughtForm(initialThoughtForm);
      setEditorVersion((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el pensamiento.";
      setThoughtError(message);
    } finally {
      setThoughtBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setThoughts([]);
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(252,232,214,0.9),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(205,230,219,0.8),_transparent_28%),linear-gradient(180deg,_#f6f0e8_0%,_#efe7dc_100%)] px-4 py-4 text-[#211d1a] sm:px-6 sm:py-6 lg:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center rounded-[32px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_80px_rgba(75,55,34,0.12)] backdrop-blur sm:min-h-[calc(100vh-3rem)] sm:p-6 lg:p-8">
          <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="inline-flex rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-black/60">
                Core MVP
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-[#171411] sm:text-5xl">
                Tu diario privado, sincronizado entre dispositivos.
              </h1>
              <p className="max-w-xl text-base leading-7 text-black/65 sm:text-lg">
                Entra con correo y contraseña para empezar a escribir pensamientos,
                guardarlos en Firebase y verlos desde iPhone, iPad o desktop.
              </p>
              <ul className="space-y-2 text-sm leading-6 text-black/60 sm:text-base">
                <li>• Autenticación con Firebase Auth.</li>
                <li>• Pensamientos guardados en Firestore.</li>
                <li>• Sesión persistente en el navegador.</li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-black/8 bg-[#171411] p-5 text-white shadow-[0_20px_60px_rgba(23,20,17,0.18)] sm:p-6">
              <div className="flex gap-2 rounded-full bg-white/5 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 rounded-full px-4 py-2 transition ${
                    authMode === "login"
                      ? "bg-[#f5d6b3] text-[#1f160f]"
                      : "text-white/75"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 rounded-full px-4 py-2 transition ${
                    authMode === "register"
                      ? "bg-[#f5d6b3] text-[#1f160f]"
                      : "text-white/75"
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleAuthSubmit}>
                <label className="block space-y-2 text-sm text-white/75">
                  <span>Correo</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                    placeholder="tu-correo@ejemplo.com"
                    required
                  />
                </label>

                <label className="block space-y-2 text-sm text-white/75">
                  <span>Contraseña</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                    placeholder="********"
                    minLength={6}
                    required
                  />
                </label>

                {authError ? (
                  <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {authError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f5d6b3] px-5 text-sm font-semibold text-[#1f160f] transition hover:bg-[#f2cfa1] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {authBusy
                    ? "Procesando..."
                    : authMode === "login"
                      ? "Entrar"
                      : "Crear cuenta"}
                </button>

                <p className="text-xs leading-5 text-white/50">
                  Si eliges crear cuenta, Firebase la genera con ese correo y la
                  deja lista para guardar tus pensamientos.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(252,232,214,0.9),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(205,230,219,0.8),_transparent_28%),linear-gradient(180deg,_#f6f0e8_0%,_#efe7dc_100%)] px-4 py-4 text-[#211d1a] sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col rounded-[32px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_80px_rgba(75,55,34,0.12)] backdrop-blur sm:min-h-[calc(100vh-3rem)] sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-black/5 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="inline-flex rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-black/60">
              Core MVP
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#171411] sm:text-4xl">
              Hola, {user.email}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-black/60 sm:text-base">
              Escribe un pensamiento, guárdalo y mira cómo aparece en Firestore.
              Después pulimos la UI con Figma.
            </p>
            <p className="text-xs text-black/50">UID: {user.uid}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-black/60">
              Sesión activa
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-black/70 transition hover:bg-black hover:text-white"
            >
              Salir
            </button>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <article className="rounded-[28px] border border-black/8 bg-[#171411] p-5 text-white shadow-[0_20px_60px_rgba(23,20,17,0.18)] sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/55">
                    Nuevo pensamiento
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Guarda una entrada y la sincronizamos en Firebase.
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                  {thoughts.length} guardados
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleThoughtSubmit}>
                <label className="block space-y-2 text-sm text-white/75">
                  <span>¿Qué pasó hoy?</span>
                  <RichTextEditor
                    key={editorVersion}
                    content={thoughtForm.contentHtml}
                    onChange={(html, text) =>
                      setThoughtForm((current) => ({
                        ...current,
                        contentHtml: html,
                        content: text,
                      }))
                    }
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm text-white/75">
                    <span>Emoción</span>
                    <select
                      value={thoughtForm.emotion}
                      onChange={(event) =>
                        setThoughtForm((current) => ({
                          ...current,
                          emotion: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    >
                      {emotionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2 text-sm text-white/75">
                    <span>Lugar</span>
                    <select
                      value={thoughtForm.place}
                      onChange={(event) =>
                        setThoughtForm((current) => ({
                          ...current,
                          place: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    >
                      {placeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {thoughtError ? (
                  <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {thoughtError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={thoughtBusy}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f5d6b3] px-5 text-sm font-semibold text-[#1f160f] transition hover:bg-[#f2cfa1] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {thoughtBusy ? "Guardando..." : "Guardar pensamiento"}
                </button>
              </form>
            </article>

            <article className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-black/8 bg-white/86 p-4 shadow-[0_16px_36px_rgba(70,52,32,0.06)]"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-black/42">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-[#171411]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </article>
          </section>

          <aside className="rounded-[28px] border border-black/8 bg-white/86 p-5 shadow-[0_20px_50px_rgba(71,53,34,0.08)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-black/45">
                  Historial
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181411]">
                  Tus pensamientos recientes
                </h2>
              </div>
              <span className="rounded-full bg-[#efe3d3] px-3 py-1 text-xs font-medium text-black/60">
                Firestore
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {thoughts.length > 0 ? (
                thoughts.map((thought) => (
                  <article
                    key={thought.id}
                    className="rounded-[24px] border border-black/6 bg-[#fbf8f4] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {thought.contentHtml ? (
                          <div
                            className="rich-content text-base font-semibold text-[#1d1814]"
                            dangerouslySetInnerHTML={{ __html: thought.contentHtml }}
                          />
                        ) : (
                          <h3 className="text-base font-semibold text-[#1d1814]">
                            {thought.content}
                          </h3>
                        )}
                        <p className="mt-1 text-sm text-black/48">
                          {formatTimestamp(thought.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-medium text-black/55">
                        {thought.emotion}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-black/45">
                      <span>📍 {thought.place}</span>
                      <span>👤 {thought.userId.slice(0, 8)}</span>
                    </div>

                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-black/10 bg-[#fbf8f4] p-6 text-sm text-black/55">
                  Todavía no hay pensamientos guardados para esta cuenta.
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f0e8_0%,_#efe7dc_100%)] px-4 text-[#211d1a]">
      <div className="rounded-[28px] border border-white/70 bg-white/80 px-6 py-5 shadow-[0_20px_50px_rgba(75,55,34,0.12)] backdrop-blur">
        Cargando Core...
      </div>
    </main>
  );
}

function formatTimestamp(timestamp?: { toDate?: () => Date } | null) {
  if (!timestamp?.toDate) {
    return "Fecha pendiente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}
