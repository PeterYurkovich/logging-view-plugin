import { TimeRange, timeRangeIsNumber, timeRangeIsText, TimeRangeNumber } from './logs.types';
import { formatDate, formatTime, millisecondsFromDuration, units } from './value-utils';

export const CUSTOM_TIME_RANGE_KEY = 'CUSTOM';

export const timeRangeOptions = [
  { key: CUSTOM_TIME_RANGE_KEY, name: 'Custom time range' },
  { key: '5m', name: 'Last 5 minutes' },
  { key: '15m', name: 'Last 15 minutes' },
  { key: '30m', name: 'Last 30 minutes' },
  { key: '1h', name: 'Last 1 hour' },
  { key: '2h', name: 'Last 2 hours' },
  { key: '6h', name: 'Last 6 hours' },
  { key: '12h', name: 'Last 12 hours' },
  { key: '1d', name: 'Last 1 day' },
  { key: '2d', name: 'Last 2 days' },
  { key: '1w', name: 'Last 1 week' },
  { key: '2w', name: 'Last 2 weeks' },
];

export const defaultTimeRange = (now = Date.now()): TimeRangeNumber => ({
  start: now - 60 * 60 * 1000,
  end: now,
});

export const timeRangeFromDuration = (duration: string): TimeRange => ({
  start: `now-${duration}`,
  end: 'now',
});

export const numericTimeRange = (
  timeRange: TimeRange | undefined,
  now = Date.now(),
): TimeRangeNumber => {
  if (!timeRange) {
    return defaultTimeRange(now);
  }

  if (timeRangeIsNumber(timeRange)) {
    return timeRange;
  }

  if (timeRange.start.includes('now')) {
    const matches = timeRange.start.match(/now-([0-9]+[smhdwy])/);

    if (matches && matches.length > 0) {
      const duration = millisecondsFromDuration(matches[1]);

      return { start: now - duration, end: now };
    }
  } else {
    const numericStart = parseInt(timeRange.start);
    const numericEnd = parseInt(timeRange.end);

    if (!isNaN(numericStart) && !isNaN(numericEnd)) {
      return { start: numericStart, end: numericEnd };
    }
  }

  return defaultTimeRange(now);
};

export const timeOptionKeyFromRange = (timeRange: TimeRange | null): string | undefined => {
  if (!timeRange) {
    return undefined;
  }

  if (timeRangeIsText(timeRange)) {
    const { start } = timeRange;
    const matches = start.match(/now-([0-9]+[smhdwy])/);
    if (matches && matches.length > 0) {
      return matches[1];
    }
  }

  return CUSTOM_TIME_RANGE_KEY;
};

export const spanFromTimeRange = (timeRange: TimeRange, now = Date.now()): number => {
  const { start, end } = numericTimeRange(timeRange, now);
  return end - start;
};

const DEFAULT_INTERVAL = 1000;

/**
 *
 * @param timeRange time range to calculate the interval
 * @param now current date
 * @returns interval in milliseconds,
 * the interval is clamped to a single prometheus duration unit: [0-9]+[smhdwy]
 */
export const intervalFromTimeRange = (
  timeRange: TimeRange | undefined,
  now = Date.now(),
): number => {
  if (!timeRange) {
    return DEFAULT_INTERVAL;
  }

  const spanFromRange = spanFromTimeRange(timeRange, now);

  if (spanFromRange <= 0) {
    return DEFAULT_INTERVAL;
  }

  const interval = Math.floor(spanFromRange / 60);

  // Clamp interval to a single unit
  let selectedUnit = 's';
  for (const unit in units) {
    if (Math.floor(interval / units[unit]) > 0) {
      selectedUnit = unit;
      break;
    }
  }

  const clampedInterval = Math.floor(interval / units[selectedUnit]) * units[selectedUnit];

  return clampedInterval > 0 ? clampedInterval : DEFAULT_INTERVAL;
};

export const formatTimeRange = (timeRange: TimeRange): string => {
  const numericRange = numericTimeRange(timeRange);
  const start = `${formatDate(numericRange.start)} ${formatTime(numericRange.start)}`;
  const end = `${formatDate(numericRange.end)} ${formatTime(numericRange.end)}`;

  return `${start} - ${end}`;
};
