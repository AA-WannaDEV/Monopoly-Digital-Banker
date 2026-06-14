// ═══════════════════════════════════════
// GAME ENGINE — State Management Core v3.0
// ═══════════════════════════════════════

import { PROPERTIES, COLOR_GROUPS, RAILROAD_RENT, RAILROAD_POSITIONS, UTILITY_POSITIONS } from '../data/properties.js';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../data/cards.js';
import { PLAYER_COLORS } from '../data/tokens.js';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uuid() {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function createPropertyStates() {
  const states = {};
  PROPERTIES.forEach(p => {
    states[p.id] = { ownerId: null, houses: 0, hasHotel: false, isMortgaged: false };
  });
  return states;
}

export function createInitialState() {
  return {
    phase: 'splash',
    settings: {
      startingBalance: 1500,
      rules: {
        freeParkingJackpot: false,
        auctionUnowned: true,
        noBuildOnMortgagedGroup: true,
        doubleSalaryOnGo: false,
        speedDie: false,
        useDigitalDice: false,
      },
    },
    players: [],
    activePlayerIndex: 0,
    turnNumber: 1,
    turnState: {
      hasPassedGo: false,
      hasPaidTax: false,
      hasBoughtProperty: false,
      hasDrawnCard: false,
      hasRolled: false,
      doublesCount: 0,
    },
    diceState: { die1: 1, die2: 1, rolling: false, isDoubles: false, totalRolls: 0 },
    propertyStates: createPropertyStates(),
    chanceDeck: shuffleArray([...CHANCE_CARDS]),
    chanceDiscardPile: [],
    communityChestDeck: shuffleArray([...COMMUNITY_CHEST_CARDS]),
    communityChestDiscardPile: [],
    bank: { housesRemaining: 32, hotelsRemaining: 12 },
    freeParkingPool: 0,
    log: [],
    _drawnCard: null,
    lastSaved: null,
  };
}

export function createPlayer(name, tokenId, colorIndex) {
  return {
    id: uuid(),
    name,
    token: tokenId,
    balance: 1500,
    ownedPropertyIds: [],
    isInJail: false,
    jailTurnsSpent: 0,
    getOutOfJailFreeCards: { chance: 0, communityChest: 0 },
    isBankrupt: false,
    bankruptOrder: null,
    boardPosition: 1,
    colorRing: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
    cardHistory: [],
  };
}

// ═══════════════════════════════════════
// RENT CALCULATOR — Fully validated against official Hasbro rules
// ═══════════════════════════════════════
export function calculateRent(propertyId, propertyStates, diceTotal, chanceCardOverride) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  const propState = propertyStates[propertyId];
  if (!propData || !propState || !propState.ownerId || propState.isMortgaged) return 0;

  const ownerId = propState.ownerId;

  if (propData.type === 'railroad') {
    const rrOwned = PROPERTIES.filter(p =>
      p.type === 'railroad' &&
      propertyStates[p.id]?.ownerId === ownerId &&
      !propertyStates[p.id]?.isMortgaged
    ).length;
    let rent = RAILROAD_RENT[rrOwned] || 0;
    if (chanceCardOverride?.doubleRent) rent *= 2;
    return rent;
  }

  if (propData.type === 'utility') {
    const utilOwned = PROPERTIES.filter(p =>
      p.type === 'utility' &&
      propertyStates[p.id]?.ownerId === ownerId &&
      !propertyStates[p.id]?.isMortgaged
    ).length;
    if (chanceCardOverride?.multiplier) return diceTotal * chanceCardOverride.multiplier;
    return diceTotal * (utilOwned >= 2 ? 10 : 4);
  }

  if (propData.type === 'property') {
    if (propState.hasHotel) return propData.rent.hotel;
    if (propState.houses > 0) return propData.rent[`h${propState.houses}`] || 0;
    // Check monopoly (all in group owned, no buildings) → double base rent
    const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
    const allOwned = groupProps.every(p => propertyStates[p.id]?.ownerId === ownerId);
    return allOwned ? propData.rent.base * 2 : propData.rent.base;
  }

  return 0;
}

