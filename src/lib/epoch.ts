export type EpochUnit = "seconds" | "milliseconds";

export const IST_TIMEZONE = "Asia/Kolkata";
export const UTC_TIMEZONE = "UTC";

export function getMs(epoch: number, unit: EpochUnit) {
  return unit === "seconds" ? epoch * 1000 : epoch;
}

export function fmtTz(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
