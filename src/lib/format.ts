export const formatNumber = (value: number, fractionDigits = 0): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

export const formatPercentage = (value: number): string =>
  value.toLocaleString(undefined, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatPercentageDifference = (value: number): string => {
  const difference = (value * 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return value > 0 ? `+${difference}pp` : `${difference}pp`;
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export const timeAgo = (timestamp: number): string => {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(timestamp).toLocaleDateString();
};