// ═══════════════════════════════════════
// NET WORTH CALCULATOR
// ═══════════════════════════════════════
export function calculateNetWorth(player, propertyStates) {
  let nw = player.balance;
  player.ownedPropertyIds.forEach(propId => {
    const propData = PROPERTIES.find(p => p.id === propId);
    const propState = propertyStates[propId];
    if (!propData || !propState) return;
    nw += propState.isMortgaged ? propData.mortgageValue : propData.purchasePrice;
    if (propData.type === 'property') {
      const bc = COLOR_GROUPS[propData.colorGroup]?.buildCost || 0;
      nw += propState.houses * bc;
      if (propState.hasHotel) nw += bc;
    }
  });
  return nw;
}

// ═══════════════════════════════════════
// NEAREST FINDER
// ═══════════════════════════════════════
export function findNearest(currentPosition, targetType) {
  const positions = targetType === 'railroad' ? RAILROAD_POSITIONS : UTILITY_POSITIONS;
  let minDist = Infinity, nearest = positions[0];
  positions.forEach(pos => {
    let dist = pos - currentPosition;
    if (dist <= 0) dist += 40;
    if (dist < minDist) { minDist = dist; nearest = pos; }
  });
  return nearest;
}

// ═══════════════════════════════════════
// BUILDING VALIDATORS
// ═══════════════════════════════════════
export function canBuildHouse(propertyId, playerId, propertyStates, bank) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData || propData.type !== 'property') return { allowed: false, reason: 'Not buildable.' };
  const propState = propertyStates[propertyId];
  if (propState.ownerId !== playerId) return { allowed: false, reason: "You don't own this." };
  if (propState.isMortgaged) return { allowed: false, reason: 'Property is mortgaged.' };
  if (propState.hasHotel) return { allowed: false, reason: 'Already has a hotel.' };
  if (propState.houses >= 4) return { allowed: false, reason: 'Need to build a hotel next.' };
  const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
  if (!groupProps.every(p => propertyStates[p.id]?.ownerId === playerId))
    return { allowed: false, reason: 'Must own full color group.' };
  if (groupProps.some(p => propertyStates[p.id]?.isMortgaged))
    return { allowed: false, reason: 'Group has mortgaged properties.' };
  const minInGroup = Math.min(...groupProps.map(p => propertyStates[p.id]?.hasHotel ? 5 : (propertyStates[p.id]?.houses || 0)));
  if (propState.houses > minInGroup) return { allowed: false, reason: 'Must build evenly.' };
  if (bank.housesRemaining <= 0) return { allowed: false, reason: 'Bank has no houses left.' };
  return { allowed: true, cost: COLOR_GROUPS[propData.colorGroup].buildCost };
}

export function canBuildHotel(propertyId, playerId, propertyStates, bank) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData || propData.type !== 'property') return { allowed: false, reason: 'Not buildable.' };
  const propState = propertyStates[propertyId];
  if (propState.ownerId !== playerId) return { allowed: false, reason: "You don't own this." };
  if (propState.hasHotel) return { allowed: false, reason: 'Already has a hotel.' };
  if (propState.houses < 4) return { allowed: false, reason: 'Need 4 houses first.' };
  const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
  if (!groupProps.every(p => { const s = propertyStates[p.id]; return s?.hasHotel || (s?.houses >= 4); }))
    return { allowed: false, reason: 'All properties need 4 houses first.' };
  if (bank.hotelsRemaining <= 0) return { allowed: false, reason: 'Bank has no hotels left.' };
  return { allowed: true, cost: COLOR_GROUPS[propData.colorGroup].buildCost };
}

export function canMortgage(propertyId, playerId, propertyStates) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData) return { allowed: false, reason: 'Property not found.' };
  const propState = propertyStates[propertyId];
  if (propState.ownerId !== playerId) return { allowed: false, reason: "You don't own this." };
  if (propState.isMortgaged) return { allowed: false, reason: 'Already mortgaged.' };
  if (propData.type === 'property') {
    const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
    if (groupProps.some(p => propertyStates[p.id]?.houses > 0 || propertyStates[p.id]?.hasHotel))
      return { allowed: false, reason: 'Sell all buildings in group first.' };
  }
  return { allowed: true, value: propData.mortgageValue };
}

