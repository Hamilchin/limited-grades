import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import CardDetail from "../components/CardDetail";
import { Banner } from "../components/common";
import GradesTable from "../components/GradesTable";
import Modal from "../components/Modal";
import { matchesAttributeFilters } from "../lib/filters";
import { formatDate } from "../lib/format";
import type { Card } from "../lib/types";
import type { ViewProps } from "./SetShell";

const GradesPage = ({ set, payload, filters }: ViewProps) => {
  const [modalCard, setModalCard] = useState<Card>();
  const cards = useMemo(
    () => payload.cards.filter((card) => matchesAttributeFilters(card, filters)),
    [payload.cards, filters]
  );
  const { stats } = payload;
  const listsLink = (
    <Link to={`/${set.code}/lists${filters.search}`} className="font-medium underline">
      Rank the {payload.cards.length} cards yourself
    </Link>
  );

  return (
    <>
      {stats.kind !== "ok" && (
        <div className="pt-2">
          <Banner tone={stats.kind === "error" ? "warning" : "info"}>
            {stats.kind === "embargo" && (
              <>
                <strong>No 17Lands grades for {set.label} yet.</strong> It reaches Arena on {formatDate(stats.arenaStart)},
                and 17Lands asks tools to wait 12 days before showing a new set&apos;s data, so grades appear on{" "}
                {formatDate(stats.availableAt)}. {listsLink} in the meantime.
              </>
            )}
            {stats.kind === "none" && (
              <>
                <strong>17Lands has no {set.label} data yet.</strong> {listsLink} in the meantime.
              </>
            )}
            {stats.kind === "error" && <>Couldn&apos;t load 17Lands data: {stats.message}</>}
            {stats.kind === "disabled" && (
              <>
                <strong>This copy doesn&apos;t include 17Lands grades.</strong> See{" "}
                <a href={stats.cardDataUrl} target="_blank" rel="noreferrer" className="underline">
                  {set.label} on 17Lands
                </a>
                , or run the app locally to see them here. {listsLink}.
              </>
            )}
          </Banner>
        </div>
      )}
      <GradesTable cards={cards} deck={filters.deck} showSkeletons={false} onClickCard={setModalCard} />
      {modalCard && (
        <Modal title={modalCard.name} onClose={() => setModalCard(undefined)} className="size-full lg:size-fit">
          <CardDetail card={modalCard} />
        </Modal>
      )}
    </>
  );
};

export default GradesPage;
