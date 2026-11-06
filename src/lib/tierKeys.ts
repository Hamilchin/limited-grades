import type { Tier } from "./tierModel";

// Keyboard shortcuts for tiers: "B" → B, Shift+B → B+, Option/Alt+B → B-. Digits work the same
// way for numeric tiers ("4" → 4.0, Shift+4 → 4.5). Other labels use their first free letter.

export interface TierHotkey {
  key: string;
  shift: boolean;
  alt: boolean;
}

export const tierHotkeys = (tiers: Tier[]): Map<string, TierHotkey> => {
  const result = new Map<string, TierHotkey>();
  const taken = new Set<string>();
  const claim = (tierId: string, hotkey: TierHotkey) => {
    const id = `${hotkey.key}|${hotkey.shift}|${hotkey.alt}`;
    if (taken.has(id)) return false;
    taken.add(id);
    result.set(tierId, hotkey);
    return true;
  };
  for (const tier of tiers) {
    const letter = /^([a-z])([+-]?)$/i.exec(tier.label.trim());
    if (letter) {
      claim(tier.id, { key: letter[1]!.toLowerCase(), shift: letter[2] === "+", alt: letter[2] === "-" });
      continue;
    }
    const digit = /^(\d)(?:\.(\d))?$/.exec(tier.label.trim());
    if (digit && (!digit[2] || digit[2] === "0" || digit[2] === "5")) {
      claim(tier.id, { key: digit[1]!, shift: digit[2] === "5", alt: false });
    }
  }
  for (const tier of tiers) {
    if (result.has(tier.id)) continue;
    for (const char of tier.label.toLowerCase()) {
      if (/[a-z0-9]/.test(char) && claim(tier.id, { key: char, shift: false, alt: false })) break;
    }
  }
  return result;
};

/** The key a keyboard event stands for, from its physical key so Option+B still reads as "b". */
export const eventKey = (event: KeyboardEvent): string | null => {
  const letter = /^Key([A-Z])$/.exec(event.code);
  if (letter) return letter[1]!.toLowerCase();
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(event.code);
  if (digit) return digit[1]!;
  return null;
};

export const tierForEvent = (event: KeyboardEvent, tiers: Tier[], hotkeys: Map<string, TierHotkey>): Tier | null => {
  if (event.metaKey || event.ctrlKey) return null;
  const key = eventKey(event);
  if (!key) return null;
  return (
    tiers.find((tier) => {
      const hotkey = hotkeys.get(tier.id);
      return hotkey && hotkey.key === key && hotkey.shift === event.shiftKey && hotkey.alt === event.altKey;
    }) ?? null
  );
};

export const describeHotkey = (hotkey: TierHotkey | undefined): string =>
  hotkey ? `${hotkey.shift ? "⇧" : ""}${hotkey.alt ? "⌥" : ""}${hotkey.key.toUpperCase()}` : "";
