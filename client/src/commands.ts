export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export interface FuzzyResult {
  command: Command;
  score: number;
}

export function fuzzyMatch(query: string, text: string): number | null {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  let score = 0;
  let textIndex = 0;
  let prevMatchIndex = -2;

  for (let i = 0; i < lowerQuery.length; i++) {
    const char = lowerQuery[i];
    const foundIndex = lowerText.indexOf(char, textIndex);
    if (foundIndex === -1) return null;

    score += 1;

    if (foundIndex === prevMatchIndex + 1) {
      score += 2;
    }

    if (foundIndex === 0 || lowerText[foundIndex - 1] === " " || lowerText[foundIndex - 1] === "-") {
      score += 3;
    }

    prevMatchIndex = foundIndex;
    textIndex = foundIndex + 1;
  }

  score -= text.length * 0.01;
  return score;
}

export function fuzzySearch(commands: Command[], query: string): Command[] {
  if (query === "") return [...commands];

  const results: FuzzyResult[] = [];

  for (const command of commands) {
    const score = fuzzyMatch(query, command.label);
    if (score !== null) {
      results.push({ command, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.map((r) => r.command);
}
