# MONOPOLY BANKING COMPANION — FULL PROJECT PROMPT

---

> **SKILLS PRE-INSTALLED BEFORE THIS PROMPT:**
> The UI/UX skill and the MCP skill have both been installed from GitHub repositories into this project before this prompt was sent. You must read them before beginning any work.

> **ATTACHED FILES:**
> Two font files are attached to this conversation:
> - `Monopoly Bold.ttf`
> - `Monopoly Regular.ttf`
> These are the official Monopoly display fonts (free for commercial use). They must be embedded and used throughout the application's UI.

---

## PROJECT CONCEPT

You are building a **Monopoly Banking Companion** — a digital tool used **alongside a real physical Monopoly board**. This is NOT a standalone digital Monopoly game. Players still use the real board, roll real dice, and move real tokens. This application **replaces** only:

- All Monopoly paper money
- All property deed cards
- All Community Chest cards
- All Chance cards
- The need for a dedicated human banker

The board, dice, and player tokens remain physical. The app handles all financial transactions, property ownership, rent calculations, card draws, and player balance tracking. Think of it as replacing the Electronic Banking unit in Hasbro's "Monopoly Ultimate Banking" edition, but rebuilt as a beautiful, immersive, standalone mobile/web app.

---

## DEVELOPMENT PHASES

This project is to be completed in **exactly two phases**. Do not begin Phase 2 until Phase 1 is fully presented and confirmed.

---

### PHASE 1 — PLANNING

Before writing a single line of application code, you must:

1. **Outline the complete application architecture** — component tree, state management strategy, data models (players, properties, cards, game state).
2. **Define all user flows** — Setup Flow, Game Flow, Transaction Flow, Card Draw Flow, Trade Flow, Bankruptcy Flow, End Game Flow.
3. **Map every game rule** (listed in the Memory Dump section below) to a specific UI action, button, or automated trigger.
4. **Design the screen structure** — list every screen/view the app will have and describe its layout, components, and purpose.
5. **Specify all animations** — where animations appear, what triggers them, what they communicate.
6. **Plan the data model** — describe every object (Player, Property, Card, GameState) with fields and types.
7. **Identify all edge cases** — bankruptcy during a trade, building limit enforcement, jail rules, nearest railroad/utility logic, mortgage/unmortgage flows.
8. **Produce ASCII wireframes** for at least: the Setup Screen, the Main Game Dashboard, the Transaction Modal, the Property Detail Panel, the Card Draw Screen.
9. **Write a component inventory** — every React component needed, its props, and which state it reads/mutates.

Present the full Phase 1 plan. Wait for approval before proceeding to Phase 2.

---

### PHASE 2 — EXECUTING

Only after Phase 1 approval:

1. Build the complete React application as a single cohesive codebase.
2. The app must be fully functional — all rules enforced automatically, all transactions processed correctly, no manual overrides needed except those explicitly listed as player options.
3. Every feature listed in this prompt must be implemented.
4. Apply the exact visual design system defined below.
5. The application must be polished enough to use at an actual game night without confusion.

---

## APPLICATION FEATURES

### 1. SETUP SCREEN
- Players enter their name (2–8 players supported).
- Each player selects a token/piece from the classic set. No two players can share the same piece.
- **Custom Starting Balance Option**: Before starting, players can override the default $1,500 starting balance with any amount.
- **Rule Customization Panel**: Before starting, players can toggle individual rules on or off:
  - Free Parking jackpot (collect fines/taxes in center — house rule)
  - Auction unowned properties
  - No-build-on-mortgaged-color-group rule
  - Double salary on landing exactly on Go
  - Speed Die mode (simplified variant)
  - Any other house rules you identify as common
- Once all players are configured and rules are set, a "Start Game" button launches the main application.

