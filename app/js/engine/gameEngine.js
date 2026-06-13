// ═══════════════════════════════════════
// GAME ENGINE — State Management Core
// ═══════════════════════════════════════

import { PROPERTIES, COLOR_GROUPS, RAILROAD_RENT, RAILROAD_POSITIONS, UTILITY_POSITIONS } from '../data/properties.js';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../data/cards.js';
import { PLAYER_COLORS } from '../data/tokens.js';

// ── Utility: shuffle array (Fisher-Yates) ──
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── UUID generator ──
function uuid() {
  return 'xxxx-xxxx-4xxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
}

// ── Create initial property state ──
function createPropertyStates() {
  const states = {};
  PROPERTIES.forEach(p => {
    states[p.id] = {
      ownerId: null,
      houses: 0,
      hasHotel: false,
      isMortgaged: false,
    };
  });
  return states;
}

// ── Create initial game state ──
export function createInitialState() {
  return {
    phase: 'splash', // splash | setup | playing | finished
    settings: {
      startingBalance: 1500,
      rules: {
        freeParkingJackpot: false,
        auctionUnowned: true,
        noBuildOnMortgagedGroup: true,
        doubleSalaryOnGo: false,
        speedDie: false,
      },
    },
    players: [],
    activePlayerIndex: 0,
    turnNumber: 1,
    propertyStates: createPropertyStates(),
    chanceDeck: shuffleArray(CHANCE_CARDS.filter(c => c.effectType !== 'getOutOfJailFree')),
    chanceDiscardPile: [],
    chanceJailCardHeld: false,
    communityChestDeck: shuffleArray(COMMUNITY_CHEST_CARDS.filter(c => c.effectType !== 'getOutOfJailFree')),
    communityChestDiscardPile: [],
    communityChestJailCardHeld: false,
    bank: { housesRemaining: 32, hotelsRemaining: 12 },
    freeParkingPool: 0,
    log: [],
    activeModal: null,
    pendingAnimation: null,
    lastSaved: null,
  };
}

// ── Create a new player ──
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
// RENT CALCULATOR
// ═══════════════════════════════════════

export function calculateRent(propertyId, propertyStates, diceTotal, fromChanceCard) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  const propState = propertyStates[propertyId];
  
  if (!propData || !propState.ownerId || propState.isMortgaged) return 0;
  
  const ownerId = propState.ownerId;
  
  // Railroad
  if (propData.type === 'railroad') {
    const rrOwned = PROPERTIES
      .filter(p => p.type === 'railroad' && propertyStates[p.id].ownerId === ownerId && !propertyStates[p.id].isMortgaged)
      .length;
    let rent = RAILROAD_RENT[rrOwned] || 0;
    if (fromChanceCard && fromChanceCard.doubleRent) rent *= 2;
    return rent;
  }
  
  // Utility
  if (propData.type === 'utility') {
    const utilOwned = PROPERTIES
      .filter(p => p.type === 'utility' && propertyStates[p.id].ownerId === ownerId && !propertyStates[p.id].isMortgaged)
      .length;
    if (fromChanceCard && fromChanceCard.multiplier) {
      return diceTotal * fromChanceCard.multiplier;
    }
    return diceTotal * (utilOwned >= 2 ? 10 : 4);
  }
  
  // Color property
  if (propData.type === 'property') {
    // Hotel
    if (propState.hasHotel) return propData.rent.hotel;
    // Houses
    if (propState.houses > 0) {
      const rentKey = `h${propState.houses}`;
      return propData.rent[rentKey];
    }
    // No houses — check monopoly
    const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
    const allOwned = groupProps.every(p => propertyStates[p.id].ownerId === ownerId);
    if (allOwned) return propData.rent.base * 2;
    return propData.rent.base;
  }
  
  return 0;
}

// ═══════════════════════════════════════
// NET WORTH CALCULATOR
// ═══════════════════════════════════════

