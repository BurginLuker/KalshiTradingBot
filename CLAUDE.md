# CLAUDE.md

## Project Overview

A TypeScript sports betting analysis bot that integrates with the Kalshi prediction market, Anthropic Claude API, and The Odds API.

## Tech Stack

- TypeScript (strict mode, ES2020 target, CommonJS modules)
- Node.js with ts-node for development
- Zod for schema validation
- External SDKs: Kalshi, Anthropic, The Odds API

## Project Structure

```
src/
├── agents/      # Business logic agents
├── clients/     # External service clients and configs
├── services/    # Domain-specific service wrappers
├── utils/       # Utility functions
├── keys.ts      # API keys and env config
└── index.ts     # Entry point
```

## Coding Style

### Keep Functions Small and Descriptive

Every function and method should do one thing. Name it so the reader knows what it does without reading the body. Prefer many small bite-sized methods over fewer large ones.

### No Long Conditionals or Nesting

Avoid deeply nested `if` statements and long conditional chains. If a function has more than one level of nesting, break it into smaller methods.

### Early Returns

Use early returns to handle edge cases and invalid states at the top of a function. Do not wrap the entire function body in a conditional.

```typescript
// Good
async getEvents() {
    const result = await this.fetchEvents();
    if (!result.data) throw new Error('Failed to get events');
    return result.data;
}

// Bad
async getEvents() {
    const result = await this.fetchEvents();
    if (result.data) {
        // ... lots of logic
    } else {
        throw new Error('Failed to get events');
    }
}
```

### No Magic Strings or Numbers

Extract magic values into descriptively named constants or variables. The reader should understand intent from the variable name alone.

```typescript
// Good
private MODEL = "claude-sonnet-4-6";
private MAX_TOKENS = 1024;

// Bad
const response = await client.create({ model: "claude-sonnet-4-6", max_tokens: 1024 });
```

### Clean and Simple

Favor straightforward code over clever solutions. If a chain of conditions is hard to follow, break it apart into named variables or helper methods that explain the logic.

## TypeScript Conventions

- Use `private` for internal class members and helper methods
- `async/await` for all asynchronous code — no raw promises or callbacks
- `any` is acceptable for rapid prototyping and external API responses
- Zod schemas for structured output validation
- Template literals for string interpolation and URL construction

## Naming

- **Files**: PascalCase for classes (`AnalysisAgent.ts`), camelCase for utilities (`positions.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TOKENS`, `MODEL`)
- **Variables/Methods**: camelCase, descriptive (`getAccountBalance`, `createSignature`)
- **Classes**: PascalCase (`TheOddsApi`, `KalshiAccount`)

## Module Patterns

- Default exports for singleton class instances (`export default new AnalysisAgent()`)
- Named imports for specific utilities and SDK types
- One class per file

## Formatting

- 4-space indentation
- Opening braces on the same line
- Single quotes preferred for strings, double quotes acceptable
- Template literals for interpolation and multi-line strings

### Blank Lines Between Logical Groups

Use blank lines within a function body to visually separate distinct steps or ideas. Group related statements together and leave a blank line between each group — do not treat the entire function as one unbroken block.

```typescript
async getTodaysEvents() {
    const cached = await this.getCachedTodaysEvents();
    if (cached && cached.length > 0) {
        Logger.log(`Cache hit — returning ${cached.length} events from Supabase`);
        return cached;
    }

    const events = await this.fetchFromApi();

    const todaysEvents = events.filter((event: any) => this.isToday(event));
    await this.upsertEvents(todaysEvents);

    return todaysEvents;
}
```

The cache check, the API fetch, the filter-and-upsert, and the return are each a distinct step. A blank line between them makes the function scannable at a glance.

## Workflow

- **Main context window** is for architecture, planning, and design discussion. Do not implement code directly in the main context.
- **Delegate all straightforward implementation tasks** (bug fixes, small features, refactors with clear instructions) to the implementation agent.
- **Give the implementation agent highly descriptive prompts.** The agent has no conversation history — it only knows what you tell it. Always include: exact file paths, the specific problem or change, the logic to implement, and any conventions to follow. Never assume the agent has context from the main conversation.
- Reserve the main context for reviewing agent output, making architectural decisions, and coordinating multi-step work.