### 2. MAIN GAME DASHBOARD
- Displays all players' current balances at a glance.
- Shows whose turn it is.
- Provides quick-action buttons for the active player:
  - **Buy Property** (input which property, triggers purchase from bank)
  - **Pay Rent** (input which property was landed on, app calculates correct rent and processes transfer)
  - **Draw Chance Card** (random draw, animated card flip, automatic effect applied)
  - **Draw Community Chest Card** (same as above)
  - **Build Houses / Hotel** (select property, select build count, app validates legality and deducts cost)
  - **Mortgage Property** (select property, validates legality, credits player)
  - **Unmortgage Property** (select property, deducts principal + 10% interest)
  - **Trade** (multi-step trading interface — see Trade Flow)
  - **Go to Jail** (manually triggered when player lands on Go to Jail space)
  - **Pay Jail Fine** (pay $50 and exit jail)
  - **Use Get Out of Jail Free** (consume card from inventory)
  - **Collect $200 Salary** (manual trigger for passing Go)
  - **Pay Income Tax** (choice between $200 or 10% of net worth)
  - **Pay Luxury Tax** ($75 auto-deducted)
  - **Declare Bankruptcy**
  - **End Turn**
- **Property Registry Panel**: A filterable, sortable list of all 28 properties + 4 railroads + 2 utilities, showing owner, color group, house/hotel count, mortgage status.
- **Game Log**: Scrollable timestamped log of every transaction and event.

### 3. TRANSACTION PROCESSING
- All money transfers are animated (coin/bill effect) and logged.
- Insufficient funds are flagged immediately — player is prompted to mortgage, sell houses, or declare bankruptcy.
- Rent calculations are fully automatic — app determines correct rent based on ownership, color monopoly status, house/hotel count, railroad count, and utility dice.
- For utility rent, the app prompts the active player to enter the dice roll value, then calculates x4 or x10.
- For nearest railroad/utility (from Chance), app determines which is nearest based on current board position input.

### 4. CARD DRAW SYSTEM
- Both decks are shuffled at game start and cycle when exhausted (no reshuffling until deck is empty).
- Card draw triggers a fullscreen animated card flip with the card text displayed.
- All automatic effects (advance to Go, collect money, pay money, go to jail) are applied immediately.
- "Get Out of Jail Free" cards are added to the drawing player's inventory.
- Cards that involve other players (Chairman of the Board, Birthday, Grand Opera Night) automatically process multi-player transfers.

### 5. TRADE INTERFACE
- Initiating player selects target player.
- Both sides of the trade can include: cash amounts, properties (from respective inventories), and "Get Out of Jail Free" cards.
- Trade validity is checked: mortgaged properties can transfer (new owner is notified and must pay 10% immediately or defer).
- Both players must confirm before the trade is executed.

### 6. BANKRUPTCY FLOW
- When a player declares bankruptcy:
  - If owed to another player: all assets (cash, properties, cards) transfer. Houses/hotels are returned to the bank at half their building cost before property transfers.
  - If owed to the bank: all assets return to the bank. Properties become available for auction or purchase again.
  - Bankrupt player is removed from the game.
  - A bankruptcy animation plays.

### 7. WIN CONDITION
- Game ends when only one player remains.
- Final screen shows the winner with celebration animation, final balance, and property portfolio summary.
- Option to start a new game.

### 8. PERSISTENT STATE
- Use persistent storage to save game state so the game can be resumed if the browser/app is refreshed.

---

## VISUAL DESIGN SYSTEM

The application must use a **classic Monopoly board game aesthetic** — rich, premium, table-game energy. Not flat or modern-minimal. Think mahogany, gold leaf, aged paper, and a banker's aesthetic.

### Color Palette

| Role | Name | Hex |
|---|---|---|
| Primary / Brand | Monopoly Red | `#E53935` |
| Base / Headers | Deep Navy | `#1E2A38` |
| Success / Secondary | Board Green | `#2E7D32` |
| Accent / Premium | Gold Accent | `#D4AF37` |
| Background | Cream White | `#F7F3E9` |
| Body Text | Charcoal | `#2B2B2B` |
| Links / Interactive | Sky Blue | `#4A90E2` |
| Borders / Dividers | Light Gray | `#E6E8EB` |

### Typography

