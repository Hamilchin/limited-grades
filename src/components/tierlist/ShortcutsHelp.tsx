import type { ReactNode } from "react";

import { describeHotkey, type TierHotkey } from "../../lib/tierKeys";
import type { Tier } from "../../lib/tierModel";
import { Kbd } from "../common";
import Modal from "../Modal";

const Row = ({ keys, children }: { keys: ReactNode; children: ReactNode }) => (
  <tr className="border-b border-neutral-200 last:border-0 dark:border-neutral-700">
    <td className="whitespace-nowrap py-1.5 pr-6">{keys}</td>
    <td className="py-1.5">{children}</td>
  </tr>
);

const ShortcutsHelp = ({ tiers, hotkeys, onClose }: { tiers: Tier[]; hotkeys: Map<string, TierHotkey>; onClose: () => void }) => (
  <Modal title="Keyboard shortcuts" onClose={onClose} className="w-full lg:w-[38rem]">
    <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
      Point at a card (or Tab to it), then press a key. Shortcuts work anywhere on the board and in the unranked panel.
    </p>
    <table className="w-full text-sm">
      <tbody>
        <Row
          keys={
            <span className="flex flex-wrap gap-1">
              {tiers.slice(0, 6).map((t) => (
                <Kbd key={t.id}>{describeHotkey(hotkeys.get(t.id)) || "—"}</Kbd>
              ))}
              {tiers.length > 6 && "…"}
            </span>
          }
        >
          Move the card to that tier ({tiers.slice(0, 3).map((t) => `${describeHotkey(hotkeys.get(t.id))} → ${t.label}`).join(", ")}…)
        </Row>
        <Row keys={<><Kbd>↑</Kbd> <Kbd>↓</Kbd></>}>One tier up or down (below the last tier is unranked)</Row>
        <Row keys={<><Kbd>⌥↑</Kbd> <Kbd>⌥↓</Kbd></>}>Move up or down within its tier</Row>
        <Row keys={<><Kbd>⌫</Kbd> or <Kbd>X</Kbd></>}>Send back to unranked</Row>
        <Row keys={<Kbd>Enter</Kbd>}>Open the card</Row>
        <Row keys={<Kbd>Q</Kbd>}>Quick rank: one card at a time</Row>
        <Row keys={<><Kbd>⌘Z</Kbd> <Kbd>⇧⌘Z</Kbd></>}>Undo and redo</Row>
        <Row keys={<Kbd>⌘K</Kbd>}>Search for a card</Row>
        <Row keys={<Kbd>Esc</Kbd>}>Cancel a drag</Row>
        <Row keys={<Kbd>?</Kbd>}>This list</Row>
      </tbody>
    </table>
    <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
      Drag cards to rank and reorder them. In the grid each card stays in its color&apos;s column, so just move it up or
      down. Double-click a tier&apos;s name to rename it.
    </p>
  </Modal>
);

export default ShortcutsHelp;
