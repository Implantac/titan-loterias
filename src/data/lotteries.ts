export interface LotteryConfig {
  id: string;
  name: string;
  numbers: number;
  pick: number;
  color: string;
  icon: string;
}

export const LOTTERIES: LotteryConfig[] = [
  { id: "megasena", name: "Mega Sena", numbers: 60, pick: 6, color: "neon-green", icon: "🍀" },
  { id: "lotofacil", name: "Lotofácil", numbers: 25, pick: 15, color: "neon-blue", icon: "🎯" },
  { id: "quina", name: "Quina", numbers: 80, pick: 5, color: "neon-purple", icon: "⭐" },
  { id: "lotomania", name: "Lotomania", numbers: 100, pick: 50, color: "neon-amber", icon: "🔥" },
  { id: "duplasena", name: "Dupla Sena", numbers: 50, pick: 6, color: "neon-red", icon: "🎲" },
  { id: "timemania", name: "Timemania", numbers: 80, pick: 10, color: "neon-green", icon: "⚽" },
  { id: "diadesorte", name: "Dia de Sorte", numbers: 31, pick: 7, color: "neon-blue", icon: "☀️" },
  { id: "supersete", name: "Super Sete", numbers: 10, pick: 7, color: "neon-amber", icon: "7️⃣" },
  { id: "maismilionaria", name: "+Milionária", numbers: 50, pick: 6, color: "neon-purple", icon: "💰" },
  { id: "federal", name: "Federal", numbers: 99999, pick: 1, color: "neon-green", icon: "🏦" },
];

export interface DrawResult {
  concurso: number;
  date: string;
  numbers: number[];
}