export function getUnmortgageCost(propertyId) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData) return 0;
  return Math.round(propData.mortgageValue * 1.1);
}

// ═══════════════════════════════════════
// GAME REDUCER
// ═══════════════════════════════════════
export function gameReducer(state, action) {
  const s = JSON.parse(JSON.stringify(state));

  function addLog(type, message) {
    s.log.unshift({ id: uuid(), timestamp: new Date().toLocaleTimeString(), type, message });
    if (s.log.length > 200) s.log.length = 200;
  }

  function getPlayer(id) { return s.players.find(p => p.id === id); }
  function getActivePlayer() { return s.players[s.activePlayerIndex]; }
  function getActivePlayers() { return s.players.filter(p => !p.isBankrupt); }

  switch (action.type) {

    case 'SET_PHASE':
      s.phase = action.phase;
      return s;

    case 'ADD_PLAYER': {
      const colorIdx = s.players.length;
      const player = createPlayer(action.name, action.tokenId, colorIdx);
      player.balance = s.settings.startingBalance;
      s.players.push(player);
      return s;
    }

    case 'REMOVE_PLAYER':
      s.players = s.players.filter(p => p.id !== action.playerId);
      return s;

    case 'UPDATE_PLAYER': {
      const p = getPlayer(action.playerId);
      if (p) p[action.field] = action.value;
      return s;
    }

    case 'UPDATE_SETTINGS':
      if (action.field === 'startingBalance') {
        s.settings.startingBalance = action.value;
      } else {
        s.settings.rules[action.field] = action.value;
      }
      return s;

    case 'START_GAME':
      s.phase = 'playing';
      s.players.forEach(p => { p.balance = s.settings.startingBalance; });
      s.chanceDeck = shuffleArray([...CHANCE_CARDS]);
      s.chanceDiscardPile = [];
      s.communityChestDeck = shuffleArray([...COMMUNITY_CHEST_CARDS]);
      s.communityChestDiscardPile = [];
      s.turnState = { hasPassedGo: false, hasPaidTax: false, hasBoughtProperty: false, hasDrawnCard: false, hasRolled: false, doublesCount: 0 };
      addLog('system', '🎲 Game started!');
      s.players.forEach(p => addLog('system', `${p.name} starts with $${p.balance.toLocaleString()}`));
      return s;

    // ── DICE ──
    case 'ROLL_DICE': {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const isDoubles = die1 === die2;
      const newDoublesCount = isDoubles ? (s.turnState.doublesCount + 1) : 0;
      s.diceState = { die1, die2, rolling: false, isDoubles, totalRolls: (s.diceState.totalRolls || 0) + 1 };
      if (!s.turnState) s.turnState = {};
      s.turnState.hasRolled = true;
      s.turnState.doublesCount = newDoublesCount;

      if (isDoubles && newDoublesCount >= 3) {
        const p = getActivePlayer();
        if (p) {
          p.isInJail = true;
          p.jailTurnsSpent = 0;
          p.boardPosition = 11;
          addLog('jail', `🔒 ${p.name} rolled doubles 3 times — Go to Jail!`);
          s.turnState.doublesCount = 0;
          s.turnState.hasRolled = false;
        }
      } else {
        const p = getActivePlayer();
        if (p) addLog('system', `🎲 ${p.name} rolled ${die1}+${die2}=${die1+die2}${isDoubles ? ' (Doubles! Roll again)' : ''}`);
      }
      return s;
    }

    case 'END_TURN': {
      const activePlayers = getActivePlayers();
      if (activePlayers.length <= 1) { s.phase = 'finished'; return s; }
      // Only advance turn if not doubles (or jail was triggered)
      const wasDoubles = s.turnState?.doublesCount > 0;
      if (wasDoubles && !getActivePlayer()?.isInJail) {
        // Let player roll again - just reset within-turn flags but not doublesCount
        s.turnState = { ...s.turnState, hasPassedGo: false, hasPaidTax: false, hasBoughtProperty: false, hasDrawnCard: false, hasRolled: false };
        addLog('system', `🎲 Doubles! ${getActivePlayer()?.name} rolls again.`);
        return s;
      }
      let nextIdx = (s.activePlayerIndex + 1) % s.players.length;
      while (s.players[nextIdx].isBankrupt) nextIdx = (nextIdx + 1) % s.players.length;
      s.activePlayerIndex = nextIdx;
      s.turnNumber++;
      s.turnState = { hasPassedGo: false, hasPaidTax: false, hasBoughtProperty: false, hasDrawnCard: false, hasRolled: false, doublesCount: 0 };
      addLog('system', `── Turn ${s.turnNumber}: ${s.players[nextIdx].name}'s turn ──`);
      return s;
    }

    case 'FORCE_END_TURN': {
      // Force end turn without doubles check (after jail etc.)
      const activePlayers2 = getActivePlayers();
      if (activePlayers2.length <= 1) { s.phase = 'finished'; return s; }
      let nextIdx = (s.activePlayerIndex + 1) % s.players.length;
      while (s.players[nextIdx].isBankrupt) nextIdx = (nextIdx + 1) % s.players.length;
      s.activePlayerIndex = nextIdx;
      s.turnNumber++;
      s.turnState = { hasPassedGo: false, hasPaidTax: false, hasBoughtProperty: false, hasDrawnCard: false, hasRolled: false, doublesCount: 0 };
      addLog('system', `── Turn ${s.turnNumber}: ${s.players[nextIdx].name}'s turn ──`);
      return s;
    }

    case 'BANK_TO_PLAYER': {
      const p = getPlayer(action.playerId);
      if (p) { p.balance += action.amount; addLog('transaction', `💰 ${p.name} received $${action.amount.toLocaleString()} from Bank (${action.reason})`); }
      return s;
    }

    case 'PLAYER_TO_BANK': {
      const p = getPlayer(action.playerId);
      if (p) {
        p.balance -= action.amount;
        addLog('transaction', `💸 ${p.name} paid $${action.amount.toLocaleString()} to Bank (${action.reason})`);
        if (s.settings.rules.freeParkingJackpot && /tax|fine|Tax|Fine/.test(action.reason)) {
          s.freeParkingPool += action.amount;
        }
        if (/Luxury Tax/.test(action.reason)) {
          if (!s.turnState) s.turnState = {};
          s.turnState.hasPaidTax = true;
        }
      }
      return s;
    }

    case 'PLAYER_TO_PLAYER': {
      const from = getPlayer(action.fromId);
      const to = getPlayer(action.toId);
      if (from && to) {
        from.balance -= action.amount;
        to.balance += action.amount;
        addLog('transaction', `💸 ${from.name} → ${to.name}: $${action.amount.toLocaleString()} (${action.reason})`);
      }
      return s;
    }

    case 'BUY_PROPERTY': {
      if (s.turnState?.hasBoughtProperty) return s;
      const p = getPlayer(action.playerId);
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      if (p && propData) {
        p.balance -= propData.purchasePrice;
        p.ownedPropertyIds.push(action.propertyId);
        s.propertyStates[action.propertyId].ownerId = p.id;
        if (!s.turnState) s.turnState = {};
        s.turnState.hasBoughtProperty = true;
        addLog('property', `🏠 ${p.name} bought ${propData.name} for $${propData.purchasePrice.toLocaleString()}`);
      }
      return s;
    }

    case 'AUCTION_BUY': {
      const p = getPlayer(action.playerId);
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      if (p && propData) {
        p.balance -= action.price;
        p.ownedPropertyIds.push(action.propertyId);
        s.propertyStates[action.propertyId].ownerId = p.id;
        addLog('property', `🔨 ${p.name} won auction for ${propData.name} at $${action.price.toLocaleString()}`);
      }
      return s;
    }

    case 'MORTGAGE_PROPERTY': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      if (propData && owner) {
        propState.isMortgaged = true;
        owner.balance += propData.mortgageValue;
        addLog('property', `🏦 ${owner.name} mortgaged ${propData.name} (+$${propData.mortgageValue})`);
      }
      return s;
    }

    case 'UNMORTGAGE_PROPERTY': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      if (propData && owner) {
        const cost = getUnmortgageCost(action.propertyId);
        propState.isMortgaged = false;
        owner.balance -= cost;
        addLog('property', `🔓 ${owner.name} unmortgaged ${propData.name} (-$${cost})`);
      }
      return s;
    }

    case 'BUILD_HOUSE': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      if (owner && propData) {
        const cost = COLOR_GROUPS[propData.colorGroup].buildCost;
        propState.houses++;
        owner.balance -= cost;
        s.bank.housesRemaining--;
        addLog('property', `🏗️ ${owner.name} built house on ${propData.name} (${propState.houses} house(s))`);
      }
      return s;
    }

    case 'BUILD_HOTEL': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      if (owner && propData) {
        const cost = COLOR_GROUPS[propData.colorGroup].buildCost;
        s.bank.housesRemaining += 4;
        propState.houses = 0;
        propState.hasHotel = true;
        owner.balance -= cost;
        s.bank.hotelsRemaining--;
        addLog('property', `🏨 ${owner.name} built HOTEL on ${propData.name}!`);
      }
      return s;
    }

    case 'SELL_HOUSE': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      if (owner && propData && propState.houses > 0) {
        const refund = Math.floor(COLOR_GROUPS[propData.colorGroup].buildCost / 2);
        propState.houses--;
        owner.balance += refund;
        s.bank.housesRemaining++;
        addLog('property', `🔻 ${owner.name} sold house on ${propData.name} (+$${refund})`);
      }
      return s;
    }

    case 'SELL_HOTEL': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      if (owner && propData && propState.hasHotel) {
        const refund = Math.floor(COLOR_GROUPS[propData.colorGroup].buildCost / 2);
        propState.hasHotel = false;
        propState.houses = s.bank.housesRemaining >= 4 ? 4 : 0;
        if (propState.houses > 0) s.bank.housesRemaining -= 4;
        owner.balance += refund;
        s.bank.hotelsRemaining++;
        addLog('property', `🔻 ${owner.name} sold hotel on ${propData.name} (+$${refund})`);
      }
      return s;
    }

    case 'DRAW_CARD': {
      if (s.turnState?.hasDrawnCard) return s;
      const deckKey = action.deck === 'chance' ? 'chanceDeck' : 'communityChestDeck';
      const discardKey = action.deck === 'chance' ? 'chanceDiscardPile' : 'communityChestDiscardPile';
      if (s[deckKey].length === 0) {
        s[deckKey] = shuffleArray([...s[discardKey]]);
        s[discardKey] = [];
      }
      const card = s[deckKey].shift();
      if (card && card.effectType !== 'getOutOfJailFree') s[discardKey].push(card);
      s._drawnCard = card;
      if (!s.turnState) s.turnState = {};
      s.turnState.hasDrawnCard = true;
      const ap = getActivePlayer();
      if (ap && card) {
        ap.cardHistory = ap.cardHistory || [];
        ap.cardHistory.push({ cardId: card.id, deck: action.deck, text: card.text, turn: s.turnNumber, timestamp: new Date().toLocaleTimeString() });
        addLog('card', `🃏 ${ap.name} drew ${action.deck === 'chance' ? 'Chance' : 'Community Chest'}: "${card.text}"`);
      }
      return s;
    }

    case 'APPLY_CARD_EFFECT': {
      const card = action.card;
      const player = getActivePlayer();
      const context = action.context || {};

      switch (card.effectType) {
        case 'collectFromBank':
          player.balance += card.effectPayload.amount;
          addLog('transaction', `💰 ${player.name} collected $${card.effectPayload.amount} from Bank`);
          break;
        case 'payToBank':
          player.balance -= card.effectPayload.amount;
          addLog('transaction', `💸 ${player.name} paid $${card.effectPayload.amount} to Bank`);
          if (s.settings.rules.freeParkingJackpot) s.freeParkingPool += card.effectPayload.amount;
          break;
        case 'advanceTo': {
          const dest = card.effectPayload.position;
          const passedGo = context.passedGo || (dest < player.boardPosition && dest !== player.boardPosition);
          if (passedGo && card.effectPayload.collectGoSalary) {
            const salary = s.settings.rules.doubleSalaryOnGo && dest === 1 ? 400 : 200;
            player.balance += salary;
            addLog('transaction', `💰 ${player.name} passed Go, collected $${salary}`);
          }
          player.boardPosition = dest;
          break;
        }
        case 'goToJail':
          player.isInJail = true;
          player.jailTurnsSpent = 0;
          player.boardPosition = 11;
          if (!s.turnState) s.turnState = {};
          s.turnState.doublesCount = 0;
          addLog('jail', `🔒 ${player.name} sent to Jail!`);
          break;
        case 'getOutOfJailFree':
          player.getOutOfJailFreeCards[card.effectPayload.cardType]++;
          addLog('card', `🎫 ${player.name} got Get Out of Jail Free card!`);
          break;
        case 'goBack': {
          let newPos = player.boardPosition - card.effectPayload.spaces;
          if (newPos <= 0) newPos += 40;
          player.boardPosition = newPos;
          addLog('system', `↩️ ${player.name} moved back ${card.effectPayload.spaces} spaces to #${newPos}`);
          break;
        }
        case 'payToAllPlayers': {
          const others = s.players.filter(p => p.id !== player.id && !p.isBankrupt);
          const total = card.effectPayload.amount * others.length;
          player.balance -= total;
          others.forEach(p => { p.balance += card.effectPayload.amount; });
          addLog('transaction', `💸 ${player.name} paid $${card.effectPayload.amount} each ($${total} total)`);
          break;
        }
        case 'collectFromAllPlayers': {
          const others2 = s.players.filter(p => p.id !== player.id && !p.isBankrupt);
          others2.forEach(p => { p.balance -= card.effectPayload.amount; player.balance += card.effectPayload.amount; });
          addLog('transaction', `💰 ${player.name} collected $${card.effectPayload.amount} from each player`);
          break;
        }
        case 'repairs': {
          let totalCost = 0;
          player.ownedPropertyIds.forEach(propId => {
            const ps = s.propertyStates[propId];
            totalCost += (ps.houses || 0) * card.effectPayload.perHouse;
            if (ps.hasHotel) totalCost += card.effectPayload.perHotel;
          });
          player.balance -= totalCost;
          addLog('transaction', `🔧 ${player.name} paid $${totalCost} for repairs`);
          if (s.settings.rules.freeParkingJackpot) s.freeParkingPool += totalCost;
          break;
        }
        case 'advanceToNearest': {
          const nearest = findNearest(player.boardPosition, card.effectPayload.targetType);
          const passedGo2 = nearest < player.boardPosition;
          if (passedGo2) { player.balance += 200; addLog('transaction', `💰 ${player.name} passed Go, collected $200`); }
          player.boardPosition = nearest;
          // Rent is handled separately in the UI for these cards
          if (context.rentAmount && context.ownerId && context.ownerId !== player.id) {
            const owner = getPlayer(context.ownerId);
            if (owner) {
              player.balance -= context.rentAmount;
              owner.balance += context.rentAmount;
              addLog('transaction', `💸 ${player.name} paid $${context.rentAmount} to ${owner.name} (${card.effectPayload.targetType} rent)`);
            }
          }
          break;
        }
      }
      return s;
    }

    case 'SEND_TO_JAIL': {
      const p = getPlayer(action.playerId);
      if (p) { p.isInJail = true; p.jailTurnsSpent = 0; p.boardPosition = 11; if (s.turnState) s.turnState.doublesCount = 0; addLog('jail', `🔒 ${p.name} sent to Jail!`); }
      return s;
    }

    case 'PAY_JAIL_FINE': {
      const p = getPlayer(action.playerId);
      if (p) {
        p.balance -= 50; p.isInJail = false; p.jailTurnsSpent = 0;
        addLog('jail', `💸 ${p.name} paid $50 fine and is free!`);
        if (s.settings.rules.freeParkingJackpot) s.freeParkingPool += 50;
      }
      return s;
    }

    case 'USE_GOOJF': {
      const p = getPlayer(action.playerId);
      if (p) {
        if (p.getOutOfJailFreeCards.chance > 0) {
          p.getOutOfJailFreeCards.chance--;
          s.chanceDiscardPile.push(CHANCE_CARDS.find(c => c.effectType === 'getOutOfJailFree'));
        } else if (p.getOutOfJailFreeCards.communityChest > 0) {
          p.getOutOfJailFreeCards.communityChest--;
          s.communityChestDiscardPile.push(COMMUNITY_CHEST_CARDS.find(c => c.effectType === 'getOutOfJailFree'));
        }
        p.isInJail = false; p.jailTurnsSpent = 0;
        addLog('jail', `🎫 ${p.name} used Get Out of Jail Free card!`);
      }
      return s;
    }

    case 'INCREMENT_JAIL_TURN': {
      const p = getPlayer(action.playerId);
      if (p) p.jailTurnsSpent++;
      return s;
    }

    case 'COLLECT_SALARY': {
      if (s.turnState?.hasPassedGo) return s;
      const p = getPlayer(action.playerId);
      if (p) {
        if (!s.turnState) s.turnState = {};
        s.turnState.hasPassedGo = true;
        const amount = s.settings.rules.doubleSalaryOnGo && action.exactLanding ? 400 : 200;
        p.balance += amount;
        addLog('transaction', `💰 ${p.name} collected $${amount} salary`);
      }
      return s;
    }

    case 'COLLECT_FREE_PARKING': {
      const p = getPlayer(action.playerId);
      if (p && s.freeParkingPool > 0) {
        p.balance += s.freeParkingPool;
        addLog('transaction', `🅿️ ${p.name} collected $${s.freeParkingPool.toLocaleString()} from Free Parking!`);
        s.freeParkingPool = 0;
      }
      return s;
    }

    case 'EXECUTE_TRADE': {
      const { offer } = action;
      const p1 = getPlayer(offer.player1Id);
      const p2 = getPlayer(offer.player2Id);
      if (!p1 || !p2) return s;
      if (offer.cash1 > 0) { p1.balance -= offer.cash1; p2.balance += offer.cash1; }
      if (offer.cash2 > 0) { p2.balance -= offer.cash2; p1.balance += offer.cash2; }
      (offer.properties1 || []).forEach(propId => {
        p1.ownedPropertyIds = p1.ownedPropertyIds.filter(id => id !== propId);
        p2.ownedPropertyIds.push(propId);
        s.propertyStates[propId].ownerId = p2.id;
        if (s.propertyStates[propId].isMortgaged) {
          const fee = Math.round(PROPERTIES.find(p => p.id === propId)?.mortgageValue * 0.1 || 0);
          p2.balance -= fee;
          addLog('transaction', `💸 ${p2.name} paid $${fee} transfer fee (mortgaged property)`);
        }
      });
      (offer.properties2 || []).forEach(propId => {
        p2.ownedPropertyIds = p2.ownedPropertyIds.filter(id => id !== propId);
        p1.ownedPropertyIds.push(propId);
        s.propertyStates[propId].ownerId = p1.id;
        if (s.propertyStates[propId].isMortgaged) {
          const fee = Math.round(PROPERTIES.find(p => p.id === propId)?.mortgageValue * 0.1 || 0);
          p1.balance -= fee;
          addLog('transaction', `💸 ${p1.name} paid $${fee} transfer fee (mortgaged property)`);
        }
      });
      if (offer.goojf1 > 0) {
        if (p1.getOutOfJailFreeCards.chance > 0) { p1.getOutOfJailFreeCards.chance--; p2.getOutOfJailFreeCards.chance++; }
        else { p1.getOutOfJailFreeCards.communityChest--; p2.getOutOfJailFreeCards.communityChest++; }
      }
      if (offer.goojf2 > 0) {
        if (p2.getOutOfJailFreeCards.chance > 0) { p2.getOutOfJailFreeCards.chance--; p1.getOutOfJailFreeCards.chance++; }
        else { p2.getOutOfJailFreeCards.communityChest--; p1.getOutOfJailFreeCards.communityChest++; }
      }
      addLog('trade', `🤝 Trade: ${p1.name} ↔ ${p2.name}`);
      return s;
    }

    case 'DECLARE_BANKRUPTCY': {
      const bp = getPlayer(action.playerId);
      if (!bp) return s;
      const bankruptOrder = s.players.filter(p => p.isBankrupt).length + 1;
      if (action.creditorId) {
        const creditor = getPlayer(action.creditorId);
        bp.ownedPropertyIds.forEach(propId => {
          const propData = PROPERTIES.find(p => p.id === propId);
          const propState = s.propertyStates[propId];
          if (propData?.type === 'property') {
            const bc = COLOR_GROUPS[propData.colorGroup].buildCost;
            if (propState.hasHotel) { bp.balance += Math.floor(bc / 2); s.bank.hotelsRemaining++; propState.hasHotel = false; }
            if (propState.houses > 0) { bp.balance += propState.houses * Math.floor(bc / 2); s.bank.housesRemaining += propState.houses; propState.houses = 0; }
          }
        });
        creditor.balance += Math.max(0, bp.balance);
        bp.ownedPropertyIds.forEach(propId => {
          s.propertyStates[propId].ownerId = creditor.id;
          creditor.ownedPropertyIds.push(propId);
          if (s.propertyStates[propId].isMortgaged) {
            const fee = Math.round(PROPERTIES.find(p => p.id === propId)?.mortgageValue * 0.1 || 0);
            creditor.balance -= fee;
          }
        });
        creditor.getOutOfJailFreeCards.chance += bp.getOutOfJailFreeCards.chance;
        creditor.getOutOfJailFreeCards.communityChest += bp.getOutOfJailFreeCards.communityChest;
        addLog('bankruptcy', `💀 ${bp.name} bankrupt → assets to ${creditor.name}`);
      } else {
        bp.ownedPropertyIds.forEach(propId => {
          const propData = PROPERTIES.find(p => p.id === propId);
          const propState = s.propertyStates[propId];
          if (propData?.type === 'property') {
            if (propState.hasHotel) { s.bank.hotelsRemaining++; propState.hasHotel = false; }
            s.bank.housesRemaining += propState.houses;
            propState.houses = 0;
          }
          propState.ownerId = null;
          propState.isMortgaged = false;
        });
        addLog('bankruptcy', `💀 ${bp.name} bankrupt → assets returned to Bank`);
      }
      bp.isBankrupt = true;
      bp.bankruptOrder = bankruptOrder;
      bp.balance = 0;
      bp.ownedPropertyIds = [];
      bp.getOutOfJailFreeCards = { chance: 0, communityChest: 0 };
      const remaining = s.players.filter(p => !p.isBankrupt);
      if (remaining.length <= 1) {
        s.phase = 'finished';
        addLog('system', `🏆 ${remaining[0]?.name} WINS!`);
      }
      return s;
    }

    case 'UPDATE_POSITION': {
      const p = getPlayer(action.playerId);
      if (p) p.boardPosition = action.position;
      return s;
    }

    case 'RESET_GAME': return createInitialState();
    case 'LOAD_STATE': return { ...action.savedState };

    default:
      console.warn('Unknown action:', action.type);
      return s;
  }
}

// ═══════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════
const STORAGE_KEY = 'monopoly_banking_companion_v3';

export function saveGame(state) {
  try {
    const s = { ...state, _drawnCard: null, lastSaved: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) { console.error('Save failed:', e); }
}

export function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) { return null; }
}

export function clearSave() { localStorage.removeItem(STORAGE_KEY); }
