export type Thought = {
  title: string;
  date: string;
  emotion: string;
  place: string;
  summary: string;
};

export const thoughts: readonly Thought[] = [
  {
    title: "Mi cabeza estuvo pesada desde la tarde",
    date: "Hoy · 8:42 PM",
    emotion: "Ansioso",
    place: "Casa",
    summary:
      "Me costó concentrarme, pero escribirlo aquí me ayudó a identificar qué estaba disparando la ansiedad.",
  },
  {
    title: "Caminata con la mente más clara",
    date: "Ayer · 6:15 PM",
    emotion: "Calmo",
    place: "Parque",
    summary:
      "La caminata de la tarde me regresó un poco de orden mental. Quiero repetir esa rutina mañana.",
  },
  {
    title: "Reunión que me dejó cansado",
    date: "17 Ago · 11:05 AM",
    emotion: "Tenso",
    place: "Oficina",
    summary:
      "Salí con demasiadas cosas en la cabeza. Necesito separar lo urgente de lo que solo me está drenando.",
  },
];

export const emotionStats = [
  { label: "Calmo", value: 38, tone: "bg-[#8dbfaf]" },
  { label: "Ansioso", value: 24, tone: "bg-[#c78c74]" },
  { label: "Tenso", value: 18, tone: "bg-[#a28cbf]" },
  { label: "Centrado", value: 20, tone: "bg-[#d4b06f]" },
] as const;

export const quickTags = ["Trabajo", "Familia", "Noche", "Idea", "Salud"] as const;

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}