- **Display / Headings / Titles / Buttons**: `Monopoly Bold` and `Monopoly Regular` (the `.ttf` files attached to this conversation). Embed using `@font-face`. Use for all game-critical text, property names, player names, and balance displays.
- **Paragraphs / Labels / Small Text / UI Copy**: `Pliant` (Google Fonts) — import from Google Fonts CDN.
- Establish a clear type scale: display (48–72px), H1 (36px), H2 (28px), H3 (22px), body (16px), small (13px), caption (11px).

### Component Design Language
- Cards and panels: slightly off-white (`#F7F3E9`) with `#D4AF37` gold border and subtle drop shadow — like a deed card.
- Buttons: rounded rectangle, `#E53935` primary, `#2E7D32` for confirm/success, `#1E2A38` for secondary actions.
- Input fields: parchment-style background, dark border.
- Property color groups: always rendered with their canonical Monopoly colors (see Memory Dump below).
- Player balance displays: styled like the LCD screen of an Electronic Banking unit — dark background, gold/green numerals, bordered panel.
- Background texture: subtle aged-paper or fine linen texture overlay on `#F7F3E9`.

### Animations
- **Money transfer**: animated coin/bill fly-across from one player card to another.
- **Card draw**: 3D card flip (CSS perspective), reveal face with color splash.
- **Property purchase**: deed card "slides" into the player's portfolio with a stamp effect.
- **Bankruptcy**: dramatic red overlay, crumple/dissolve effect on player card.
- **Win screen**: confetti, spotlight effect, trophy or crown animation.
- **Balance updates**: number counter animates (rolls up/down to new value).
- **Turn indicator**: glowing pulse on the active player's panel.
- All animations must respect `prefers-reduced-motion`.

---

## PLAYER TOKENS

Players choose from these classic and modern Monopoly tokens (display as illustrated icons):

| Token | Emoji Placeholder |
|---|---|
| Top Hat | 🎩 |
| Battleship | 🚢 |
| Racecar | 🏎️ |
| Scottie Dog | 🐕 |
| Boot | 👢 |
| Wheelbarrow | 🛺 |
| Cat | 🐱 |
| Iron | 🔧 |
| Thimble | 🪡 |
| Penguin | 🐧 |
| T-Rex | 🦖 |
| Rubber Duck | 🦆 |

Use SVG illustrations or emoji with styled containers. Each token gets a player-color ring indicator.

---

---

# ═══════════════════════════════════════════
# MEMORY DUMP — OFFICIAL HASBRO MONOPOLY DATA
# ═══════════════════════════════════════════
# Reference this data for all rule enforcement,
# rent calculations, card effects, and property logic.
# ═══════════════════════════════════════════

---

## ■ STARTING MONEY & BANK

**Default starting balance per player: $1,500**
Distributed as: 2×$500, 4×$100, 1×$50, 1×$20, 2×$10, 1×$5, 5×$1
(In the app, this is tracked as a single balance — distribution detail is informational only.)

**Bank supply (for enforcement of limits):**
- Houses: 32 total
- Hotels: 12 total
- If the supply runs out, no more of that type can be built until returned.

---

## ■ TURN ORDER

1. Highest single die roll goes first. Ties re-roll.
2. Play proceeds clockwise.
3. On your turn, roll dice and move.
4. If you roll doubles, take your turn, then roll again.
5. Roll doubles three times in a row → Go directly to Jail.

---

## ■ BOARD SPACES (40 total, in order)

