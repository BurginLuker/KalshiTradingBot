import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { KALSHI_API_KEY } from '../keys';
import type { AccountBalance } from '../types';

class KalshiAccount {
    private apiKey: string;
    private privateKey: string;
    private baseUrl = 'api.elections.kalshi.com';
    private ORDER_PATH = '/trade-api/v2/portfolio/orders';
    private CENTS_PER_DOLLAR = 100;
    private YES_SIDE = 'yes';
    private BUY_ACTION = 'buy';
    private LIMIT_ORDER_TYPE = 'limit';

    constructor() {
        this.apiKey = KALSHI_API_KEY;
        const pemPath = path.join(__dirname, '../../kalshi-key.pem');
        this.privateKey = fs.readFileSync(pemPath, 'utf8');
    }

    private createSignature(timestamp: string, method: string, path: string): string {
        const pathWithoutQuery = path.split('?')[0];
        const message = `${timestamp}${method}${pathWithoutQuery}`;

        const sign = crypto.createSign('RSA-SHA256');
        sign.update(message);
        sign.end();

        const signature = sign.sign({
            key: this.privateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        });

        return signature.toString('base64');
    }

    private getCurrentTimestamp(): string {
        return Date.now().toString();
    }

    async getAccountBalance(): Promise<AccountBalance> {
        const method = 'GET';
        const path = '/trade-api/v2/portfolio/balance';
        const timestamp = this.getCurrentTimestamp();
        const signature = this.createSignature(timestamp, method, path);

        const url = `https://${this.baseUrl}${path}`;

        const response = await fetch(url, {
            method: method,
            headers: {
                'KALSHI-ACCESS-KEY': this.apiKey,
                'KALSHI-ACCESS-SIGNATURE': signature,
                'KALSHI-ACCESS-TIMESTAMP': timestamp
            }
        });

        const{balance: accountBalance, portfolio_value: activePositions}: any = await response.json();

        return {
            accountBalance: accountBalance / 100,
            activePositions: activePositions / 100,
        };
    }

    async placeOrder(ticker: string, yesPriceDecimal: number, contractCount: number): Promise<any> {
        const method = 'POST';
        const timestamp = this.getCurrentTimestamp();
        const signature = this.createSignature(timestamp, method, this.ORDER_PATH);

        const url = `https://${this.baseUrl}${this.ORDER_PATH}`;
        const body = this.buildOrderBody(ticker, yesPriceDecimal, contractCount);

        const response = await fetch(url, {
            method,
            headers: {
                'KALSHI-ACCESS-KEY': this.apiKey,
                'KALSHI-ACCESS-SIGNATURE': signature,
                'KALSHI-ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        return response.json();
    }

    private buildOrderBody(ticker: string, yesPriceDecimal: number, contractCount: number) {
        const yesPriceCents = Math.round(yesPriceDecimal * this.CENTS_PER_DOLLAR);
        return {
            ticker,
            side: this.YES_SIDE,
            action: this.BUY_ACTION,
            type: this.LIMIT_ORDER_TYPE,
            yes_price: yesPriceCents,
            count: contractCount,
        };
    }
}

export default new KalshiAccount();