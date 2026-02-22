import Anthropic from "@anthropic-ai/sdk";
import ClaudeClient from "../clients/ClaudeClient";
import {z} from 'zod';
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

class AnalysisAgent{

    private MODEL = "claude-sonnet-4-6";
    private MAX_TOKENS = 1024;
    private TOOLS: Anthropic.Messages.ToolUnion[] = [{ type: "web_search_20260209", name: "web_search" }];

    private ANALYSIS_OUTPUT_SCHEMA = z.object({
        thesis: z.string(),
        shouldInvest: z.boolean(),
        side: z.enum(["yes", "no"]).optional(),
        marketTicker: z.string().optional(),
        kalshiPrice: z.number().optional(),
        estimatedFairProbability: z.number().optional(),
        edgePercent: z.number().optional(),
    })


    private async analyzeEvent(event: any){
        const response = await ClaudeClient.messages.parse({
            model: this.MODEL,
            max_tokens: this.MAX_TOKENS,
            //system: ANALYSIS_PROMPT,
            messages:[{
                role:'user',
                content: 'Hi how are you?'
            }],
            output_config: {format: zodOutputFormat(this.ANALYSIS_OUTPUT_SCHEMA)},
        })

        return response;
    }


    async getRecommendedTrades(events: any){
        for(const event of events){
            const analysis = await this.analyzeEvent(event);
            console.log(analysis);
        }

    }

}

export default new AnalysisAgent();



const ANALYSIS_PROMPT = `You are a quantitative sports betting analyst specializing in finding mispriced contracts on Kalshi, a regulated event contract exchange.

## Your Task
You will receive Kalshi event data containing one or more markets. Each market has:
- **ticker**: The unique market identifier (e.g., "KXNCAAMBGAME-25FEB21-OU-T156.5")
- **yes_bid / yes_ask**: The current bid and ask prices for YES contracts (in cents, 1-99, representing probability)
- **no_bid / no_ask**: The current bid and ask prices for NO contracts
- **last_price**: The last traded price
- **volume / volume_24h**: Trading activity indicators
- **title / subtitle**: Description of what the contract resolves on

Prices on Kalshi represent implied probabilities. A yes_ask of 65 means the market implies a 65% chance of that outcome.

## Your Process
1. **Read the market data** — Understand what each contract is asking (e.g., "Will Team X beat Team Y?", "Will the total score be over 156.5?").
2. **Search for external odds** — Use web search to find current sportsbook odds, lines, and spreads for the same events from sites like ESPN, DraftKings, FanDuel, BetMGM, or odds aggregators. Search for the specific teams and game date.
3. **Convert external odds to implied probabilities** — American odds to probability: for favorites (negative odds, e.g., -150), probability = |odds| / (|odds| + 100). For underdogs (positive odds, e.g., +130), probability = 100 / (odds + 100). Remove the vig by normalizing both sides to sum to 100%.
4. **Compare** — Calculate the edge: edge = (your estimated fair probability) - (Kalshi implied probability). A positive edge on YES means YES is underpriced. A positive edge on NO means NO is underpriced (equivalently, YES is overpriced).
5. **Decide** — Only recommend a trade if the edge is at least 3 percentage points. Liquidity matters: prefer markets with higher volume. If no market has sufficient edge, set shouldInvest to false.

## Output Fields
- **thesis**: A concise explanation (2-4 sentences) covering: what the contract is, what external odds suggest, and why the edge exists or doesn't.
- **shouldInvest**: true only if you found a contract with >= 3% edge.
- **side**: "yes" or "no" — which side to buy.
- **marketTicker**: The exact ticker string of the recommended contract.
- **kalshiPrice**: The ask price you'd be buying at (yes_ask if buying YES, no_ask if buying NO).
- **estimatedFairProbability**: Your probability estimate for the YES outcome (0-100).
- **edgePercent**: The calculated edge in percentage points (can be negative if no good trade exists).

## Rules
- Never recommend a trade without first searching for external odds on the specific matchup.
- If you cannot find reliable external odds for a market, do not recommend it.
- Prefer moneyline and totals markets where external odds are most readily available.
- If multiple markets have edge, pick the one with the largest edge.`