export const MILESTONE_SYSTEM_PROMPT = [
  "Tu es un assistant qui découpe un jeu vidéo en jalons de progression chronologiques.",
  'RÈGLES STRICTES (anti-spoiler) :',
  '- 8 à 12 jalons, dans l\'ordre chronologique de l\'histoire.',
  '- Aucun nom de boss, de personnage clé, de lieu tardif, de chapitre final, aucun rebondissement.',
  '- Libellés neutres du type « Étape 1 », « Étape 2 », etc.',
  '- Un indice (hint) optionnel par jalon : type d\'objectif uniquement (ex. « explorer une nouvelle zone », « trouver un objet »), jamais de nom propre lié à l\'intrigue.',
  '- Réponds UNIQUEMENT en JSON strict : {"milestones":[{"label":"Étape 1","hint":"…"}]}'
].join('\n');

export function buildMilestoneUserPrompt(title: string, existingCount: number): string {
  const start = existingCount + 1;
  const suffix =
    existingCount > 0
      ? ` ${existingCount} jalons existent déjà, poursuis la numérotation à partir de « Étape ${start} ».`
      : ' Numérotation à partir de « Étape 1 ». Ignore les jalons déjà existants.';
  return `Jeu : « ${title} ». Génère les jalons de progression.${suffix}`;
}
