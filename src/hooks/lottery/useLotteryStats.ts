import { useMemo } from "react";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { getLotteryStats } from "@/features/lottery/utils/stats-utils";
import { startOfToday, startOfWeek, startOfMonth, isWithinInterval, subDays } from "date-fns";
import { parseDrawDate } from "@/lib/draw-date";

export type TimeRange = "today" | "week" | "month" | "custom" | "all";

export function useLotteryStats(draws: DrawResult[], config: LotteryConfig, timeRange: TimeRange = "all", customInterval?: { start: Date; end: Date }) {
  const filteredDraws = useMemo(() => {
    if (timeRange === "all") return draws;

    const now = new Date();
    let interval: { start: Date; end: Date };

    switch (timeRange) {
      case "today":
        interval = { start: startOfToday(), end: now };
        break;
      case "week":
        interval = { start: startOfWeek(now), end: now };
        break;
      case "month":
        interval = { start: startOfMonth(now), end: now };
        break;
      case "custom":
        if (!customInterval) return draws;
        interval = customInterval;
        break;
      default:
        return draws;
    }

    return draws.filter(d => {
      const drawDate = parseDrawDate(d.date);
      if (!drawDate) return false;
      return isWithinInterval(drawDate, interval);
    });
  }, [draws, timeRange, customInterval]);

  return useMemo(() => 
    getLotteryStats(filteredDraws, config),
    [filteredDraws, config]
  );
}

