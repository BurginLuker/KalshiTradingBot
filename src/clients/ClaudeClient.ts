import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from "../keys";
const ClaudeClient = new Anthropic({
    apiKey: ANTHROPIC_API_KEY
});

export default ClaudeClient;