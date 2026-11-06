import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import useDarkMode from "../hooks/useDarkMode";
import { HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { LinkOut } from "./common";
import { CompareIcon, InfoIcon, ListIcon, MoonIcon, SunIcon } from "./icons";
import Modal from "./Modal";

export interface NavItem {
  key: string;
  label: string;
  to: string;
  icon?: "grades" | "lists" | "compare";
}

const AboutModal = ({ onClose }: { onClose: () => void }) => (
  <Modal title="About this project" onClose={onClose}>
    <div className="max-w-[80ch] space-y-4 lg:mr-11">
      <p>
        The grades page uses <LinkOut url="https://www.17lands.com/card_ratings">17Lands</LinkOut> Premier Draft data to
        assign letter grades to cards. It infers a normal distribution from the{" "}
        <LinkOut url="https://www.17lands.com/metrics_definitions#:~:text=Games%20in%20Hand%20Win%20Rate%20(GIH%20WR)">
          Games in Hand Win Rate
        </LinkOut>{" "}
        statistic and uses that distribution to assign a grade to each card. For example, a card with a win rate that is
        one standard deviation higher than the mean would get a B. Cards drawn fewer than 500 times are not included. A
        new set&apos;s grades appear 12 days after its Arena release, as 17Lands asks of tools that use its data.
      </p>
      <p>
        You can hover over cards to see card previews and click on cards to see a breakdown of how well the card does in
        different decks along with the full 17Lands stats.
      </p>
      <p>
        <strong>Tier lists</strong> are your own rankings of every card you can open in a booster, bonus sheet
        included. They&apos;re saved in this browser, export to plain text for friends, import from theirs, and compare
        side by side with each other or with the 17Lands grades.
      </p>
      <p>
        This is a personal, local version of{" "}
        <LinkOut url="https://www.limitedgrades.com">limitedgrades.com</LinkOut> by youssefm, whose source is on{" "}
        <LinkOut url="https://github.com/youssefm/limited-grades">GitHub</LinkOut> under the MIT license. Card data and
        images come from <LinkOut url="https://scryfall.com">Scryfall</LinkOut> and 17Lands.
      </p>
    </div>
  </Modal>
);

const NAV_ICONS = {
  grades: <span className="font-belerenSmallCaps text-[1.05em] leading-none">A+</span>,
  lists: <ListIcon />,
  compare: <CompareIcon />,
};

const Header = ({ nav, active }: { nav: NavItem[]; active: string }) => {
  const [showAbout, setShowAbout] = useState(false);
  const [, toggleDarkMode] = useDarkMode();
  return (
    <>
      <div className="flex flex-wrap items-center gap-y-2 px-2 py-4 lg:px-6">
        <Link to={nav[0]?.to ?? "/"} className="mr-2 shrink-0" aria-label="Limited Grades home">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={32} height={32} />
        </Link>
        <h1 className="mr-6 font-belerenSmallCaps text-2xl tracking-wide">Limited Grades</h1>
        <nav className="order-last flex w-full gap-1 lg:order-none lg:w-auto lg:grow" aria-label="Views">
          {nav.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              aria-current={item.key === active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-3 py-1",
                item.key === active
                  ? "bg-neutral-200 font-medium dark:bg-neutral-700"
                  : clsx("text-neutral-600 dark:text-neutral-300", HOVER_CLASSES),
                TRANSITION_CLASSES
              )}
            >
              {item.icon && NAV_ICONS[item.icon]}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center lg:ml-0">
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className={clsx("flex items-center gap-1", HOVER_CLASSES, TRANSITION_CLASSES)}
            aria-label="About this project"
          >
            <InfoIcon className="-mb-0.5" />
            <span className="hidden lg:inline">About this project</span>
          </button>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={clsx("ml-4 text-2xl", HOVER_CLASSES, TRANSITION_CLASSES)}
            aria-label="Toggle dark mode"
          >
            <SunIcon className="hidden dark:block" />
            <MoonIcon className="dark:hidden" />
          </button>
        </div>
      </div>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
};

export default Header;
