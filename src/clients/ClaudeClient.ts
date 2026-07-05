import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from '../env';
const ClaudeClient = new Anthropic({
    apiKey: ANTHROPIC_API_KEY
});

export default ClaudeClient;