export function calculateNetWorth(player, propertyStates) {
  let netWorth = player.balance;
  
  player.ownedPropertyIds.forEach(propId => {
    const propData = PROPERTIES.find(p => p.id === propId);
    const propState = propertyStates[propId];
    
    if (!propData) return;
    
    if (propState.isMortgaged) {
      netWorth += propData.mortgageValue;
    } else {
      netWorth += propData.purchasePrice;
    }
    
    if (propData.type === 'property') {
      const buildCost = COLOR_GROUPS[propData.colorGroup]?.buildCost || 0;
      netWorth += propState.houses * buildCost;
      if (propState.hasHotel) netWorth += buildCost; // hotel costs same as one house for that group
    }
  });
  
  return netWorth;
}

// ═══════════════════════════════════════
// NEAREST FINDER
// ═══════════════════════════════════════

export function findNearest(currentPosition, targetType) {
  const positions = targetType === 'railroad' ? RAILROAD_POSITIONS : UTILITY_POSITIONS;
  let minDist = Infinity;
  let nearest = positions[0];
  
  positions.forEach(pos => {
    // Clockwise distance
    let dist = pos - currentPosition;
    if (dist <= 0) dist += 40;
    if (dist < minDist) {
      minDist = dist;
      nearest = pos;
    }
  });
  
  return nearest;
}

// ═══════════════════════════════════════
// BUILDING VALIDATOR
// ═══════════════════════════════════════

export function canBuildHouse(propertyId, playerId, propertyStates, bank) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData || propData.type !== 'property') return { allowed: false, reason: 'Not a buildable property.' };
  
  const propState = propertyStates[propertyId];
  if (propState.ownerId !== playerId) return { allowed: false, reason: 'You don\'t own this property.' };
  if (propState.isMortgaged) return { allowed: false, reason: 'Property is mortgaged.' };
  if (propState.hasHotel) return { allowed: false, reason: 'Already has a hotel.' };
  if (propState.houses >= 4) return { allowed: false, reason: 'Max 4 houses. Build a hotel instead.' };
  
  // Check full monopoly
  const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
  const allOwned = groupProps.every(p => propertyStates[p.id].ownerId === playerId);
  if (!allOwned) return { allowed: false, reason: 'You must own all properties in this color group.' };
  
  // Check no mortgaged in group
  const anyMortgaged = groupProps.some(p => propertyStates[p.id].isMortgaged);
  if (anyMortgaged) return { allowed: false, reason: 'Cannot build while any property in the group is mortgaged.' };
  
  // Check even building
  const currentHouses = propState.houses;
  const minInGroup = Math.min(...groupProps.map(p => {
    const s = propertyStates[p.id];
    return s.hasHotel ? 5 : s.houses;
  }));
  if (currentHouses > minInGroup) return { allowed: false, reason: 'Must build evenly across the color group.' };
  
  // Check bank supply
  if (bank.housesRemaining <= 0) return { allowed: false, reason: 'No houses available in the bank.' };
  
  return { allowed: true, cost: COLOR_GROUPS[propData.colorGroup].buildCost };
}

export function canBuildHotel(propertyId, playerId, propertyStates, bank) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData || propData.type !== 'property') return { allowed: false, reason: 'Not a buildable property.' };
  
  const propState = propertyStates[propertyId];
  if (propState.ownerId !== playerId) return { allowed: false, reason: 'You don\'t own this property.' };
  if (propState.hasHotel) return { allowed: false, reason: 'Already has a hotel.' };
  if (propState.houses < 4) return { allowed: false, reason: 'Need 4 houses before building a hotel.' };
  
  // Check all in group have at least 4 houses or hotel
  const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
  const evenCheck = groupProps.every(p => {
    const s = propertyStates[p.id];
    return s.hasHotel || s.houses >= 4;
  });
  if (!evenCheck) return { allowed: false, reason: 'Must build evenly. All properties need 4 houses first.' };
  
  if (bank.hotelsRemaining <= 0) return { allowed: false, reason: 'No hotels available in the bank.' };
  
  return { allowed: true, cost: COLOR_GROUPS[propData.colorGroup].buildCost };
}

// ═══════════════════════════════════════
// MORTGAGE HELPERS
// ═══════════════════════════════════════

