const KELLY_MULTIPLIER = 0.33;

export interface KellySizing {
    kellyFraction: number;
    dollarAmount: number;
    contractCount: number;
}

export function computeKellyFraction(fairProbability: number, askPrice: number): number {
    const fullKelly = (fairProbability - askPrice) / (1 - askPrice);
    return fullKelly * KELLY_MULTIPLIER;
}

function computeDollarAmount(kellyFraction: number, bankroll: number): number {
    return kellyFraction * bankroll;
}

function computeContractCount(dollarAmount: number, askPrice: number): number {
    return Math.floor(dollarAmount / askPrice);
}

export function computeKellySizing(
    fairProbability: number,
    askPrice: number,
    bankroll: number,
): KellySizing {
    const kellyFraction = computeKellyFraction(fairProbability, askPrice);
    const dollarAmount = computeDollarAmount(kellyFraction, bankroll);
    const contractCount = computeContractCount(dollarAmount, askPrice);
    return { kellyFraction, dollarAmount, contractCount };
}