| # | Space | Type |
|---|---|---|
| 1 | Go | Special — Collect $200 when passing or landing |
| 2 | Mediterranean Avenue | Brown Property |
| 3 | Community Chest | Draw Card |
| 4 | Baltic Avenue | Brown Property |
| 5 | Income Tax | Tax — pay $200 OR 10% of net worth (player's choice) |
| 6 | Reading Railroad | Railroad |
| 7 | Oriental Avenue | Light Blue Property |
| 8 | Chance | Draw Card |
| 9 | Vermont Avenue | Light Blue Property |
| 10 | Connecticut Avenue | Light Blue Property |
| 11 | Just Visiting / In Jail | Special |
| 12 | St. Charles Place | Pink Property |
| 13 | Electric Company | Utility |
| 14 | States Avenue | Pink Property |
| 15 | Virginia Avenue | Pink Property |
| 16 | Pennsylvania Railroad | Railroad |
| 17 | St. James Place | Orange Property |
| 18 | Community Chest | Draw Card |
| 19 | Tennessee Avenue | Orange Property |
| 20 | New York Avenue | Orange Property |
| 21 | Free Parking | Special (nothing official; optional house rule) |
| 22 | Kentucky Avenue | Red Property |
| 23 | Chance | Draw Card |
| 24 | Indiana Avenue | Red Property |
| 25 | Illinois Avenue | Red Property |
| 26 | B&O Railroad | Railroad |
| 27 | Atlantic Avenue | Yellow Property |
| 28 | Ventnor Avenue | Yellow Property |
| 29 | Water Works | Utility |
| 30 | Marvin Gardens | Yellow Property |
| 31 | Go to Jail | Special — move to Jail; do not pass Go, do not collect $200 |
| 32 | Pacific Avenue | Green Property |
| 33 | North Carolina Avenue | Green Property |
| 34 | Community Chest | Draw Card |
| 35 | Pennsylvania Avenue | Green Property |
| 36 | Short Line Railroad | Railroad |
| 37 | Chance | Draw Card |
| 38 | Park Place | Dark Blue Property |
| 39 | Luxury Tax | Tax — pay $75 |
| 40 | Boardwalk | Dark Blue Property |

---

## ■ COMPLETE PROPERTY DATA

### COLOR CODES FOR UI
- Brown: `#955436`
- Light Blue: `#AAE0FA`
- Pink/Magenta: `#D93A96`
- Orange: `#F7941D`
- Red: `#ED1B24`
- Yellow: `#FEF200`
- Green: `#1FB25A`
- Dark Blue: `#0072BB`
- Railroad: `#000000`
- Utility: `#AAAAAA`

---

### BROWN GROUP (Color Group Size: 2)
**House/Hotel Build Cost: $50**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| Mediterranean Avenue | $60 | $30 | $2 | $10 | $30 | $90 | $160 | $250 |
| Baltic Avenue | $60 | $30 | $4 | $20 | $60 | $180 | $320 | $450 |

---

### LIGHT BLUE GROUP (Color Group Size: 3)
**House/Hotel Build Cost: $50**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| Oriental Avenue | $100 | $50 | $6 | $30 | $90 | $270 | $400 | $550 |
| Vermont Avenue | $100 | $50 | $6 | $30 | $90 | $270 | $400 | $550 |
| Connecticut Avenue | $120 | $60 | $8 | $40 | $100 | $300 | $450 | $600 |

---

### PINK (MAGENTA) GROUP (Color Group Size: 3)
**House/Hotel Build Cost: $100**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| St. Charles Place | $140 | $70 | $10 | $50 | $150 | $450 | $625 | $750 |
| States Avenue | $140 | $70 | $10 | $50 | $150 | $450 | $625 | $750 |
| Virginia Avenue | $160 | $80 | $12 | $60 | $180 | $500 | $700 | $900 |

---

### ORANGE GROUP (Color Group Size: 3)
**House/Hotel Build Cost: $100**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| St. James Place | $180 | $90 | $14 | $70 | $200 | $550 | $750 | $950 |
| Tennessee Avenue | $180 | $90 | $14 | $70 | $200 | $550 | $750 | $950 |
| New York Avenue | $200 | $100 | $16 | $80 | $220 | $600 | $800 | $1,000 |

---

### RED GROUP (Color Group Size: 3)
**House/Hotel Build Cost: $150**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| Kentucky Avenue | $220 | $110 | $18 | $90 | $250 | $700 | $875 | $1,050 |
| Indiana Avenue | $220 | $110 | $18 | $90 | $250 | $700 | $875 | $1,050 |
| Illinois Avenue | $240 | $120 | $20 | $100 | $300 | $750 | $925 | $1,100 |

---

### YELLOW GROUP (Color Group Size: 3)
**House/Hotel Build Cost: $150**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| Atlantic Avenue | $260 | $130 | $22 | $110 | $330 | $800 | $975 | $1,150 |
| Ventnor Avenue | $260 | $130 | $22 | $110 | $330 | $800 | $975 | $1,150 |
| Marvin Gardens | $280 | $140 | $24 | $120 | $360 | $850 | $1,025 | $1,200 |

---

### GREEN GROUP (Color Group Size: 3)
**House/Hotel Build Cost: $200**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| Pacific Avenue | $300 | $150 | $26 | $130 | $390 | $900 | $1,100 | $1,275 |
| North Carolina Avenue | $300 | $150 | $26 | $130 | $390 | $900 | $1,100 | $1,275 |
| Pennsylvania Avenue | $320 | $160 | $28 | $150 | $450 | $1,000 | $1,200 | $1,400 |

---

### DARK BLUE GROUP (Color Group Size: 2)
**House/Hotel Build Cost: $200**

| Property | Buy | Mortgage | Rent | 1H | 2H | 3H | 4H | Hotel |
|---|---|---|---|---|---|---|---|---|
| Park Place | $350 | $175 | $35 | $175 | $500 | $1,100 | $1,300 | $1,500 |
| Boardwalk | $400 | $200 | $50 | $200 | $600 | $1,400 | $1,700 | $2,000 |

---

### RAILROADS (4 total — buy price: $200 each, mortgage: $100 each)

**Rent by number of railroads owned by the same player:**
- 1 Railroad: $25
- 2 Railroads: $50
- 3 Railroads: $100
- 4 Railroads: $200

**Chance Card "Advance to Nearest Railroad" Rule:**
Player pays TWICE the normal railroad rent to the owner if it is already owned.

---

### UTILITIES (2 total — buy price: $150 each, mortgage: $75 each)

**Electric Company** and **Water Works**

- 1 Utility owned by same player: Tenant rolls dice and pays **4× the dice total**.
- Both Utilities owned by same player: Tenant rolls dice and pays **10× the dice total**.

**Chance Card "Advance to Nearest Utility" Rule:**
If owned, tenant rolls dice and pays **10× the dice total** regardless of how many utilities the owner holds.

---

## ■ RENT RULES (IMPORTANT LOGIC)

1. **Unimproved Monopoly (all properties in color group owned, no houses):** Rent is **doubled** from the base rent printed.
2. Houses and hotels override the monopoly doubling — use house/hotel rent from the table instead.
3. Rent cannot be collected if the property is **mortgaged** (no rent owed at all).
4. Owner must demand rent **before** the next player rolls. If missed, rent is forfeited.
5. In this app, rent is shown as a prompt to the active player when they tap "Pay Rent." The app calculates automatically.

---

## ■ BUYING PROPERTY

1. When a player lands on an unowned property, they may buy it at the listed price.
2. If they decline (or cannot afford it), the property goes to **auction** (if that rule is active).
3. **Auction**: Any player (including the one who declined) can bid. Bidding starts at $1. Highest bidder pays the bank.

---

## ■ BUILDING HOUSES & HOTELS

1. Player must own **all properties in a color group** to build.
2. **No property in the group can be mortgaged** while building.
3. Houses must be built **evenly** — no property may have more than one more house than any other in the group.
4. Similarly, houses must be **sold evenly** (you cannot remove all houses from one property while another still has them, unless selling the whole group evenly).
5. **32 houses** in the bank. If exhausted, no more houses can be built until returned.
6. **12 hotels** in the bank. To build a hotel: pay hotel cost (same as one house for that group) and return all 4 houses from that property to the bank. If the bank has no houses to take back (hotel conversion requires returning 4 houses), the hotel still replaces them — houses are "absorbed."
7. **Selling houses/hotels back to the bank:** Sell at **half the build price** each.

---

## ■ MORTGAGING

1. Mortgage value = exactly half the property's purchase price.
2. To mortgage: sell all houses/hotels on the color group first (back to bank at half price), then flip the property to its mortgage value.
3. To **unmortgage**: pay the bank the mortgage value **plus 10% interest** (i.e., mortgage value × 1.1, rounded to nearest dollar).
4. A mortgaged property **cannot collect rent**.
5. When a mortgaged property is **traded**: new owner immediately pays the bank 10% of the mortgage value as an interest fee. They may then unmortgage at the full rate (mortgage value + 10%) at any time later.

---

## ■ JAIL

**Going to Jail triggers on:**
- Landing on the "Go to Jail" space (board space 31).
- Drawing a "Go to Jail" Chance or Community Chest card.
- Rolling doubles three times in a row on the same turn.

**While in Jail:**
- Player moves token to Jail (not Just Visiting).
- Player does NOT collect $200 for passing Go when sent to Jail.
- On subsequent turns, player can:
  - **Option A:** Roll dice. If doubles are rolled, player moves out that many spaces and their turn ends (they do NOT get another roll for the doubles while in jail). Track this as turn 1.
  - **Option B:** Pay $50 fine BEFORE rolling, then roll and move normally.
  - **Option C:** Use a "Get Out of Jail Free" card BEFORE rolling, then roll and move normally.
- After **3 turns** in jail without getting out, player **must** pay the $50 fine on the third turn, then roll and move.
- Player **can still collect rent** on their properties while in jail.

---

## ■ TAXES

- **Income Tax (Space 5):** Player pays $200 OR 10% of their total net worth — player's choice. Net worth = cash + unmortgaged property values + half mortgage value of mortgaged properties + cost of all houses (at build price) + cost of all hotels (at build price).
- **Luxury Tax (Space 39):** Pay $75. Flat, no choice.
- **Free Parking (Space 21):** Officially nothing. House rule: all taxes and fines collected into a jackpot paid to first player to land here exactly.

---

## ■ PASSING GO

- Collect **$200** every time you pass or land on Go.
- You do NOT collect $200 when sent to Jail directly (Go to Jail space, card, or triple doubles).
- Optional house rule (configurable): collect $400 for landing EXACTLY on Go.

---

## ■ TRADING

Players may trade at **any time**, including between turns:
- Can trade: **cash**, **title deeds** (properties), **"Get Out of Jail Free" cards**.
- Cannot trade: houses, hotels, mortgaged-state changes (property transfers with mortgage intact).
- When a mortgaged property changes hands: new owner pays bank 10% of mortgage value immediately as interest fee.
- Both parties must agree. The app requires both players to confirm.
- Future promises (e.g., "I'll pay you $100 next turn") are not enforceable — app only processes immediate cash/property transfers.

---

## ■ BANKRUPTCY

A player is **bankrupt** when they owe more than they can possibly raise (even after mortgaging all properties and selling all buildings).

- **Bankrupt to a player:**
  - All remaining cash goes to that player.
  - All properties transfer to that player (with houses/hotels first sold back to bank at half price).
  - All "Get Out of Jail Free" cards transfer.
  - Mortgaged properties transfer; new owner pays 10% bank fee on each.

- **Bankrupt to the bank:**
  - All assets returned to bank.
  - Properties immediately go to auction.
  - Bankrupt player is eliminated.

---

## ■ AUCTIONS

- Triggered when: (a) player declines to buy an unowned property, or (b) bankrupted player's properties return to bank.
- Any player may bid, starting at $1.
- Bidding proceeds until no higher bid. Winner pays the bank.
- App must provide a bidding interface.

---

## ■ END OF GAME

- Game ends when all players but one are bankrupt.
- Last surviving player wins.
- Optional: players can agree to count total net worth and declare the wealthiest player the winner if the game is taking too long.

---

---

## ■ ALL 16 CHANCE CARDS

*(Displayed on a cream/parchment orange-bordered card face in the app)*

| # | Card Text | Effect |
|---|---|---|
| C1 | **Advance to Go.** Collect $200. | Move to Go, collect $200. |
| C2 | **Advance to Illinois Ave.** If you pass Go, collect $200. | Move to Illinois Avenue (space 25). Collect $200 if passing Go. |
| C3 | **Advance to St. Charles Place.** If you pass Go, collect $200. | Move to St. Charles Place (space 12). Collect $200 if passing Go. |
| C4 | **Advance token to nearest Railroad.** If unowned, you may buy it from the Bank. If owned, pay owner **twice** the rental to which they are otherwise entitled. | Find nearest Railroad from current position. Pay double rent if owned. |
| C5 | **Advance token to nearest Railroad.** If unowned, you may buy it from the Bank. If owned, pay owner **twice** the rental to which they are otherwise entitled. | (Duplicate of C4 — both exist in the deck.) |
| C6 | **Advance token to nearest Utility.** If unowned, you may buy it from the Bank. If owned, throw dice and pay owner **10 times** the amount thrown. | Find nearest Utility from current position. If owned, player rolls dice, pays 10× dice total. |
| C7 | **Bank pays you dividend of $50.** | Collect $50 from bank. |
| C8 | **Get Out of Jail Free.** This card may be kept until needed or sold. | Player receives Get Out of Jail Free card (Chance type). |
| C9 | **Go Back 3 Spaces.** | Move backward 3 spaces from current position. Apply effects of new space. |
| C10 | **Go to Jail.** Go directly to Jail. Do not pass Go, do not collect $200. | Player goes directly to Jail. |
| C11 | **Make general repairs on all your property.** For each house pay $25, for each hotel pay $100. | Calculate: (houses × $25) + (hotels × $100). Deduct from player. |
| C12 | **Pay poor tax of $15.** | Pay $15 to the bank. |
| C13 | **Take a trip to Reading Railroad.** If you pass Go, collect $200. | Move to Reading Railroad (space 6). Collect $200 if passing Go. |
| C14 | **Take a walk on the Boardwalk.** Advance token to Boardwalk. | Move to Boardwalk (space 40). Collect $200 if passing Go. |
| C15 | **You have been elected Chairman of the Board.** Pay each player $50. | Pay $50 to every other player. |
| C16 | **Your building and loan matures.** Collect $150. | Collect $150 from bank. |

---

---

## ■ ALL 16 COMMUNITY CHEST CARDS

*(Displayed on a cream/parchment blue-bordered card face in the app)*

| # | Card Text | Effect |
|---|---|---|
| CC1 | **Advance to Go.** Collect $200. | Move to Go, collect $200. |
| CC2 | **Bank error in your favor.** Collect $200. | Collect $200 from bank. |
| CC3 | **Doctor's fees.** Pay $50. | Pay $50 to bank. |
| CC4 | **From sale of stock you get $50.** | Collect $50 from bank. |
| CC5 | **Get Out of Jail Free.** This card may be kept until needed or sold. | Player receives Get Out of Jail Free card (Community Chest type). |
| CC6 | **Go to Jail.** Go directly to Jail. Do not pass Go, do not collect $200. | Player goes directly to Jail. |
| CC7 | **Grand Opera Night.** Collect $50 from every player for opening night seats. | Collect $50 from each other player. |
| CC8 | **Holiday Fund matures.** Receive $100. | Collect $100 from bank. |
| CC9 | **Income tax refund.** Collect $20. | Collect $20 from bank. |
| CC10 | **It is your birthday.** Collect $10 from every player. | Collect $10 from each other player. |
| CC11 | **Life insurance matures.** Collect $100. | Collect $100 from bank. |
| CC12 | **Pay hospital fees of $100.** | Pay $100 to bank. |
| CC13 | **Pay school fees of $150.** | Pay $150 to bank. |
| CC14 | **Receive $25 consultancy fee.** | Collect $25 from bank. |
| CC15 | **You are assessed for street repairs.** $40 per house, $115 per hotel. | Calculate: (houses × $40) + (hotels × $115). Deduct from player. |
| CC16 | **You have won second prize in a beauty contest.** Collect $10. | Collect $10 from bank. |

---

---

## ■ NEAREST RAILROAD / UTILITY LOGIC

For Chance cards C4, C5 (nearest Railroad) and C6 (nearest Utility), the app must calculate from the player's **current board position**:

**Railroads at board positions:** 6 (Reading), 16 (Pennsylvania), 26 (B&O), 36 (Short Line).
**Utilities at board positions:** 13 (Electric Company), 29 (Water Works).

Nearest = smallest clockwise distance from current position. The board is circular (position 40 wraps to position 1/Go).

---

## ■ NET WORTH CALCULATION (for Income Tax & Endgame)

Net Worth = Cash in hand
+ Purchase price of all unmortgaged properties owned
+ (Mortgage value of all mortgaged properties) — i.e., half the purchase price
+ (Houses owned × build cost per house for that color group)
+ (Hotels owned × build cost per hotel for that color group)

---

## ■ HOUSE/HOTEL BUILDING COSTS BY COLOR GROUP

| Color Group | House Cost | Hotel Cost (per property) |
|---|---|---|
| Brown | $50 | $50 |
| Light Blue | $50 | $50 |
| Pink | $100 | $100 |
| Orange | $100 | $100 |
| Red | $150 | $150 |
| Yellow | $150 | $150 |
| Green | $200 | $200 |
| Dark Blue | $200 | $200 |

---

## ■ ELECTRONIC BANKING MONOPOLY — REFERENCE FEATURES TO REPLICATE

The original Hasbro Electronic Banking Monopoly unit provides:
- Individual debit cards for each player (each identified by a number 1–4 or 1–6).
- A central banking terminal with a numeric pad and card slot.
- Operations: Receive (salary, collected rents), Pay (purchase, rent, tax), Transfer (player to player for trades), Balance Check.
- The terminal stores all balances internally and processes them on card insertion.

**This app must replicate all of those functions** — but with a richer UI, mobile/web interface, support for up to 8 players, full card draw mechanics, and the complete visual Monopoly aesthetic described above. The app is more capable than the physical unit: it enforces all rules automatically, handles card effects without manual entry, and maintains complete game logs.

---

## ■ TECHNOLOGY STACK

- **Framework:** React (functional components with hooks)
- **Styling:** Tailwind CSS + custom CSS for the Monopoly-specific design tokens defined above
- **State Management:** React Context + useReducer (or Zustand if complexity demands it)
- **Persistence:** Browser localStorage / the persistent storage API available in this environment
- **Fonts:** Self-hosted via `@font-face` for Monopoly Bold/Regular (from attached TTF files); Google Fonts CDN for Pliant
- **Animations:** CSS transitions + keyframes; Framer Motion if available in the environment
- **Architecture:** Single-page app, component-based, no backend required

---

## ■ FINAL NOTES TO THE AI RECEIVING THIS PROMPT

1. **Read the UI/UX skill and MCP skill** installed in this project before beginning Phase 1.
2. **Do not start building until Phase 1 planning is approved.**
3. Every rule in this memory dump must be encoded in your application logic — not just displayed as text.
4. The app must handle every legal game state: 2-player games, 8-player games, all-railroads-owned scenarios, all-houses-exhausted scenarios, double-bankrupt edge cases, etc.
5. The experience should feel like a premium, polished product that could be sold on an app store. Every screen should be visually consistent and beautiful.
6. When in doubt about a rule, use the **official Hasbro Monopoly rules** as written above. Do not invent rules.
7. The two font TTF files (`Monopoly Bold.ttf` and `Monopoly Regular.ttf`) are attached to this conversation — use them via `@font-face` embedding.
8. The app is a **companion to a real physical board**. Players manually tell the app what happened (which property they landed on, whether they want to buy it, etc.). The app does NOT simulate dice rolling or board movement — that remains physical.

---

*End of Prompt. Begin with Phase 1.*