export function canMortgage(propertyId, playerId, propertyStates) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData) return { allowed: false, reason: 'Property not found.' };
  
  const propState = propertyStates[propertyId];
  if (propState.ownerId !== playerId) return { allowed: false, reason: 'You don\'t own this property.' };
  if (propState.isMortgaged) return { allowed: false, reason: 'Already mortgaged.' };
  
  // Check no buildings on color group
  if (propData.type === 'property') {
    const groupProps = PROPERTIES.filter(p => p.colorGroup === propData.colorGroup);
    const hasBuildings = groupProps.some(p => propertyStates[p.id].houses > 0 || propertyStates[p.id].hasHotel);
    if (hasBuildings) return { allowed: false, reason: 'Sell all houses/hotels in this color group first.' };
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
  // Deep-clone helper
  const s = JSON.parse(JSON.stringify(state));
  
  function addLog(type, message) {
    s.log.unshift({
      id: uuid(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    });
    // Keep log manageable
    if (s.log.length > 200) s.log.length = 200;
  }
  
  function getPlayer(id) {
    return s.players.find(p => p.id === id);
  }
  
  function getActivePlayer() {
    return s.players[s.activePlayerIndex];
  }
  
  function getActivePlayers() {
    return s.players.filter(p => !p.isBankrupt);
  }

  switch (action.type) {
    // ── Phase transitions ──
    case 'SET_PHASE':
      s.phase = action.phase;
      return s;
    
    // ── Setup ──
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
    
    case 'START_GAME': {
      s.phase = 'playing';
      s.players.forEach(p => { p.balance = s.settings.startingBalance; });
      // Shuffle decks fresh
      const chanceGoojf = CHANCE_CARDS.find(c => c.effectType === 'getOutOfJailFree');
      const ccGoojf = COMMUNITY_CHEST_CARDS.find(c => c.effectType === 'getOutOfJailFree');
      s.chanceDeck = shuffleArray([...CHANCE_CARDS]);
      s.chanceDiscardPile = [];
      s.communityChestDeck = shuffleArray([...COMMUNITY_CHEST_CARDS]);
      s.communityChestDiscardPile = [];
      addLog('system', '🎲 Game started! Let the property wars begin!');
      s.players.forEach(p => {
        addLog('system', `${p.name} starts with $${p.balance.toLocaleString()}`);
      });
      return s;
    }
    
    // ── Turn management ──
    case 'END_TURN': {
      const activePlayers = getActivePlayers();
      if (activePlayers.length <= 1) {
        s.phase = 'finished';
        return s;
      }
      // Advance to next non-bankrupt player
      let nextIdx = (s.activePlayerIndex + 1) % s.players.length;
      while (s.players[nextIdx].isBankrupt) {
        nextIdx = (nextIdx + 1) % s.players.length;
      }
      s.activePlayerIndex = nextIdx;
      s.turnNumber++;
      const nextPlayer = s.players[nextIdx];
      addLog('system', `── Turn ${s.turnNumber}: ${nextPlayer.name}'s turn ──`);
      return s;
    }
    
    // ── Transactions ──
    case 'BANK_TO_PLAYER': {
      const p = getPlayer(action.playerId);
      if (p) {
        p.balance += action.amount;
        addLog('transaction', `💰 ${p.name} received $${action.amount.toLocaleString()} from the Bank (${action.reason})`);
      }
      return s;
    }
    
    case 'PLAYER_TO_BANK': {
      const p = getPlayer(action.playerId);
      if (p) {
        p.balance -= action.amount;
        addLog('transaction', `💸 ${p.name} paid $${action.amount.toLocaleString()} to the Bank (${action.reason})`);
        // Free parking jackpot
        if (s.settings.rules.freeParkingJackpot && (action.reason.includes('tax') || action.reason.includes('fine') || action.reason.includes('Tax'))) {
          s.freeParkingPool += action.amount;
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
        addLog('transaction', `💸 ${from.name} paid $${action.amount.toLocaleString()} to ${to.name} (${action.reason})`);
      }
      return s;
    }
    
    // ── Property ──
    case 'BUY_PROPERTY': {
      const p = getPlayer(action.playerId);
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      if (p && propData) {
        p.balance -= propData.purchasePrice;
        p.ownedPropertyIds.push(action.propertyId);
        s.propertyStates[action.propertyId].ownerId = p.id;
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
        addLog('property', `🏦 ${owner.name} mortgaged ${propData.name} for $${propData.mortgageValue.toLocaleString()}`);
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
        addLog('property', `🏦 ${owner.name} unmortgaged ${propData.name} for $${cost.toLocaleString()}`);
      }
      return s;
    }
    
    case 'BUILD_HOUSE': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      const cost = COLOR_GROUPS[propData.colorGroup].buildCost;
      if (owner) {
        propState.houses++;
        owner.balance -= cost;
        s.bank.housesRemaining--;
        addLog('property', `🏗️ ${owner.name} built a house on ${propData.name} ($${cost}). Now: ${propState.houses} house(s).`);
      }
      return s;
    }
    
    case 'BUILD_HOTEL': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      const cost = COLOR_GROUPS[propData.colorGroup].buildCost;
      if (owner) {
        s.bank.housesRemaining += 4; // Return 4 houses
        propState.houses = 0;
        propState.hasHotel = true;
        owner.balance -= cost;
        s.bank.hotelsRemaining--;
        addLog('property', `🏨 ${owner.name} built a HOTEL on ${propData.name} ($${cost})!`);
      }
      return s;
    }
    
    case 'SELL_HOUSE': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      const refund = Math.floor(COLOR_GROUPS[propData.colorGroup].buildCost / 2);
      if (owner && propState.houses > 0) {
        propState.houses--;
        owner.balance += refund;
        s.bank.housesRemaining++;
        addLog('property', `🔻 ${owner.name} sold a house on ${propData.name} (+$${refund}). Now: ${propState.houses} house(s).`);
      }
      return s;
    }
    
    case 'SELL_HOTEL': {
      const propData = PROPERTIES.find(pr => pr.id === action.propertyId);
      const propState = s.propertyStates[action.propertyId];
      const owner = getPlayer(propState.ownerId);
      const refund = Math.floor(COLOR_GROUPS[propData.colorGroup].buildCost / 2);
      if (owner && propState.hasHotel) {
        propState.hasHotel = false;
        propState.houses = 4; // Downgrade to 4 houses (if bank has them)
        if (s.bank.housesRemaining >= 4) {
          s.bank.housesRemaining -= 4;
        } else {
          // Must sell all if not enough houses
          propState.houses = 0;
        }
        owner.balance += refund;
        s.bank.hotelsRemaining++;
        addLog('property', `🔻 ${owner.name} sold the hotel on ${propData.name} (+$${refund}).`);
      }
      return s;
    }
    
    // ── Cards ──
    case 'DRAW_CARD': {
      const deckKey = action.deck === 'chance' ? 'chanceDeck' : 'communityChestDeck';
      const discardKey = action.deck === 'chance' ? 'chanceDiscardPile' : 'communityChestDiscardPile';
      
      // Reshuffle if empty
      if (s[deckKey].length === 0) {
        s[deckKey] = shuffleArray(s[discardKey]);
        s[discardKey] = [];
      }
      
      const card = s[deckKey].shift();
      if (card && card.effectType !== 'getOutOfJailFree') {
        s[discardKey].push(card);
      }
      
      s._drawnCard = card;
      const deckName = action.deck === 'chance' ? 'Chance' : 'Community Chest';
      const activeP = getActivePlayer();
      addLog('card', `🃏 ${activeP.name} drew ${deckName}: "${card.text}"`);
      // Track card history per player
      if (activeP && card) {
        activeP.cardHistory = activeP.cardHistory || [];
        activeP.cardHistory.push({
          cardId: card.id,
          deck: action.deck,
          text: card.text,
          turn: s.turnNumber,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      return s;
    }
    
    case 'APPLY_CARD_EFFECT': {
      const card = action.card;
      const player = getActivePlayer();
      
      switch (card.effectType) {
        case 'collectFromBank':
          player.balance += card.effectPayload.amount;
          addLog('transaction', `💰 ${player.name} collected $${card.effectPayload.amount} from the Bank`);
          break;
          
        case 'payToBank':
          player.balance -= card.effectPayload.amount;
          addLog('transaction', `💸 ${player.name} paid $${card.effectPayload.amount} to the Bank`);
          if (s.settings.rules.freeParkingJackpot) {
            s.freeParkingPool += card.effectPayload.amount;
          }
          break;
          
        case 'advanceTo':
          if (card.effectPayload.collectGoSalary && card.effectPayload.position < player.boardPosition && card.effectPayload.position !== 1) {
            // Would pass Go
            player.balance += s.settings.rules.doubleSalaryOnGo && card.effectPayload.position === 1 ? 400 : 200;
            addLog('transaction', `💰 ${player.name} passed Go and collected $200`);
          } else if (card.effectPayload.position === 1) {
            player.balance += s.settings.rules.doubleSalaryOnGo ? 400 : 200;
          }
          player.boardPosition = card.effectPayload.position;
          break;
          
        case 'goToJail':
          player.isInJail = true;
          player.jailTurnsSpent = 0;
          player.boardPosition = 11;
          addLog('jail', `🔒 ${player.name} was sent to Jail!`);
          break;
          
        case 'getOutOfJailFree':
          player.getOutOfJailFreeCards[card.effectPayload.cardType]++;
          addLog('card', `🎫 ${player.name} received a Get Out of Jail Free card!`);
          break;
          
        case 'goBack':
          player.boardPosition -= card.effectPayload.spaces;
          if (player.boardPosition <= 0) player.boardPosition += 40;
          addLog('system', `${player.name} moved back ${card.effectPayload.spaces} spaces to position ${player.boardPosition}`);
          break;
          
        case 'payToAllPlayers': {
          const others = s.players.filter(p => p.id !== player.id && !p.isBankrupt);
          const total = card.effectPayload.amount * others.length;
          player.balance -= total;
          others.forEach(p => { p.balance += card.effectPayload.amount; });
          addLog('transaction', `💸 ${player.name} paid $${card.effectPayload.amount} to each player ($${total} total)`);
          break;
        }
          
        case 'collectFromAllPlayers': {
          const others = s.players.filter(p => p.id !== player.id && !p.isBankrupt);
          others.forEach(p => {
            p.balance -= card.effectPayload.amount;
            player.balance += card.effectPayload.amount;
          });
          addLog('transaction', `💰 ${player.name} collected $${card.effectPayload.amount} from each player`);
          break;
        }
          
        case 'repairs': {
          let totalCost = 0;
          player.ownedPropertyIds.forEach(propId => {
            const ps = s.propertyStates[propId];
            totalCost += ps.houses * card.effectPayload.perHouse;
            if (ps.hasHotel) totalCost += card.effectPayload.perHotel;
          });
          player.balance -= totalCost;
          addLog('transaction', `🔧 ${player.name} paid $${totalCost} for repairs`);
          if (s.settings.rules.freeParkingJackpot) {
            s.freeParkingPool += totalCost;
          }
          break;
        }
          
        case 'advanceToNearest': {
          const nearest = findNearest(player.boardPosition, card.effectPayload.targetType);
          if (nearest < player.boardPosition) {
            player.balance += 200;
            addLog('transaction', `💰 ${player.name} passed Go and collected $200`);
          }
          player.boardPosition = nearest;
          break;
        }
      }
      return s;
    }
    
    // ── Jail ──
    case 'SEND_TO_JAIL': {
      const p = getPlayer(action.playerId);
      if (p) {
        p.isInJail = true;
        p.jailTurnsSpent = 0;
        p.boardPosition = 11;
        addLog('jail', `🔒 ${p.name} was sent to Jail!`);
      }
      return s;
    }
    
    case 'PAY_JAIL_FINE': {
      const p = getPlayer(action.playerId);
      if (p) {
        p.balance -= 50;
        p.isInJail = false;
        p.jailTurnsSpent = 0;
        addLog('jail', `💸 ${p.name} paid $50 jail fine and is free!`);
        if (s.settings.rules.freeParkingJackpot) {
          s.freeParkingPool += 50;
        }
      }
      return s;
    }
    
    case 'USE_GOOJF': {
      const p = getPlayer(action.playerId);
      if (p) {
        // Use whichever type they have
        if (p.getOutOfJailFreeCards.chance > 0) {
          p.getOutOfJailFreeCards.chance--;
          // Return card to chance deck
          const card = CHANCE_CARDS.find(c => c.effectType === 'getOutOfJailFree');
          s.chanceDiscardPile.push(card);
        } else if (p.getOutOfJailFreeCards.communityChest > 0) {
          p.getOutOfJailFreeCards.communityChest--;
          const card = COMMUNITY_CHEST_CARDS.find(c => c.effectType === 'getOutOfJailFree');
          s.communityChestDiscardPile.push(card);
        }
        p.isInJail = false;
        p.jailTurnsSpent = 0;
        addLog('jail', `🎫 ${p.name} used Get Out of Jail Free card!`);
      }
      return s;
    }
    
    case 'INCREMENT_JAIL_TURN': {
      const p = getPlayer(action.playerId);
      if (p) p.jailTurnsSpent++;
      return s;
    }
    
    // ── Collect salary ──
    case 'COLLECT_SALARY': {
      const p = getPlayer(action.playerId);
      if (p) {
        const amount = s.settings.rules.doubleSalaryOnGo && action.exactLanding ? 400 : 200;
        p.balance += amount;
        addLog('transaction', `💰 ${p.name} collected $${amount} salary for passing Go`);
      }
      return s;
    }
    
    // ── Free Parking ──
    case 'COLLECT_FREE_PARKING': {
      const p = getPlayer(action.playerId);
      if (p && s.freeParkingPool > 0) {
        p.balance += s.freeParkingPool;
        addLog('transaction', `🅿️ ${p.name} collected $${s.freeParkingPool.toLocaleString()} from Free Parking!`);
        s.freeParkingPool = 0;
      }
      return s;
    }
    
    // ── Trade ──
    case 'EXECUTE_TRADE': {
      const { offer } = action;
      const player1 = getPlayer(offer.player1Id);
      const player2 = getPlayer(offer.player2Id);
      
      if (!player1 || !player2) return s;
      
      // Transfer cash
      if (offer.cash1 > 0) {
        player1.balance -= offer.cash1;
        player2.balance += offer.cash1;
      }
      if (offer.cash2 > 0) {
        player2.balance -= offer.cash2;
        player1.balance += offer.cash2;
      }
      
      // Transfer properties from P1 to P2
      (offer.properties1 || []).forEach(propId => {
        player1.ownedPropertyIds = player1.ownedPropertyIds.filter(id => id !== propId);
        player2.ownedPropertyIds.push(propId);
        s.propertyStates[propId].ownerId = player2.id;
        
        // Mortgaged property transfer fee
        if (s.propertyStates[propId].isMortgaged) {
          const propData = PROPERTIES.find(p => p.id === propId);
          const fee = Math.round(propData.mortgageValue * 0.1);
          player2.balance -= fee;
          addLog('transaction', `💸 ${player2.name} paid $${fee} transfer fee for mortgaged ${propData.name}`);
        }
      });
      
      // Transfer properties from P2 to P1
      (offer.properties2 || []).forEach(propId => {
        player2.ownedPropertyIds = player2.ownedPropertyIds.filter(id => id !== propId);
        player1.ownedPropertyIds.push(propId);
        s.propertyStates[propId].ownerId = player1.id;
        
        if (s.propertyStates[propId].isMortgaged) {
          const propData = PROPERTIES.find(p => p.id === propId);
          const fee = Math.round(propData.mortgageValue * 0.1);
          player1.balance -= fee;
          addLog('transaction', `💸 ${player1.name} paid $${fee} transfer fee for mortgaged ${propData.name}`);
        }
      });
      
      // Transfer GOOJF cards
      if (offer.goojf1 > 0) {
        if (player1.getOutOfJailFreeCards.chance > 0) {
          player1.getOutOfJailFreeCards.chance--;
          player2.getOutOfJailFreeCards.chance++;
        } else {
          player1.getOutOfJailFreeCards.communityChest--;
          player2.getOutOfJailFreeCards.communityChest++;
        }
      }
      if (offer.goojf2 > 0) {
        if (player2.getOutOfJailFreeCards.chance > 0) {
          player2.getOutOfJailFreeCards.chance--;
          player1.getOutOfJailFreeCards.chance++;
        } else {
          player2.getOutOfJailFreeCards.communityChest--;
          player1.getOutOfJailFreeCards.communityChest++;
        }
      }
      
      addLog('trade', `🤝 Trade completed between ${player1.name} and ${player2.name}`);
      return s;
    }
    
    // ── Bankruptcy ──
    case 'DECLARE_BANKRUPTCY': {
      const bankruptPlayer = getPlayer(action.playerId);
      if (!bankruptPlayer) return s;
      
      const bankruptOrder = s.players.filter(p => p.isBankrupt).length + 1;
      
      if (action.creditorId) {
        // Bankrupt to another player
        const creditor = getPlayer(action.creditorId);
        
        // Sell all buildings at half price first
        bankruptPlayer.ownedPropertyIds.forEach(propId => {
          const propData = PROPERTIES.find(p => p.id === propId);
          const propState = s.propertyStates[propId];
          if (propData && propData.type === 'property') {
            const buildCost = COLOR_GROUPS[propData.colorGroup].buildCost;
            if (propState.hasHotel) {
              bankruptPlayer.balance += Math.floor(buildCost / 2);
              s.bank.hotelsRemaining++;
              propState.hasHotel = false;
            }
            if (propState.houses > 0) {
              bankruptPlayer.balance += propState.houses * Math.floor(buildCost / 2);
              s.bank.housesRemaining += propState.houses;
              propState.houses = 0;
            }
          }
        });
        
        // Transfer all cash
        creditor.balance += Math.max(0, bankruptPlayer.balance);
        
        // Transfer all properties
        bankruptPlayer.ownedPropertyIds.forEach(propId => {
          s.propertyStates[propId].ownerId = creditor.id;
          creditor.ownedPropertyIds.push(propId);
          
          // Pay 10% on mortgaged properties
          if (s.propertyStates[propId].isMortgaged) {
            const propData = PROPERTIES.find(p => p.id === propId);
            const fee = Math.round(propData.mortgageValue * 0.1);
            creditor.balance -= fee;
          }
        });
        
        // Transfer GOOJF cards
        creditor.getOutOfJailFreeCards.chance += bankruptPlayer.getOutOfJailFreeCards.chance;
        creditor.getOutOfJailFreeCards.communityChest += bankruptPlayer.getOutOfJailFreeCards.communityChest;
        
        addLog('bankruptcy', `💀 ${bankruptPlayer.name} is BANKRUPT! All assets transferred to ${creditor.name}.`);
      } else {
        // Bankrupt to the bank
        bankruptPlayer.ownedPropertyIds.forEach(propId => {
          const propData = PROPERTIES.find(p => p.id === propId);
          const propState = s.propertyStates[propId];
          if (propData && propData.type === 'property') {
            const buildCost = COLOR_GROUPS[propData.colorGroup].buildCost;
            if (propState.hasHotel) {
              s.bank.hotelsRemaining++;
              propState.hasHotel = false;
            }
            s.bank.housesRemaining += propState.houses;
            propState.houses = 0;
          }
          propState.ownerId = null;
          propState.isMortgaged = false;
        });
        
        addLog('bankruptcy', `💀 ${bankruptPlayer.name} is BANKRUPT to the Bank! All properties returned.`);
      }
      
      bankruptPlayer.isBankrupt = true;
      bankruptPlayer.bankruptOrder = bankruptOrder;
      bankruptPlayer.balance = 0;
      bankruptPlayer.ownedPropertyIds = [];
      bankruptPlayer.getOutOfJailFreeCards = { chance: 0, communityChest: 0 };
      
      // Check win condition
      const remaining = s.players.filter(p => !p.isBankrupt);
      if (remaining.length <= 1) {
        s.phase = 'finished';
        addLog('system', `🏆 ${remaining[0]?.name || 'Unknown'} WINS THE GAME!`);
      }
      
      return s;
    }
    
    // ── Update board position ──
    case 'UPDATE_POSITION': {
      const p = getPlayer(action.playerId);
      if (p) p.boardPosition = action.position;
      return s;
    }
    
    // ── Modal management ──
    case 'SET_MODAL':
      s.activeModal = action.modal;
      return s;
    
    case 'CLOSE_MODAL':
      s.activeModal = null;
      s._drawnCard = null;
      return s;
    
    // ── Reset ──
    case 'RESET_GAME':
      return createInitialState();
    
    // ── Load saved state ──
    case 'LOAD_STATE':
      return { ...action.savedState };
    
    default:
      console.warn('Unknown action:', action.type);
      return s;
  }
}

// ═══════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════

const STORAGE_KEY = 'monopoly_banking_companion_save';

export function saveGame(state) {
  try {
    const saveState = { ...state, lastSaved: new Date().toISOString() };
    // Strip transient properties that shouldn't persist
    delete saveState._drawnCard;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}
