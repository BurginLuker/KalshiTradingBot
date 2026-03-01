const FEE_RATE = 0.07;
const CENTS_PER_DOLLAR = 100;

export interface ExitDecision {
    shouldExit: boolean;
    isWrongSide: boolean;
    isProfitable: boolean;
    exitFeeCleared: boolean;
    currentEdge: number;
    exitFeeDollars: number;
}

// Kalshi's fee formula: ceil(0.07 × C × P × (1-P)), rounded up to the nearest cent.
// The fee is NOT a flat percentage — it is quadratic in price, peaking at P=0.50
// and falling toward zero as price approaches 0 or 1. This means exiting a position
// held at 23¢ costs less in fees than one held at 50¢, even for the same contract count.
// We must compute the actual fee at the current bid price, not use a flat approximation.
export function computeExitFee(contractCount: number, bidPrice: number): number {
    return Math.ceil(FEE_RATE * contractCount * bidPrice * (1 - bidPrice) * CENTS_PER_DOLLAR) / CENTS_PER_DOLLAR;
}

function computeCurrentEdge(fairProbability: number, currentBid: number): number {
    return fairProbability - currentBid;
}

function computeIsWrongSide(fairProbability: number, entryPrice: number): boolean {
    return fairProbability < entryPrice;
}

function computeIsProfitable(currentBid: number, entryPrice: number): boolean {
    return currentBid > entryPrice;
}

// Gross profit is the per-contract gain multiplied by contract count.
// The exit is only worth executing if that gross profit exceeds the fee Kalshi
// will charge on the sell order — otherwise we are paying to exit a winner early.
function computeExitFeeCleared(entryPrice: number, currentBid: number, contractCount: number): boolean {
    const grossProfit = (currentBid - entryPrice) * contractCount;
    const fee = computeExitFee(contractCount, currentBid);
    return grossProfit > fee;
}

function computeShouldExit(isWrongSide: boolean, isProfitable: boolean, exitFeeCleared: boolean): boolean {
    return isWrongSide && isProfitable && exitFeeCleared;
}

export function computeExitDecision(
    entryPrice: number,
    currentBid: number,
    fairProbability: number,
    contractCount: number,
): ExitDecision {
    const currentEdge = computeCurrentEdge(fairProbability, currentBid);
    const isWrongSide = computeIsWrongSide(fairProbability, entryPrice);
    const isProfitable = computeIsProfitable(currentBid, entryPrice);
    const exitFeeCleared = computeExitFeeCleared(entryPrice, currentBid, contractCount);
    const shouldExit = computeShouldExit(isWrongSide, isProfitable, exitFeeCleared);
    const exitFeeDollars = computeExitFee(contractCount, currentBid);

    return { shouldExit, isWrongSide, isProfitable, exitFeeCleared, currentEdge, exitFeeDollars };
}
