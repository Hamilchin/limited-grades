import clsx from "clsx";

/** "{2}{W}{U/P}" as Scryfall's symbol images. */
const ManaCost = ({ cost, className }: { cost: string; className?: string }) => {
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!);
  if (symbols.length === 0) return null;
  return (
    <span className={clsx("inline-flex items-center gap-px align-middle", className)} aria-label={cost}>
      {symbols.map((symbol, i) => (
        <img
          // eslint-disable-next-line react/no-array-index-key
          key={`${symbol}-${i}`}
          src={`https://svgs.scryfall.io/card-symbols/${symbol.replace(/\//g, "")}.svg`}
          alt={`{${symbol}}`}
          className="size-[1em] rounded-full shadow-[-0.5px_1px_0_rgb(0_0_0/0.85)]"
        />
      ))}
    </span>
  );
};

export default ManaCost;
