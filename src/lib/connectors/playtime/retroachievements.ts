export interface RaProgressInfo {
  earned: number;
  total: number;
}

export function countEarned(json: unknown): RaProgressInfo | null {
  const achievements = (json as { Achievements?: Record<string, { DateEarned?: string | null }> })
    ?.Achievements;
  if (!achievements || typeof achievements !== 'object') return null;
  const values = Object.values(achievements);
  return {
    total: values.length,
    earned: values.filter((a) => typeof a?.DateEarned === 'string' && a.DateEarned).length
  };
}

export async function raUserProgress(
  username: string,
  apiKey: string,
  gameId: number
): Promise<RaProgressInfo | null> {
  const url = `https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?z=${encodeURIComponent(
    username
  )}&y=${encodeURIComponent(apiKey)}&g=${gameId}&u=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RetroAchievements : HTTP ${res.status}`);
  return countEarned(await res.json());
}
