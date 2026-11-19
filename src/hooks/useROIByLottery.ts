import type { LotteryROI } from "@/engine/bankroll/bankrollEngine";

/** Never feed unverified saved-bet estimates into real-money bankroll sizing. */
export function useROIByLottery(): { data: LotteryROI[]; loading: boolean } {
  return { data: [], loading: false };
}
