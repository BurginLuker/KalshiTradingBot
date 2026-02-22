import {
    Configuration
} from 'kalshi-typescript';

const KalshiConfiguration = new Configuration({
    apiKey: process.env.KALSHI_API_KEY,
});

export default KalshiConfiguration;