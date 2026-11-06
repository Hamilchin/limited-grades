import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CardPreviewLayer } from "../components/CardPreview";
import { Banner, Center, Spinner } from "../components/common";
import FilterBar from "../components/FilterBar";
import Footer from "../components/Footer";
import GradesTable from "../components/GradesTable";
import Header, { type NavItem } from "../components/Header";
import SearchModal from "../components/SearchModal";
import useFilters, { type FiltersState } from "../hooks/useFilters";
import usePrefs from "../hooks/usePrefs";
import useSetData from "../hooks/useSetData";
import useTierLists from "../hooks/useTierLists";
import type { MagicSet } from "../lib/sets";
import { TRANSITION_CLASSES } from "../lib/styles";
import type { Card, SetPayload } from "../lib/types";
import ComparePage from "./ComparePage";
import EditorPage from "./EditorPage";
import GradesPage from "./GradesPage";
import ListsPage from "./ListsPage";

export type View = "grades" | "lists" | "editor" | "compare";

export interface ViewProps {
  set: MagicSet;
  payload: SetPayload;
  filters: FiltersState;
}

type SearchExtras = ((card: Card) => ReactNode) | null;

const ShellContext = createContext<{
  setSearchExtras: Dispatch<SetStateAction<SearchExtras>>;
  openSearch: () => void;
  closeSearch: () => void;
}>({
  setSearchExtras: () => undefined,
  openSearch: () => undefined,
  closeSearch: () => undefined,
});

/** Lets a view add content to the search modal's card view (the editor adds tier buttons). */
export const useSearchExtras = (extras: SearchExtras): void => {
  const { setSearchExtras } = useContext(ShellContext);
  useEffect(() => {
    setSearchExtras(() => extras);
    return () => setSearchExtras(null);
  }, [extras, setSearchExtras]);
};

export const useSearchControls = (): { openSearch: () => void; closeSearch: () => void } => {
  const { openSearch, closeSearch } = useContext(ShellContext);
  return { openSearch, closeSearch };
};

const SetShell = ({ set, view }: { set: MagicSet; view: View }) => {
  const { data, previous, error, refreshing, refresh, retry } = useSetData(set.code);
  const filters = useFilters();
  const navigate = useNavigate();
  const { listId } = useParams();
  const { prefs } = usePrefs();
  const { lists } = useTierLists();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchExtras, setSearchExtras] = useState<SearchExtras>(null);

  const lastList = lists.find((l) => l.id === prefs.lastListBySet[set.code] && l.setCode === set.code);
  const listsTarget = view === "editor" && listId ? `/${set.code}/lists/${listId}` : lastList ? `/${set.code}/lists/${lastList.id}` : `/${set.code}/lists`;
  const nav: NavItem[] = [
    { key: "grades", label: "17Lands grades", to: `/${set.code}${filters.search}`, icon: "grades" },
    { key: "lists", label: "My tier lists", to: `${listsTarget}${filters.search}`, icon: "lists" },
    { key: "compare", label: "Compare", to: `/${set.code}/compare${filters.search}`, icon: "compare" },
  ];

  const changeSet = useCallback(
    (next: MagicSet) => {
      if (next.code === set.code) return;
      const path =
        view === "grades" ? `/${next.code}` : view === "compare" ? `/${next.code}/compare` : `/${next.code}/lists`;
      navigate(`${path}${filters.search}`);
    },
    [navigate, set.code, view, filters.search]
  );

  useEffect(() => {
    const titles: Record<View, string> = { grades: "", lists: " · Tier lists", editor: " · Tier list", compare: " · Compare" };
    document.title = `Limited Grades – ${set.label}${titles[view]}`;
  }, [set.label, view]);

  const shell = useMemo(
    () => ({ setSearchExtras, openSearch: () => setSearchOpen(true), closeSearch: () => setSearchOpen(false) }),
    []
  );
  const iconData = data?.iconData ?? (previous?.setCode === set.code ? previous.iconData : null);

  let body: ReactNode;
  if (data) {
    const props: ViewProps = { set, payload: data, filters };
    body =
      view === "grades" ? (
        <GradesPage {...props} />
      ) : view === "lists" ? (
        <ListsPage {...props} />
      ) : view === "editor" ? (
        <EditorPage {...props} />
      ) : (
        <ComparePage {...props} />
      );
  } else if (error) {
    body = (
      <div className="pt-4">
        <Banner tone="warning">
          Couldn&apos;t load {set.label}: {error}.{" "}
          <button type="button" className="underline" onClick={retry}>
            Try again
          </button>
        </Banner>
      </div>
    );
  } else if (view === "grades" && previous) {
    body = <GradesTable cards={previous.cards} deck={filters.deck} showSkeletons onClickCard={() => undefined} />;
  } else {
    body = (
      <Center className="h-64">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Spinner className="text-4xl" />
          <span>Loading {set.label}… the first visit fetches cards from Scryfall and 17Lands.</span>
        </div>
      </Center>
    );
  }

  return (
    <ShellContext.Provider value={shell}>
      <div
        className={clsx(
          "mx-auto flex min-h-full max-w-[1800px] flex-col px-2",
          "text-neutral-800 dark:text-neutral-100",
          TRANSITION_CLASSES
        )}
      >
        <Header nav={nav} active={view === "editor" ? "lists" : view} />
        <FilterBar
          set={set}
          iconData={iconData}
          onChangeSet={changeSet}
          filters={filters}
          onOpenSearch={() => data && setSearchOpen(true)}
        />
        <div className="grow">{body}</div>
        <Footer stats={data?.stats} onRefresh={refresh} refreshing={refreshing} />
      </div>
      {searchOpen && data && (
        <SearchModal cards={data.cards} onClose={() => setSearchOpen(false)} renderExtras={searchExtras ?? undefined} />
      )}
      <CardPreviewLayer />
    </ShellContext.Provider>
  );
};

export default SetShell;
