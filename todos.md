# TODO

## Parallel Balance Read Issue in TradingBot.ts

**Problem**: When multiple TradingBot instances run concurrently (e.g., one for NBA, one for NHL), each independently reads the account balance in `executeOpportunity()` (line 226) for Kelly sizing. Two bots can read the same full balance simultaneously, compute Kelly sizing off that shared amount, and both place orders — effectively risking up to 2x what Kelly recommends.

**Suggested Fixes** (in order of preference):

1. **[RECOMMENDED] Divide the Bankroll**
   - Pass each bot a `maxBankroll` budget (e.g., `totalBalance / numSports`)
   - Each bot sizes positions only against its allocated budget
   - Prevents collective overcommitment without locks or sequential execution
   - Requires: Modify TradingBot constructor and executeOpportunity() to respect maxBankroll

2. Run Sports Sequentially
   - Execute each sport's analysis and trading one at a time instead of in parallel
   - Simple to implement but reduces concurrency and responsiveness

3. Shared Lock/Semaphore
   - Wrap executeOpportunity() with a mutex around balance reads and order placement
   - Adds complexity; limits parallel execution anyway
