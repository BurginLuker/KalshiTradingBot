import { DISCORD_WEBHOOK } from '../env';
import Logger from '../utils/Logger';

export interface TradeNotification {
    eventTitle: string;
    ticker: string;
    yesSide: string;
    priceCents: number;
    contractCount: number;
    dollarAmount: number;
    fairProbability: number;
    edgePp: number;
    kellyFraction: number;
    bankroll: number;
    oddsFreshness: { title: string; age: string }[];
}

class DiscordNotifier {

    private WEBHOOK_URL = DISCORD_WEBHOOK;

    async sendTradeNotification(details: TradeNotification): Promise<void> {
        try {
            const embed = this.buildEmbed(details);
            await this.postWebhook({ embeds: [embed] });
        } catch (error) {
            Logger.log(`Discord notification failed: ${error}`);
        }
    }

    private buildEmbed(details: TradeNotification): object {
        return {
            title: `🏀 Trade Placed: ${details.yesSide} YES`,
            color: 0x00cc66,
            fields: [
                { name: 'Event', value: details.eventTitle, inline: false },
                { name: 'Ticker', value: details.ticker, inline: true },
                { name: 'Price', value: `${details.priceCents}¢`, inline: true },
                { name: 'Contracts', value: String(details.contractCount), inline: true },
                { name: 'Dollar Amount', value: `$${details.dollarAmount}`, inline: true },
                { name: 'Fair Prob', value: `${(details.fairProbability * 100).toFixed(1)}%`, inline: true },
                { name: 'Edge', value: `${details.edgePp.toFixed(1)}pp`, inline: true },
                { name: 'Kelly', value: `${(details.kellyFraction * 100).toFixed(1)}%`, inline: true },
                { name: 'Bankroll', value: `$${details.bankroll.toFixed(2)}`, inline: true },
                this.buildFreshnessField(details.oddsFreshness),
            ],
            timestamp: new Date().toISOString(),
        };
    }

    private buildFreshnessField(freshness: { title: string; age: string }[]): { name: string; value: string; inline: boolean } {
        if (freshness.length === 0) {
            return { name: 'Odds Freshness', value: 'N/A', inline: false };
        }

        const freshest = freshness[0];
        const stalest = freshness[freshness.length - 1];

        const lines = [
            `🟢 ${freshest.title} — ${freshest.age} ago`,
            `🔴 ${stalest.title} — ${stalest.age} ago`,
        ];

        return { name: 'Odds Freshness', value: lines.join('\n'), inline: false };
    }

    private async postWebhook(payload: object): Promise<void> {
        const response = await fetch(this.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            Logger.log(`Discord webhook returned status ${response.status}`);
        }
    }

}

export default new DiscordNotifier();
