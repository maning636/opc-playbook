# Plan · Catan: AI Wars

## Brief
Single-file web Catan clone in Game of Thrones aesthetic, 32-bit pixel art. The four houses are reskinned as AI labs: Anthropic, Google, OpenAI, X. Single-player vs 3 AI bots.

## Stack
- Single `game.html` file, no build step
- Vanilla JS + `<canvas>` for board and pieces
- Pixel-art tile sprites generated via an image gen API like Nano Banana 2 or GPT Image 2 (paid, approve cost before batch gen)
- No frameworks, no npm

## Scope

**Visuals**
- Hex board, 19 tiles, GoT terrain palette (forest, hills, fields, mountains, pastures, desert)
- 4 house banners reskinned: Anthropic clay, Google multicolour, OpenAI mint, X black-and-white
- Pixel-art dice, settlement, city, road, robber sprites
- Victory screen with winning house banner

**Functionality**
- Standard Catan rules, base set only
- Hex board with number tokens and 9 ports
- Dice roll, resource distribution to adjacent settlements
- 7 triggers robber move + 1-card steal
- Build roads / settlements / cities with cost enforcement
- Bank trades (4:1, 3:1 port, 2:1 port)
- Longest road and largest army bonuses
- 3 greedy-resource AI opponents

## Out of Scope
- No multiplayer networking
- No expansions (Seafarers, Cities & Knights)
- No save / load
- No music or SFX
- No dev cards beyond Knight + Victory Point

## Constraints
- One HTML file, all assets inline or generated at runtime
- Runs in modern browser, no external deps at runtime
- AI bots must complete a turn in under 1s
- No console errors during a full game

## Definition of Done
`game.html` opens in the browser, plays a complete game vs 3 AI bots from setup to a 10-VP win, declares the winning house on a victory screen, with zero console errors.

## Acceptance Criteria
- Board renders 19 hex tiles, 18 number tokens, 9 ports
- All 5 resources (brick, lumber, ore, grain, wool) distribute correctly on dice roll
- 4 houses pickable from a start menu, AI claims the other 3
- Settlement and road placement legal-checks pass
- Robber on 7 forces a discard + move + steal sequence
- Game ends the moment any player crosses 10 VP
- Winning house banner displays on the victory screen
- Pixel art renders crisp at 1x and 2x browser zoom

## Verification
- Open `game.html` in Chrome, play one full game vs 3 bots, console stays clean
- Visual check at 1x and 2x zoom
- Manually trigger a 7 roll, confirm robber sequence works end to end
- Manually trigger a 10-VP win, confirm victory screen shows the right house

## Turn Budget
Stop after 60 turns, or sooner once the DoD condition holds.

## References
- Catan base-set rulebook
- GoT house heraldry style (banner shapes, sigil silhouettes)
- 32-bit RPG pixel-art references (Stardew Valley, Octopath Traveler)

## Risks / Open Questions
- AI pathing could spiral if we let it minimax. Cap at greedy-resource heuristics.
- Pixel art consistency across tiles needs one locked prompt template per terrain type, gen all in a single batch.
- "No console errors during a full game" needs at least one human playthrough - /goal can't fully self-verify the UX path.

---

## /goal one-liner

```
/goal game.html opens in browser, plays a complete Catan match vs 3 AI bots, declares the winning house at 10 VP, zero console errors during full play, stop after 60 turns
```
