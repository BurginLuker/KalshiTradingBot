import { aggregateFairProbabilities, findEdges } from '../utils/oddsUtils';
import type { EdgeAnalysis } from '../utils/oddsUtils';
import type { KalshiEventMarketData, OddsEvent } from '../types';

export interface EdgeOpportunity {
    edge_event: EdgeAnalysis;
    reason: string;
}

// Decimal value for what the edge needs to be, 0.03 would be 3%
const MIN_EDGE_THRESHOLD = 0.025;

class EventAnalysis {

    analyzeEvent(kalshiMarketData: KalshiEventMarketData, oddsApiEventData: OddsEvent): EdgeOpportunity[] {
        const fairProbs = aggregateFairProbabilities(oddsApiEventData);
        const edges = findEdges(kalshiMarketData.markets, fairProbs);

        return edges
            .filter(edge => edge.edge >= MIN_EDGE_THRESHOLD)
            .sort((a, b) => b.edge - a.edge)
            .map(edge => this.buildOpportunity(edge));
    }

    private buildOpportunity(edge: EdgeAnalysis): EdgeOpportunity {
        const edgeStr = `+${(edge.edge * 100).toFixed(1)}pp`;
        const roiStr = `+${(edge.expectedValue * 100).toFixed(1)}%`;

        return {
            edge_event: edge,
            reason:
                `${edge.yesSide} YES @ ${(edge.kalshiYesAskPrice * 100).toFixed(0)}¢ | ` +
                `Fair: ${(edge.fairProbability * 100).toFixed(1)}% | ` +
                `Edge: ${edgeStr} | ROI: ${roiStr}`,
        };
    }

}

export default new EventAnalysis();
