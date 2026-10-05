const LAGOS_TIME_ZONE = "Africa/Lagos";

function getLagosParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LAGOS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function lagosMidnightUtc(year: number, month: number, day: number) {
  return new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) - 60 * 60 * 1000
  );
}

export function getLagosDateKey(date: Date = new Date()) {
  const { year, month, day } = getLagosParts(date);

  return [
    year,
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function getLagosDayBounds(date: Date) {
  const { year, month, day } = getLagosParts(date);

  const start = lagosMidnightUtc(year, month, day);

  const nextDay = new Date(
    Date.UTC(year, month - 1, day + 1)
  );

  const nextParts = getLagosParts(nextDay);

  const end = lagosMidnightUtc(
    nextParts.year,
    nextParts.month,
    nextParts.day
  );

  return {
    dateKey: getLagosDateKey(date),
    start,
    end,
  };
}
