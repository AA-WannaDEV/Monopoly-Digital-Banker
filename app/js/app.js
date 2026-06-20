// ═══════════════════════════════════════
// MONOPOLY BANKING COMPANION — Main Application v4.0
// ═══════════════════════════════════════

import { TOKENS, PLAYER_COLORS } from './data/tokens.js';
import { PROPERTIES, COLOR_GROUPS, RAILROAD_RENT } from './data/properties.js';
import { BOARD_SPACES } from './data/boardSpaces.js';
import {
  createInitialState, gameReducer, saveGame, loadGame, clearSave,
  calculateRent, calculateNetWorth, calculateLiquidationValue,
  canBuildHouse, canBuildHotel, canMortgage, getUnmortgageCost,
  findNearest, createPlayer
} from './engine/gameEngine.js';

// ═══════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════

function getTheme() {
  return localStorage.getItem('monopoly_theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('monopoly_theme', theme);
}

function toggleTheme() {
  const current = getTheme();
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  render();
}

applyTheme(getTheme());

// ═══════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════

let state = createInitialState();
let previousBalances = {};
let cardHistory = {};

function dispatch(action) {
  const oldState = state;
  oldState.players.forEach(p => {
    previousBalances[p.id] = p.balance;
  });
  state = gameReducer(state, action);
  saveGame(state);

  // Auto-bankruptcy detection: after any payment, check if active player can't pay
  if (['PLAYER_TO_BANK', 'PLAYER_TO_PLAYER', 'APPLY_CARD_EFFECT'].includes(action.type)) {
    const ap = state.players[state.activePlayerIndex];
    if (ap && !ap.isBankrupt && ap.balance < 0) {
      const liquidation = calculateLiquidationValue(ap, state.propertyStates);
      if (liquidation <= 0) {
        setTimeout(() => showAutoBankruptcyModal(ap), 350);
      }
    }
  }

  render();
}

// ═══════════════════════════════════════
// RENDER ENGINE
// ═══════════════════════════════════════

const app = document.getElementById('app');

function render() {
  switch (state.phase) {
    case 'splash': renderSplash(); break;
    case 'setup': renderSetup(); break;
    case 'playing': renderDashboard(); break;
    case 'finished': renderWinScreen(); break;
  }
}

function themeIcon() {
  return getTheme() === 'dark' ? '☀️' : '🌙';
}
function themeLabel() {
  return getTheme() === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// ═══════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════

function renderSplash() {
  const saved = loadGame();
  const hasSave = saved && saved.phase === 'playing';

  app.innerHTML = `
    <div class="splash-screen">
      <div class="splash-top-bar">
        <button class="theme-toggle-btn splash-theme-toggle" id="splash-theme-btn">
          <span class="theme-icon">${themeIcon()}</span>
          <span>${themeLabel()}</span>
        </button>
      </div>

      <div class="splash-content">
        <div class="splash-logo-container">
          <div class="splash-diamond">
            <span class="splash-icon">🎩</span>
          </div>
        </div>
        <h1 class="splash-title">MONOPOLY</h1>
        <h2 class="splash-subtitle">Banking Companion</h2>
        <p class="splash-tagline">Your Digital Banker for Game Night</p>

        <div class="splash-buttons">
          <button id="btn-new-game" class="btn btn-primary btn-lg splash-btn">
            <span>🎲</span> New Game
          </button>
          ${hasSave ? `
            <button id="btn-resume" class="btn btn-success btn-lg splash-btn">
              <span>📂</span> Resume Game
            </button>
            <p class="splash-save-info">Saved: ${new Date(saved.lastSaved).toLocaleString()}</p>
          ` : ''}
        </div>

        <div class="splash-footer">
          <div class="splash-divider"></div>
          <p class="splash-version">Companion App v4.0</p>
        </div>
      </div>

      <div class="splash-bg-elements">
        <div class="bg-dollar bg-dollar-1">$</div>
        <div class="bg-dollar bg-dollar-2">$</div>
        <div class="bg-dollar bg-dollar-3">$</div>
        <div class="bg-house bg-house-1">🏠</div>
        <div class="bg-house bg-house-2">🏨</div>
      </div>
    </div>
  `;

  document.getElementById('splash-theme-btn').addEventListener('click', toggleTheme);

  document.getElementById('btn-new-game').addEventListener('click', () => {
    state = createInitialState();
    cardHistory = {};
    dispatch({ type: 'SET_PHASE', phase: 'setup' });
  });

  if (hasSave) {
    document.getElementById('btn-resume').addEventListener('click', () => {
      state = saved;
      saveGame(state);
      render();
    });
  }
}

// ═══════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════

function renderSetup() {
  const players = state.players;
  const takenTokens = players.map(p => p.token);
  const availableTokens = TOKENS.filter(t => !takenTokens.includes(t.id));

  app.innerHTML = `
    <div class="setup-screen">
      <div class="setup-header">
        <button class="btn btn-sm btn-secondary" id="btn-back-home" style="position:absolute;left:20px;top:20px;">
          ← Home
        </button>
        <h1 class="setup-title">GAME SETUP</h1>
        <p class="setup-desc">Configure your players and house rules</p>
      </div>

      <div class="setup-content">
        <div class="setup-section">
          <div class="section-header">
            <h2 class="section-title">👥 Players</h2>
            <span class="player-count">${players.length}/8</span>
          </div>
          <div class="players-list" id="players-list">
            ${players.map((p, i) => `
              <div class="setup-player-card" style="border-left: 4px solid ${p.colorRing}">
                <div class="setup-player-token">${TOKENS.find(t => t.id === p.token)?.emoji || '❓'}</div>
                <div class="setup-player-info">
                  <input type="text" class="setup-player-name" value="${p.name}"
                    placeholder="Player ${i + 1} Name" data-player-id="${p.id}" />
                  <select class="setup-token-select" data-player-id="${p.id}">
                    <option value="${p.token}">${TOKENS.find(t => t.id === p.token)?.name || 'Select Token'}</option>
                    ${availableTokens.map(t => `<option value="${t.id}">${t.emoji} ${t.name}</option>`).join('')}
                  </select>
                </div>
                <button class="btn-remove-player" data-player-id="${p.id}" title="Remove player">✕</button>
              </div>
            `).join('')}
          </div>
          ${players.length < 8 ? `
            <button id="btn-add-player" class="btn btn-secondary btn-add-player">+ Add Player</button>
          ` : ''}
        </div>

        <div class="setup-section">
          <h2 class="section-title">💰 Starting Balance</h2>
          <div class="balance-input-group" style="margin-top:12px">
            <span class="currency-symbol">$</span>
            <input type="number" id="starting-balance" class="balance-input"
              value="${state.settings.startingBalance}" min="100" step="100" />
            <button class="btn btn-sm btn-secondary" id="btn-reset-balance" style="margin-left:8px">Reset $1,500</button>
          </div>
        </div>

        <div class="setup-section">
          <h2 class="section-title">📜 House Rules</h2>
          <div class="rules-grid">
            ${renderRuleToggle('auctionUnowned', 'Auction Unowned Properties', 'If a player declines to buy, the property goes to auction.', state.settings.rules.auctionUnowned)}
            ${renderRuleToggle('freeParkingJackpot', 'Free Parking Jackpot', 'Taxes and fines go into a pool collected by landing on Free Parking.', state.settings.rules.freeParkingJackpot)}
            ${renderRuleToggle('noBuildOnMortgagedGroup', 'No Build on Mortgaged Group', 'Cannot build houses if any property in the color group is mortgaged.', state.settings.rules.noBuildOnMortgagedGroup)}
            ${renderRuleToggle('doubleSalaryOnGo', 'Double Salary on Go', 'Collect $400 instead of $200 when landing exactly on Go.', state.settings.rules.doubleSalaryOnGo)}
            ${renderRuleToggle('useDigitalDice', '🎲 Use Digital Dice', 'Show an animated dice roller in the game instead of using physical dice.', state.settings.rules.useDigitalDice)}
          </div>
        </div>

        <div class="setup-start-section">
          <button id="btn-start-game" class="btn btn-primary btn-lg btn-start-game"
            ${players.length < 2 ? 'disabled' : ''}>
            🎲 Start Game
          </button>
          ${players.length < 2 ? '<p class="start-hint">Add at least 2 players to start</p>' : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', () => {
    state = createInitialState();
    dispatch({ type: 'SET_PHASE', phase: 'splash' });
  });

  const addBtn = document.getElementById('btn-add-player');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const nextToken = availableTokens[0];
      if (nextToken) dispatch({ type: 'ADD_PLAYER', name: '', tokenId: nextToken.id });
    });
  }

  document.querySelectorAll('.btn-remove-player').forEach(btn => {
    btn.addEventListener('click', e => dispatch({ type: 'REMOVE_PLAYER', playerId: e.target.dataset.playerId }));
  });

  document.querySelectorAll('.setup-player-name').forEach(input => {
    input.addEventListener('change', e =>
      dispatch({ type: 'UPDATE_PLAYER', playerId: e.target.dataset.playerId, field: 'name', value: e.target.value }));
  });

  document.querySelectorAll('.setup-token-select').forEach(select => {
    select.addEventListener('change', e =>
      dispatch({ type: 'UPDATE_PLAYER', playerId: e.target.dataset.playerId, field: 'token', value: e.target.value }));
  });

  document.getElementById('starting-balance').addEventListener('change', e =>
    dispatch({ type: 'UPDATE_SETTINGS', field: 'startingBalance', value: parseInt(e.target.value) || 1500 }));

  document.getElementById('btn-reset-balance').addEventListener('click', () =>
    dispatch({ type: 'UPDATE_SETTINGS', field: 'startingBalance', value: 1500 }));

  document.querySelectorAll('.rule-toggle-input').forEach(input => {
    input.addEventListener('change', e =>
      dispatch({ type: 'UPDATE_SETTINGS', field: e.target.dataset.rule, value: e.target.checked }));
  });

  const startBtn = document.getElementById('btn-start-game');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const invalid = state.players.filter(p => !p.name.trim());
      if (invalid.length > 0) { showToast('Please enter names for all players!', 'error'); return; }
      dispatch({ type: 'START_GAME' });
    });
  }
}

function renderRuleToggle(ruleKey, title, description, isOn) {
  return `
    <div class="rule-toggle">
      <div class="rule-info">
        <span class="rule-title">${title}</span>
        <span class="rule-desc">${description}</span>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" class="rule-toggle-input" data-rule="${ruleKey}" ${isOn ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </label>
    </div>
  `;
}

// ═══════════════════════════════════════
// DIGITAL DICE PANEL
// ═══════════════════════════════════════

function renderDicePanel(activePlayer) {
  if (!state.settings.rules.useDigitalDice) return '';
  const { die1, die2, isDoubles, rolling } = state.diceState || { die1: 1, die2: 1, isDoubles: false, rolling: false };
  const total = die1 + die2;
  const ts = state.turnState || {};
  const inJail = activePlayer.isInJail;

  // Determine what message to show
  let rollMsg = '';
  if (ts.hasRolled) {
    if (ts.releasedFromJailByDoubles) {
      rollMsg = `<span class="dice-result-msg dice-doubles">🎉 Doubles! Released from jail! Move ${total} spaces.</span>`;
    } else if (inJail && !isDoubles) {
      rollMsg = `<span class="dice-result-msg dice-fail">🔒 No doubles. Still in jail (attempt ${activePlayer.jailTurnsSpent}/3)</span>`;
    } else if (isDoubles && !inJail) {
      rollMsg = `<span class="dice-result-msg dice-doubles">🎉 Doubles! Roll again!</span>`;
    } else {
      rollMsg = `<span class="dice-result-msg">Total: ${total}</span>`;
    }
  }

  return `
    <div class="dice-panel">
      <div class="dice-panel-label">🎲 Digital Dice</div>
      <div class="dice-display">
        <div class="die die-1 ${rolling ? 'die-rolling' : ''}" id="die-face-1">
          ${renderDieFace(die1, ts.hasRolled)}
        </div>
        <span class="dice-plus">+</span>
        <div class="die die-2 ${rolling ? 'die-rolling' : ''}" id="die-face-2">
          ${renderDieFace(die2, ts.hasRolled)}
        </div>
      </div>
      ${rollMsg}
      <button class="btn btn-primary dice-roll-btn" id="btn-roll-dice"
        ${ts.hasRolled && !canRollAgain(activePlayer) ? 'disabled' : ''}>
        🎲 ${ts.hasRolled && !canRollAgain(activePlayer) ? 'Rolled' : 'Roll Dice'}
      </button>
    </div>
  `;
}

function canRollAgain(player) {
  // Can roll again if: just need to roll first time, or took doubles extra turn reset
  const ts = state.turnState || {};
  return !ts.hasRolled;
}

function renderDieFace(value, revealed) {
  if (!revealed) {
    return `<div class="die-face die-face-hidden"><div class="die-dot-center">?</div></div>`;
  }
  const dotPatterns = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
  };
  const dots = dotPatterns[value] || [];
  const allPositions = ['top-left', 'top-right', 'mid-left', 'center', 'mid-right', 'bottom-left', 'bottom-right'];
  return `
    <div class="die-face die-face-${value}">
      ${allPositions.map(pos => `
        <div class="die-dot die-dot-${pos} ${dots.includes(pos) ? 'die-dot-active' : 'die-dot-empty'}"></div>
      `).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════
// GAME DASHBOARD
// ═══════════════════════════════════════

function renderDashboard() {
  const activePlayer = state.players[state.activePlayerIndex];
  const ts = state.turnState || {};
  const showDoublesBtn = ts.hasRolled && ts.doublesCount > 0 && !activePlayer.isInJail && !ts.releasedFromJailByDoubles;

  app.innerHTML = `
    <div class="dashboard">
      <!-- Header -->
      <header class="dash-header">
        <div class="dash-header-left">
          <h1 class="dash-logo">MONOPOLY</h1>
          <div class="dash-logo-sub">Banking Companion</div>
        </div>
        <div class="dash-header-right">
          <div class="turn-badge">
            <span class="turn-label">Turn</span>
            <span class="turn-number">${state.turnNumber}</span>
          </div>
          ${state.settings.rules.freeParkingJackpot && state.freeParkingPool > 0 ? `
            <div class="free-parking-badge" title="Free Parking Jackpot">
              🅿️ $${state.freeParkingPool.toLocaleString()}
            </div>
          ` : ''}
          <div class="bank-info" title="Bank Supply">
            🏠 ${state.bank.housesRemaining} &nbsp; 🏨 ${state.bank.hotelsRemaining}
          </div>
          <button class="theme-toggle-btn" id="dash-theme-btn" title="Toggle theme">
            <span class="theme-icon">${themeIcon()}</span>
            <span>${themeLabel()}</span>
          </button>
        </div>
      </header>

      <!-- Player Cards -->
      <section class="player-grid" id="player-grid">
        ${state.players.filter(p => !p.isBankrupt).map(p => renderPlayerCard(p, p.id === activePlayer.id)).join('')}
        ${state.players.filter(p => p.isBankrupt).map(p => renderBankruptPlayerCard(p)).join('')}
      </section>

      <!-- Active Player Actions -->
      <section class="action-section">
        <div class="action-header">
          <span class="action-player-token">${TOKENS.find(t => t.id === activePlayer.token)?.emoji}</span>
          <h2 class="action-title">${activePlayer.name}'s Turn</h2>
          ${activePlayer.isInJail ? '<span class="jail-badge">🔒 IN JAIL</span>' : ''}
          <button class="btn btn-sm btn-secondary" id="btn-view-player-details" style="margin-left:auto">
            📊 My Stats
          </button>
        </div>

        ${renderDicePanel(activePlayer)}

        <div class="action-grid" id="action-grid">
          ${renderActionButtons(activePlayer)}
        </div>

        ${showDoublesBtn ? `
          <div class="doubles-banner">
            <span class="doubles-banner-icon">🎲🎲</span>
            <span class="doubles-banner-text">You rolled doubles! You get an extra turn.</span>
            <button class="btn btn-success doubles-extra-turn-btn" id="btn-extra-turn">
              ✨ Take Extra Turn
            </button>
          </div>
        ` : ''}

        <!-- Terminal action buttons: visually separated -->
        <div class="terminal-actions">
          <button class="action-btn action-end" data-action="endTurn">
            <span class="action-icon">⏭️</span> End Turn
          </button>
          <button class="action-btn action-bankrupt" data-action="bankruptcy">
            <span class="action-icon">🚪</span> Quit Game
          </button>
        </div>
      </section>

      <!-- Active Player Info Panel -->
      ${renderPlayerInfoPanel(activePlayer)}

      <!-- Bottom Panels -->
      <div class="bottom-panels">
        <section class="panel property-panel">
          <div class="panel-header">
            <h2 class="panel-title">📋 Property Registry</h2>
            <select id="property-filter" class="select-sm">
              <option value="owned" selected>Owned</option>
              <option value="unowned">Unowned</option>
              <option value="others">Owned by Others</option>
              <option value="all">All Properties</option>
            </select>
          </div>
          <div class="property-list" id="property-list">
            ${renderPropertyRegistry('owned')}
          </div>
        </section>

        <section class="panel log-panel">
          <div class="panel-header">
            <h2 class="panel-title">📜 Game Log</h2>
          </div>
          <div class="log-list" id="log-list">
            ${state.log.slice(0, 60).map(entry => `
              <div class="log-entry log-${entry.type}">
                <span class="log-time">${entry.timestamp}</span>
                <span class="log-message">${entry.message}</span>
              </div>
            `).join('')}
            ${state.log.length === 0 ? '<div class="log-empty">No events yet. Start playing!</div>' : ''}
          </div>
        </section>
      </div>
    </div>

    <div id="modal-container"></div>
    <div id="toast-container"></div>
  `;

  // Scroll to top on render
  window.scrollTo({ top: 0, behavior: 'smooth' });

  bindDashboardEvents();
  animateBalanceChanges();
}

// ═══════════════════════════════════════
// PLAYER CARD RENDERS
// ═══════════════════════════════════════

function renderPlayerCard(player, isActive) {
  const token = TOKENS.find(t => t.id === player.token);
  const propertyCount = player.ownedPropertyIds.length;
  const houseCount = player.ownedPropertyIds.reduce((sum, id) => sum + (state.propertyStates[id]?.houses || 0), 0);
  const hotelCount = player.ownedPropertyIds.filter(id => state.propertyStates[id]?.hasHotel).length;
  const goojfCount = player.getOutOfJailFreeCards.chance + player.getOutOfJailFreeCards.communityChest;

  return `
    <div class="player-card ${isActive ? 'player-card-active' : ''}"
         style="--player-color: ${player.colorRing}"
         data-player-id="${player.id}">
      <div class="player-card-header">
        <div class="player-token-ring" style="border-color: ${player.colorRing}">
          <span class="player-token-emoji">${token?.emoji || '❓'}</span>
        </div>
        <div class="player-name-section">
          <span class="player-name">${player.name}</span>
          ${isActive ? '<span class="active-badge">★ ACTIVE</span>' : ''}
          ${player.isInJail ? '<span class="jail-mini-badge">🔒</span>' : ''}
        </div>
      </div>
      <div class="player-balance-display">
        <span class="balance-dollar">$</span>
        <span class="balance-amount" data-player-id="${player.id}">${player.balance.toLocaleString()}</span>
      </div>
      <div class="player-stats">
        <span class="stat" title="Properties">📋 ${propertyCount}</span>
        <span class="stat" title="Houses">🏠 ${houseCount}</span>
        <span class="stat" title="Hotels">🏨 ${hotelCount}</span>
        ${goojfCount > 0 ? `<span class="stat" title="GOOJF Cards">🎫 ${goojfCount}</span>` : ''}
      </div>
    </div>
  `;
}

function renderBankruptPlayerCard(player) {
  const token = TOKENS.find(t => t.id === player.token);
  return `
    <div class="player-card player-card-bankrupt" data-player-id="${player.id}">
      <div class="player-card-header">
        <div class="player-token-ring bankrupt-ring" style="border-color:#ccc">
          <span class="player-token-emoji">${token?.emoji || '❓'}</span>
        </div>
        <span class="player-name">${player.name}</span>
      </div>
      <div class="bankrupt-label">BANKRUPT</div>
    </div>
  `;
}

// ═══════════════════════════════════════
// PLAYER INFO PANEL
// ═══════════════════════════════════════

function renderPlayerInfoPanel(player) {
  const netWorth = calculateNetWorth(player, state.propertyStates);
  const houseCount = player.ownedPropertyIds.reduce((sum, id) => sum + (state.propertyStates[id]?.houses || 0), 0);
  const hotelCount = player.ownedPropertyIds.filter(id => state.propertyStates[id]?.hasHotel).length;
  const goojfTotal = player.getOutOfJailFreeCards.chance + player.getOutOfJailFreeCards.communityChest;

  const groupedProps = {};
  player.ownedPropertyIds.forEach(id => {
    const propData = PROPERTIES.find(p => p.id === id);
    if (!propData) return;
    const g = propData.colorGroup;
    if (!groupedProps[g]) groupedProps[g] = [];
    groupedProps[g].push(propData);
  });

  const monopolyGroups = Object.keys(groupedProps).filter(g => {
    const allInGroup = PROPERTIES.filter(p => p.colorGroup === g);
    return allInGroup.every(p => player.ownedPropertyIds.includes(p.id));
  });

  const propGroupHTML = Object.keys(groupedProps).map(g => {
    const group = COLOR_GROUPS[g];
    const props = groupedProps[g];
    const hasMonopoly = monopolyGroups.includes(g);
    const propNames = props.map(p => {
      const ps = state.propertyStates[p.id];
      let suffix = '';
      if (ps.hasHotel) suffix = ' 🏨';
      else if (ps.houses > 0) suffix = ` 🏠×${ps.houses}`;
      if (ps.isMortgaged) suffix += ' (M)';
      return p.name.replace(/ Avenue| Place| Gardens| Railroad| Company| Works/, '') + suffix;
    }).join(', ');
    return `
      <div class="pip-color-group">
        <div class="pip-group-dot" style="background:${group?.hex || '#999'}"></div>
        <div class="pip-group-props">
          <strong>${group?.name || g}${hasMonopoly ? ' ⭐' : ''}</strong><br>${propNames}
        </div>
      </div>
    `;
  }).join('');

  const history = (cardHistory[player.id] || []).slice(-4).reverse();
  const historyHTML = history.length > 0
    ? history.map(h => `
        <div class="pip-card-entry ${h.deck}">
          ${h.deck === 'chance' ? '❓' : '📦'} ${h.text.slice(0, 55)}${h.text.length > 55 ? '…' : ''}
        </div>
      `).join('')
    : '<span class="pip-card-empty">No cards drawn yet this game</span>';

  return `
    <div class="player-info-panel">
      <div class="pip-header">
        <span class="pip-title">${player.name.toUpperCase()} — PLAYER OVERVIEW</span>
        <span class="pip-player-token">${TOKENS.find(t => t.id === player.token)?.emoji || '❓'}</span>
      </div>
      <div class="pip-body">

        <div class="pip-section">
          <div class="pip-section-title">💰 Finances</div>
          <div class="pip-finances">
            <div class="pip-fin-block">
              <div class="pip-fin-label">Balance</div>
              <div class="pip-fin-value">$${player.balance.toLocaleString()}</div>
            </div>
            <div class="pip-fin-block">
              <div class="pip-fin-label">Net Worth</div>
              <div class="pip-fin-value pip-networth">$${netWorth.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div class="pip-section">
          <div class="pip-section-title">🏘️ Properties (${player.ownedPropertyIds.length})</div>
          <div class="pip-property-groups">
            ${propGroupHTML || '<span class="pip-card-empty">No properties owned yet</span>'}
          </div>
        </div>

        <div class="pip-section">
          <div class="pip-section-title">📊 Status</div>
          <div class="pip-status-grid">
            <div class="pip-status-item">
              <span class="pip-status-label">Houses</span>
              <span class="pip-status-value">${houseCount === 0 ? '—' : houseCount}</span>
            </div>
            <div class="pip-status-item">
              <span class="pip-status-label">Hotels</span>
              <span class="pip-status-value">${hotelCount === 0 ? '—' : hotelCount}</span>
            </div>
            <div class="pip-status-item">
              <span class="pip-status-label">GOOJF Cards</span>
              <span class="pip-status-value ${goojfTotal > 0 ? 'good' : ''}">${goojfTotal > 0 ? '🎫 ' + goojfTotal : '—'}</span>
            </div>
            <div class="pip-status-item">
              <span class="pip-status-label">In Jail?</span>
              <span class="pip-status-value ${player.isInJail ? 'bad' : 'good'}">${player.isInJail ? `🔒 (Turn ${player.jailTurnsSpent + 1}/3)` : '✅ Free'}</span>
            </div>
            <div class="pip-status-item">
              <span class="pip-status-label">Monopolies</span>
              <span class="pip-status-value ${monopolyGroups.length > 0 ? 'good' : ''}">${monopolyGroups.length > 0 ? '⭐ ' + monopolyGroups.length : '—'}</span>
            </div>
            <div class="pip-status-item">
              <span class="pip-status-label">Mortgaged</span>
              <span class="pip-status-value ${player.ownedPropertyIds.some(id => state.propertyStates[id]?.isMortgaged) ? 'warn' : ''}">
                ${player.ownedPropertyIds.filter(id => state.propertyStates[id]?.isMortgaged).length || '—'}
              </span>
            </div>
          </div>
        </div>

        <div class="pip-section">
          <div class="pip-section-title">🃏 Recent Card Draws</div>
          <div class="pip-card-history">
            ${historyHTML}
          </div>
        </div>

      </div>
    </div>
  `;
}

// ═══════════════════════════════════════
// ACTION BUTTONS
// ═══════════════════════════════════════

function renderActionButtons(player) {
  const hasGoojf = player.getOutOfJailFreeCards.chance + player.getOutOfJailFreeCards.communityChest > 0;
  const salaryAmt = state.settings.rules.doubleSalaryOnGo ? '$200/$400' : '$200';
  const ts = state.turnState || {};

  if (player.isInJail) {
    // If digital dice used and not yet rolled this turn, show roll-in-jail options
    const needsRoll = state.settings.rules.useDigitalDice;
    return `
      <button class="action-btn action-jail" data-action="payJailFine" ${player.balance < 50 ? 'disabled' : ''}>
        <span class="action-icon">💸</span> Pay $50 Fine
      </button>
      <button class="action-btn action-jail" data-action="useGoojf" ${!hasGoojf ? 'disabled' : ''}>
        <span class="action-icon">🎫</span> Use GOOJF Card
      </button>
      ${ts.hasRolled && ts.releasedFromJailByDoubles ? `
        <div class="jail-released-banner">
          🎉 Released by doubles! Move ${(state.diceState?.die1 || 0) + (state.diceState?.die2 || 0)} spaces then proceed.
        </div>
      ` : ''}
      <button class="action-btn action-trade"     data-action="trade">     <span class="action-icon">🤝</span> Trade </button>
      <button class="action-btn action-mortgage"  data-action="mortgage">  <span class="action-icon">🏦</span> Mortgage </button>
      <button class="action-btn action-unmortgage"data-action="unmortgage"><span class="action-icon">🔓</span> Unmortgage </button>
      <button class="action-btn action-build"     data-action="sellHouse"> <span class="action-icon">🔻</span> Sell Houses </button>
    `;
  }

  return `
    <button class="action-btn action-buy"       data-action="buyProperty">  <span class="action-icon">🏠</span> Buy Property </button>
    <button class="action-btn action-rent"      data-action="payRent">      <span class="action-icon">💸</span> Pay Rent </button>
    <button class="action-btn action-chance"    data-action="drawChance"    ${ts.hasDrawnCard ? 'disabled title="Card already drawn this turn"' : ''}>
      <span class="action-icon">❓</span> Draw Chance
    </button>
    <button class="action-btn action-cc"        data-action="drawCC"        ${ts.hasDrawnCard ? 'disabled title="Card already drawn this turn"' : ''}>
      <span class="action-icon">📦</span> Community Chest
    </button>
    <button class="action-btn action-build"     data-action="build">        <span class="action-icon">🏗️</span> Build Houses </button>
    <button class="action-btn action-mortgage"  data-action="mortgage">     <span class="action-icon">🏦</span> Mortgage </button>
    <button class="action-btn action-unmortgage"data-action="unmortgage">   <span class="action-icon">🔓</span> Unmortgage </button>
    <button class="action-btn action-trade"     data-action="trade">        <span class="action-icon">🤝</span> Trade </button>
    <button class="action-btn action-jail"      data-action="goToJail">     <span class="action-icon">🔒</span> Go to Jail </button>
    <button class="action-btn action-salary"    data-action="collectSalary" ${ts.hasPassedGo ? 'disabled title="Salary already collected"' : ''}><span class="action-icon">💰</span> Collect ${salaryAmt} Salary </button>
    <button class="action-btn action-tax"       data-action="incomeTax"     ${ts.hasPaidTax ? 'disabled title="Tax already paid this turn"' : ''}><span class="action-icon">📊</span> Income Tax </button>
    <button class="action-btn action-tax"       data-action="luxuryTax"     ${ts.hasPaidTax ? 'disabled title="Tax already paid this turn"' : ''}><span class="action-icon">💎</span> Luxury Tax ($75) </button>
    ${state.settings.rules.freeParkingJackpot && state.freeParkingPool > 0 ? `
      <button class="action-btn action-salary"  data-action="collectFreeParking">
        <span class="action-icon">🅿️</span> Free Parking $${state.freeParkingPool.toLocaleString()}
      </button>
    ` : ''}
    <button class="action-btn action-build"     data-action="sellHouse">    <span class="action-icon">🔻</span> Sell Buildings </button>
  `;
}

function renderPropertyRegistry(filter) {
  let props = PROPERTIES.map(p => ({
    ...p,
    state: state.propertyStates[p.id],
    owner: state.players.find(pl => pl.id === state.propertyStates[p.id]?.ownerId),
    group: COLOR_GROUPS[p.colorGroup],
  }));

  const activePlayer = state.players[state.activePlayerIndex];

  if (filter === 'unowned') props = props.filter(p => !p.state.ownerId);
  else if (filter === 'owned') props = props.filter(p => p.state.ownerId === activePlayer.id);
  else if (filter === 'others') props = props.filter(p => p.state.ownerId && p.state.ownerId !== activePlayer.id);

  return props.map(p => {
    const colorHex = p.group?.hex || '#999';
    const ownerName = p.owner ? p.owner.name : 'Unowned';
    let statusBadges = '';
    if (p.state.hasHotel) statusBadges = '<span class="prop-badge hotel-badge">🏨 Hotel</span>';
    else if (p.state.houses > 0) statusBadges = `<span class="prop-badge house-badge">🏠 ×${p.state.houses}</span>`;
    if (p.state.isMortgaged) statusBadges += '<span class="prop-badge mortgage-badge">MORTGAGED</span>';

    return `
      <div class="property-row" data-property-id="${p.id}">
        <div class="prop-color-strip" style="background: ${colorHex}"></div>
        <div class="prop-info">
          <span class="prop-name">${p.name}</span>
          <span class="prop-owner">${ownerName}${p.owner ? ' ' + (TOKENS.find(t => t.id === p.owner.token)?.emoji || '') : ''}</span>
        </div>
        <div class="prop-status">${statusBadges}</div>
        <div class="prop-price">$${p.purchasePrice?.toLocaleString() || '—'}</div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════
// BALANCE ANIMATION
// ═══════════════════════════════════════

function animateBalanceChanges() {
  state.players.forEach(p => {
    const el = document.querySelector(`.balance-amount[data-player-id="${p.id}"]`);
    if (!el) return;
    const oldVal = previousBalances[p.id];
    const newVal = p.balance;
    if (oldVal === undefined || oldVal === newVal) return;

    el.classList.remove('balance-up', 'balance-down');
    void el.offsetWidth;
    el.classList.add(newVal > oldVal ? 'balance-up' : 'balance-down');

    const duration = 600;
    const start = performance.now();
    const diff = newVal - oldVal;
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(oldVal + diff * ease).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = newVal.toLocaleString();
    }
    requestAnimationFrame(step);
  });
}

// ═══════════════════════════════════════
// DASHBOARD EVENT BINDING
// ═══════════════════════════════════════

function bindDashboardEvents() {
  const activePlayer = state.players[state.activePlayerIndex];

  document.getElementById('dash-theme-btn')?.addEventListener('click', toggleTheme);
  document.getElementById('btn-view-player-details')?.addEventListener('click', () =>
    showPlayerDetailModal(activePlayer));

  // Digital dice roll button
  document.getElementById('btn-roll-dice')?.addEventListener('click', () => {
    const diceEls = document.querySelectorAll('.die');
    diceEls.forEach(d => d.classList.add('die-rolling'));
    setTimeout(() => {
      dispatch({ type: 'ROLL_DICE' });
    }, 400);
  });

  // Extra turn (doubles) button
  document.getElementById('btn-extra-turn')?.addEventListener('click', () => {
    dispatch({ type: 'RESET_DOUBLES_TURN' });
  });

  document.querySelectorAll('.action-btn:not(.terminal-action)').forEach(btn => {
    if (btn.closest('.terminal-actions')) return;
    btn.addEventListener('click', e => handleAction(e.currentTarget.dataset.action, activePlayer));
  });

  // Terminal action buttons (End Turn / Quit Game)
  document.querySelectorAll('.terminal-actions .action-btn').forEach(btn => {
    btn.addEventListener('click', e => handleAction(e.currentTarget.dataset.action, activePlayer));
  });

  const filter = document.getElementById('property-filter');
  if (filter) {
    filter.addEventListener('change', e => {
      document.getElementById('property-list').innerHTML = renderPropertyRegistry(e.target.value);
      bindPropertyClicks();
    });
  }

  document.querySelectorAll('.player-card:not(.player-card-bankrupt)').forEach(card => {
    card.addEventListener('click', () => {
      const pid = card.dataset.playerId;
      const p = state.players.find(pl => pl.id === pid);
      if (p) showPlayerDetailModal(p);
    });
  });

  bindPropertyClicks();
}

function bindPropertyClicks() {
  document.querySelectorAll('.property-row').forEach(row => {
    row.addEventListener('click', () => showPropertyDetail(row.dataset.propertyId));
  });
}

// ═══════════════════════════════════════
// PLAYER DETAIL MODAL
// ═══════════════════════════════════════

function showPlayerDetailModal(player) {
  const netWorth = calculateNetWorth(player, state.propertyStates);
  const houseCount = player.ownedPropertyIds.reduce((sum, id) => sum + (state.propertyStates[id]?.houses || 0), 0);
  const hotelCount = player.ownedPropertyIds.filter(id => state.propertyStates[id]?.hasHotel).length;
  const goojfTotal = player.getOutOfJailFreeCards.chance + player.getOutOfJailFreeCards.communityChest;
  const token = TOKENS.find(t => t.id === player.token);

  const groupedProps = {};
  player.ownedPropertyIds.forEach(id => {
    const propData = PROPERTIES.find(p => p.id === id);
    if (!propData) return;
    if (!groupedProps[propData.colorGroup]) groupedProps[propData.colorGroup] = [];
    groupedProps[propData.colorGroup].push({ data: propData, state: state.propertyStates[id] });
  });

  const monopolyGroups = Object.keys(groupedProps).filter(g => {
    return PROPERTIES.filter(p => p.colorGroup === g).every(p => player.ownedPropertyIds.includes(p.id));
  });

  const propsHTML = Object.keys(groupedProps).map(g => {
    const group = COLOR_GROUPS[g];
    const isMonopoly = monopolyGroups.includes(g);
    const items = groupedProps[g].map(({ data: p, state: ps }) => {
      let status = '';
      if (ps.hasHotel) status = '🏨';
      else if (ps.houses > 0) status = `🏠×${ps.houses}`;
      if (ps.isMortgaged) status += ' (Mortgaged)';
      return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;border-bottom:1px dashed var(--c-border)">
        <span>${p.name}</span><span style="color:#888">${status || 'Unimproved'}</span>
      </div>`;
    }).join('');
    return `
      <div class="pdm-group-row">
        <div class="pdm-group-color" style="background:${group?.hex || '#999'}"></div>
        <div style="flex:1">
          <strong style="font-size:12px">${group?.name || g} ${isMonopoly ? '<span class="pdm-monopoly-badge">MONOPOLY ⭐</span>' : ''}</strong>
          ${items}
        </div>
      </div>
    `;
  }).join('');

  const history = (cardHistory[player.id] || []).slice().reverse();

  const content = `
    <div class="player-detail-modal">
      <div class="pdm-finance-row">
        <div class="pdm-finance-block">
          <div class="pdm-finance-label">💰 Cash Balance</div>
          <div class="pdm-finance-value">$${player.balance.toLocaleString()}</div>
        </div>
        <div class="pdm-finance-block">
          <div class="pdm-finance-label">🏆 Total Net Worth</div>
          <div class="pdm-finance-value pdm-networth-value">$${netWorth.toLocaleString()}</div>
        </div>
      </div>

      <div class="pdm-section-title">📊 Status Overview</div>
      <div class="pdm-status-grid">
        <div class="pdm-status-item">
          <span class="pdm-status-icon">🏠</span>
          <span class="pdm-status-label">Houses</span>
          <span class="pdm-status-val">${houseCount}</span>
        </div>
        <div class="pdm-status-item">
          <span class="pdm-status-icon">🏨</span>
          <span class="pdm-status-label">Hotels</span>
          <span class="pdm-status-val">${hotelCount}</span>
        </div>
        <div class="pdm-status-item">
          <span class="pdm-status-icon">🎫</span>
          <span class="pdm-status-label">GOOJF</span>
          <span class="pdm-status-val">${goojfTotal}</span>
        </div>
        <div class="pdm-status-item">
          <span class="pdm-status-icon">${player.isInJail ? '🔒' : '✅'}</span>
          <span class="pdm-status-label">Jail Status</span>
          <span class="pdm-status-val">${player.isInJail ? `Turn ${player.jailTurnsSpent + 1}/3` : 'Free'}</span>
        </div>
        <div class="pdm-status-item">
          <span class="pdm-status-icon">⭐</span>
          <span class="pdm-status-label">Monopolies</span>
          <span class="pdm-status-val">${monopolyGroups.length}</span>
        </div>
        <div class="pdm-status-item">
          <span class="pdm-status-icon">📋</span>
          <span class="pdm-status-label">Properties</span>
          <span class="pdm-status-val">${player.ownedPropertyIds.length}</span>
        </div>
      </div>

      <div class="pdm-section-title">🏘️ Property Portfolio</div>
      <div class="pdm-property-groups">
        ${propsHTML || '<span style="font-size:13px;color:#aaa;font-style:italic">No properties owned yet</span>'}
      </div>

      <div class="pdm-section-title">🃏 Card Draw History</div>
      <div style="max-height:140px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
        ${history.length > 0
      ? history.map(h => `
              <div class="pip-card-entry ${h.deck}">
                <strong>${h.timestamp}</strong> ${h.deck === 'chance' ? '❓' : '📦'} ${h.text}
              </div>
            `).join('')
      : '<span style="font-size:13px;color:#aaa;font-style:italic">No cards drawn yet</span>'}
      </div>
    </div>
  `;

  showModal(`${token?.emoji} ${player.name} — Full Stats`, content);
}

// ═══════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════

function handleAction(action, player) {
  const blockedMessage = getTurnBlockMessage(action);
  if (blockedMessage) {
    showToast(blockedMessage, 'error');
    return;
  }

  switch (action) {
    case 'buyProperty': showBuyPropertyModal(player); break;
    case 'payRent': showPayRentModal(player); break;
    case 'drawChance': drawCard('chance', player); break;
    case 'drawCC': drawCard('communityChest', player); break;
    case 'build': showBuildModal(player); break;
    case 'mortgage': showMortgageModal(player); break;
    case 'unmortgage': showUnmortgageModal(player); break;
    case 'trade': showTradeModal(player); break;
    case 'goToJail': dispatch({ type: 'SEND_TO_JAIL', playerId: player.id }); break;
    case 'payJailFine': dispatch({ type: 'PAY_JAIL_FINE', playerId: player.id }); break;
    case 'useGoojf': dispatch({ type: 'USE_GOOJF', playerId: player.id }); break;
    case 'collectSalary': showCollectSalaryModal(player); break;
    case 'collectFreeParking': dispatch({ type: 'COLLECT_FREE_PARKING', playerId: player.id }); break;
    case 'incomeTax': showIncomeTaxModal(player); break;
    case 'luxuryTax':
      dispatch({ type: 'PLAYER_TO_BANK', playerId: player.id, amount: 75, reason: 'Luxury Tax' });
      showToast(`${player.name} paid $75 Luxury Tax.`, 'info');
      break;
    case 'endTurn': dispatch({ type: 'END_TURN' }); break;
    case 'bankruptcy': showBankruptcyModal(player); break;
    case 'sellHouse': showSellHouseModal(player); break;
  }
}

function getTurnBlockMessage(action) {
  const turn = state.turnState || {};
  if (action === 'buyProperty' && turn.hasBoughtProperty) {
    return 'Only one property can be bought on a turn.';
  }
  if ((action === 'drawChance' || action === 'drawCC') && turn.hasDrawnCard) {
    return 'A Chance or Community Chest card was already drawn this turn.';
  }
  if (action === 'collectSalary' && turn.hasPassedGo) {
    return 'Salary was already collected this turn.';
  }
  if ((action === 'incomeTax' || action === 'luxuryTax') && turn.hasPaidTax) {
    return 'Tax was already paid this turn.';
  }
  return '';
}

// ═══════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════

function showModal(title, content, onClose, hideCloseButton = false) {
  const container = document.getElementById('modal-container') || document.body;
  container.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" id="modal">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          ${hideCloseButton ? '' : '<button class="modal-close" id="modal-close-btn">✕</button>'}
        </div>
        <div class="modal-body">${content}</div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    document.getElementById('modal-overlay')?.classList.add('modal-visible');
  });

  const closeModal = () => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('modal-visible');
      setTimeout(() => {
        container.innerHTML = '';
        if (onClose) onClose();
      }, 280);
    }
  };

  if (!hideCloseButton) {
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
  }

  return closeModal;
}

function closeModalThen(fn, delay = 310) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (overlay) overlay.classList.remove('modal-visible');
  setTimeout(() => {
    if (container) container.innerHTML = '';
    fn();
  }, delay);
}

// ═══════════════════════════════════════
// MODALS — BUY PROPERTY
// ═══════════════════════════════════════

function showBuyPropertyModal(player) {
  const unownedProps = PROPERTIES.filter(p => !state.propertyStates[p.id].ownerId);
  if (unownedProps.length === 0) { showToast('All properties are owned!', 'warning'); return; }

  const content = `
    <div class="buy-property-modal">
      <p class="modal-instruction">Select a property to purchase or send to auction:</p>
      <div class="property-select-list">
        ${unownedProps.map(p => {
    const group = COLOR_GROUPS[p.colorGroup];
    const canAfford = player.balance >= p.purchasePrice;
    return `
            <div class="property-select-btn property-purchase-row">
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <div class="prop-select-info">
                <span class="prop-select-name">${p.name}</span>
                <span class="prop-select-note">${canAfford ? 'Available to buy' : 'Cannot afford directly'}</span>
              </div>
              <span class="prop-select-price">$${p.purchasePrice.toLocaleString()}</span>
              <div class="property-purchase-actions">
                <button class="btn btn-sm btn-success buy-property-btn" data-prop-id="${p.id}" ${!canAfford ? 'disabled' : ''}>Buy</button>
                ${state.settings.rules.auctionUnowned ? `<button class="btn btn-sm btn-warning auction-property-btn" data-prop-id="${p.id}">Auction</button>` : ''}
              </div>
            </div>
          `;
  }).join('')}
      </div>
      <div class="modal-player-balance">Your balance: <strong>$${player.balance.toLocaleString()}</strong></div>
    </div>
  `;

  const closeModal = showModal('🏠 Buy Property', content);

  document.querySelectorAll('.buy-property-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.turnState?.hasBoughtProperty) {
        showToast('Only one property can be bought on a turn.', 'error');
        return;
      }
      const propId = btn.dataset.propId;
      const propData = PROPERTIES.find(p => p.id === propId);
      closeModal();
      setTimeout(() => {
        dispatch({ type: 'BUY_PROPERTY', playerId: player.id, propertyId: propId });
        showToast(`${player.name} bought ${propData.name}!`, 'success');
      }, 310);
    });
  });

  document.querySelectorAll('.auction-property-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const propId = btn.dataset.propId;
      const propData = PROPERTIES.find(p => p.id === propId);
      closeModal();
      setTimeout(() => {
        showToast(`${propData.name} is up for auction.`, 'info');
        showAuctionModal(propId);
      }, 310);
    });
  });
}

// ═══════════════════════════════════════
// MODALS — PAY RENT
// ═══════════════════════════════════════

function showPayRentModal(player) {
  const ownedByOthers = PROPERTIES.filter(p => {
    const ps = state.propertyStates[p.id];
    return ps.ownerId && ps.ownerId !== player.id && !ps.isMortgaged;
  });
  if (ownedByOthers.length === 0) { showToast('No properties with rent to pay!', 'info'); return; }

  const hasUtility = ownedByOthers.some(p => p.type === 'utility');

  const content = `
    <div class="pay-rent-modal">
      <p class="modal-instruction">Select the property you landed on:</p>
      ${hasUtility ? `
        <div class="dice-input-section">
          <label>Dice Roll Total (for Utility rent):</label>
          <input type="number" id="dice-total-input" class="dice-input" min="2" max="12" value="7" />
        </div>
      ` : ''}
      <div class="property-select-list">
        ${ownedByOthers.map(p => {
    const group = COLOR_GROUPS[p.colorGroup];
    const owner = state.players.find(pl => pl.id === state.propertyStates[p.id].ownerId);
    const rent = calculateRent(p.id, state.propertyStates, 7, null);
    return `
            <button class="property-select-btn" data-prop-id="${p.id}">
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <div class="prop-select-info">
                <span class="prop-select-name">${p.name}</span>
                <span class="prop-select-owner">Owner: ${owner?.name || 'Unknown'}</span>
              </div>
              <span class="rent-amount" data-rent-display="${p.id}">$${rent.toLocaleString()}${p.type === 'utility' ? '*' : ''}</span>
            </button>
          `;
  }).join('')}
      </div>
      ${hasUtility ? '<p class="modal-note">* Utility rent depends on dice roll</p>' : ''}
    </div>
  `;

  const closeModal = showModal('💸 Pay Rent', content);

  const diceInput = document.getElementById('dice-total-input');
  if (diceInput) {
    diceInput.addEventListener('input', (e) => {
      const dice = parseInt(e.target.value) || 7;
      ownedByOthers.forEach(p => {
        if (p.type === 'utility') {
          const newRent = calculateRent(p.id, state.propertyStates, dice, null);
          const rentSpan = document.querySelector(`span[data-rent-display="${p.id}"]`);
          if (rentSpan) rentSpan.textContent = '$' + newRent.toLocaleString() + '*';
        }
      });
    });
  }

  document.querySelectorAll('.property-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const propId = btn.dataset.propId;
      const propData = PROPERTIES.find(p => p.id === propId);
      const owner = state.players.find(pl => pl.id === state.propertyStates[propId].ownerId);
      let diceTotal = 7;
      const diceInput = document.getElementById('dice-total-input');
      if (diceInput) diceTotal = parseInt(diceInput.value) || 7;
      const rent = calculateRent(propId, state.propertyStates, diceTotal, null);
      closeModal();
      setTimeout(() => {
        dispatch({ type: 'PLAYER_TO_PLAYER', fromId: player.id, toId: owner.id, amount: rent, reason: `Rent on ${propData.name}` });
        showToast(`Paid $${rent.toLocaleString()} rent to ${owner.name}`, 'info');
      }, 310);
    });
  });
}

// ═══════════════════════════════════════
// MODALS — DRAW CARD (with conditional choice UI)
// ═══════════════════════════════════════

function drawCard(deck, player) {
  if (state.turnState?.hasDrawnCard) {
    showToast('A Chance or Community Chest card was already drawn this turn.', 'error');
    return;
  }

  dispatch({ type: 'DRAW_CARD', deck });

  const card = state._drawnCard;
  if (!card) return;

  // Record in card history
  if (!cardHistory[player.id]) cardHistory[player.id] = [];
  cardHistory[player.id].push({
    deck,
    text: card.text,
    timestamp: new Date().toLocaleTimeString(),
  });

  const isChance = deck === 'chance';
  const borderColor = isChance ? '#F7941D' : '#4A90E2';
  const deckLabel = isChance ? 'CHANCE' : 'COMMUNITY CHEST';
  const bgEmoji = isChance ? '❓' : '📦';

  const content = `
    <div class="card-draw-overlay">
      <div class="card-flip-container">
        <div class="card-face" style="border-color: ${borderColor}">
          <div class="card-face-header" style="background: ${borderColor}">
            <span class="card-deck-label">${deckLabel}</span>
            <span class="card-deck-emoji">${bgEmoji}</span>
          </div>
          <div class="card-face-body">
            <p class="card-text">${card.text}</p>
          </div>
          <div class="card-face-footer" style="border-top-color: ${borderColor}">
            ${card.id}
          </div>
        </div>
      </div>
    </div>
  `;

  const closeModal = showModal(`${bgEmoji} ${deckLabel}`, content, null, true);

  const modalBody = document.querySelector('.modal-body');
  if (modalBody) {
    if (card.requiresChoice && card.choiceType) {
      // Render conditional choice buttons
      renderCardChoiceButtons(card, player, modalBody, closeModal);
    } else {
      // Simple apply effect button
      const applyBtn = document.createElement('button');
      applyBtn.className = 'btn btn-primary btn-lg card-apply-btn';
      applyBtn.innerHTML = '✓ Apply Effect';
      applyBtn.addEventListener('click', () => {
        if (state.turnState?.hasAppliedCard) {
          showToast('Card effect already applied this turn.', 'error');
          closeModal();
          return;
        }
        dispatch({ type: 'APPLY_CARD_EFFECT', card, context: {} });
        closeModal();
        showToast('Card effect applied!', 'success');
      });
      modalBody.appendChild(applyBtn);
    }
  }
}

function renderCardChoiceButtons(card, player, modalBody, closeModal) {
  const choiceContainer = document.createElement('div');
  choiceContainer.className = 'card-choice-container';

  if (card.choiceType === 'passedGo') {
    // Player needs to confirm if they passed Go
    choiceContainer.innerHTML = `
      <div class="card-choice-label">Did you pass Go on your way there?</div>
      <div class="card-choice-btns">
        <button class="btn btn-success card-choice-btn" data-choice="yes">
          ✅ Yes — I passed Go (+$200)
        </button>
        <button class="btn btn-secondary card-choice-btn" data-choice="no">
          ❌ No — I went directly
        </button>
      </div>
    `;
    modalBody.appendChild(choiceContainer);

    modalBody.querySelectorAll('.card-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.turnState?.hasAppliedCard) { closeModal(); return; }
        const passedGo = btn.dataset.choice === 'yes';
        dispatch({ type: 'APPLY_CARD_EFFECT', card, context: { passedGo } });
        closeModal();
        showToast(`Card applied! ${passedGo ? 'Collected $200 for passing Go.' : ''}`, 'success');
      });
    });

  } else if (card.choiceType === 'nearestProperty') {
    // Find the nearest property
    const targetType = card.effectPayload.targetType;
    const nearestPos = findNearest(player.boardPosition, targetType);
    const nearestProp = PROPERTIES.find(p => p.boardPosition === nearestPos);
    const propState = nearestProp ? state.propertyStates[nearestProp.id] : null;
    const isOwned = propState && propState.ownerId;
    const owner = isOwned ? state.players.find(p => p.id === propState.ownerId) : null;
    const isOwnedByActivePlayer = isOwned && propState.ownerId === player.id;

    const propLabel = nearestProp
      ? `<div class="card-nearest-prop">
          Nearest ${targetType === 'railroad' ? 'Railroad' : 'Utility'}:
          <strong>${nearestProp.name}</strong>
          ${isOwned
          ? `<span class="card-prop-owned-tag">Owned by ${isOwnedByActivePlayer ? 'YOU' : owner?.name || '?'}</span>`
          : `<span class="card-prop-unowned-tag">Unowned</span>`}
        </div>`
      : '';

    if (isOwnedByActivePlayer) {
      // Owned by this player — no rent, just move
      choiceContainer.innerHTML = `
        ${propLabel}
        <div class="card-choice-label">You own this property — no rent to pay.</div>
        <button class="btn btn-primary card-choice-btn-single" id="card-move-only">
          🚶 Move There (No Rent)
        </button>
      `;
      modalBody.appendChild(choiceContainer);
      document.getElementById('card-move-only').addEventListener('click', () => {
        if (state.turnState?.hasAppliedCard) { closeModal(); return; }
        dispatch({ type: 'APPLY_CARD_EFFECT', card, context: {} });
        closeModal();
        showToast(`Moved to ${nearestProp?.name}.`, 'info');
      });
    } else if (!isOwned) {
      // Unowned — can buy from bank
      choiceContainer.innerHTML = `
        ${propLabel}
        <div class="card-choice-label">This property is unowned. You may buy it from the Bank.</div>
        <div class="card-choice-btns">
          <button class="btn btn-success card-choice-btn" data-choice="buy">
            🏦 Buy from Bank ($${nearestProp?.purchasePrice?.toLocaleString() || '?'})
          </button>
          <button class="btn btn-secondary card-choice-btn" data-choice="skip">
            ⏭️ Skip / Pass (Auction)
          </button>
        </div>
      `;
      modalBody.appendChild(choiceContainer);
      modalBody.querySelectorAll('.card-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (state.turnState?.hasAppliedCard) { closeModal(); return; }
          dispatch({ type: 'APPLY_CARD_EFFECT', card, context: {} });
          closeModal();
          if (btn.dataset.choice === 'buy' && nearestProp) {
            setTimeout(() => {
              if (player.balance >= nearestProp.purchasePrice) {
                dispatch({ type: 'BUY_PROPERTY', playerId: player.id, propertyId: nearestProp.id });
                showToast(`${player.name} bought ${nearestProp.name}!`, 'success');
              } else {
                showToast(`Can't afford ${nearestProp.name}. Sending to auction.`, 'warning');
                if (state.settings.rules.auctionUnowned) showAuctionModal(nearestProp.id);
              }
            }, 310);
          } else if (state.settings.rules.auctionUnowned && nearestProp) {
            setTimeout(() => showAuctionModal(nearestProp.id), 310);
          }
        });
      });
    } else {
      // Owned by another player — pay rent (doubled for railroads, 10× for utilities)
      let rentInfo = '';
      let rentAmount = 0;
      if (targetType === 'railroad') {
        rentAmount = calculateRent(nearestProp.id, state.propertyStates, 0, { doubleRent: true });
        rentInfo = `<span class="card-rent-info">Double rent: <strong>$${rentAmount.toLocaleString()}</strong></span>`;
      }

      choiceContainer.innerHTML = `
        ${propLabel}
        <div class="card-choice-label">Pay ${targetType === 'railroad' ? 'DOUBLE' : '10× dice'} rent to ${owner?.name || '?'}</div>
        ${targetType === 'utility' ? `
          <div class="card-utility-dice">
            <label>Dice roll total:</label>
            <input type="number" id="card-dice-input" class="dice-input" min="2" max="12" value="7" style="width:70px;margin-left:8px" />
            <span id="card-rent-preview" class="card-rent-preview">Rent: $${7 * 10}</span>
          </div>
        ` : rentInfo}
        <button class="btn btn-warning btn-lg" id="card-pay-rent-btn">
          💸 Pay Rent to ${owner?.name || '?'}
        </button>
      `;
      modalBody.appendChild(choiceContainer);

      const diceInput = document.getElementById('card-dice-input');
      if (diceInput) {
        diceInput.addEventListener('input', () => {
          const dice = parseInt(diceInput.value) || 7;
          const preview = document.getElementById('card-rent-preview');
          if (preview) preview.textContent = `Rent: $${(dice * 10).toLocaleString()}`;
        });
      }

      document.getElementById('card-pay-rent-btn').addEventListener('click', () => {
        if (state.turnState?.hasAppliedCard) { closeModal(); return; }
        let finalRent = rentAmount;
        if (targetType === 'utility') {
          const dice = parseInt(document.getElementById('card-dice-input')?.value) || 7;
          finalRent = dice * 10;
        }
        dispatch({
          type: 'APPLY_CARD_EFFECT',
          card,
          context: { rentAmount: finalRent, ownerId: propState.ownerId }
        });
        closeModal();
        showToast(`Paid $${finalRent.toLocaleString()} rent to ${owner?.name}.`, 'info');
      });
    }
  }
}

// ═══════════════════════════════════════
// MODALS — BUILD
// ═══════════════════════════════════════

function showBuildModal(player) {
  const buildable = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && p.data.type === 'property');

  if (buildable.length === 0) { showToast("You don't own any buildable properties!", 'warning'); return; }

  const content = `
    <div class="build-modal">
      <p class="modal-instruction">Select a property to build on:</p>
      <div class="bank-supply-info">
        <span>🏠 Houses: ${state.bank.housesRemaining}</span>
        <span>🏨 Hotels: ${state.bank.hotelsRemaining}</span>
      </div>
      <div class="property-select-list">
        ${buildable.map(p => {
    const houseCheck = canBuildHouse(p.id, player.id, state.propertyStates, state.bank);
    const hotelCheck = canBuildHotel(p.id, player.id, state.propertyStates, state.bank);
    const group = COLOR_GROUPS[p.data.colorGroup];
    const canAffordHouse = houseCheck.allowed && player.balance >= houseCheck.cost;
    const canAffordHotel = hotelCheck.allowed && player.balance >= hotelCheck.cost;
    return `
            <div class="build-property-row">
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}; width:14px; height:32px; border-radius:4px; margin-right:10px"></div>
              <div class="prop-select-info" style="flex:1">
                <span class="prop-select-name">${p.data.name}</span>
                <span class="prop-build-status">${p.state.hasHotel ? '🏨 Hotel' : `🏠 ×${p.state.houses}`}</span>
              </div>
              <div class="build-actions">
                ${houseCheck.allowed
        ? `<button class="btn btn-sm btn-success build-btn" data-prop-id="${p.id}" data-type="house"
                      ${!canAffordHouse ? 'disabled' : ''}>
                      + House ($${houseCheck.cost})
                    </button>`
        : `<span class="build-reason">${houseCheck.reason}</span>`}
                ${hotelCheck.allowed
        ? `<button class="btn btn-sm btn-primary build-btn" data-prop-id="${p.id}" data-type="hotel"
                      ${!canAffordHotel ? 'disabled' : ''}>
                      + Hotel ($${hotelCheck.cost})
                    </button>`
        : ''}
              </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;

  const closeModal = showModal('🏗️ Build Houses / Hotels', content);

  document.querySelectorAll('.build-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const propId = btn.dataset.propId;
      const buildType = btn.dataset.type;
      closeModal();
      setTimeout(() => {
        dispatch({ type: buildType === 'hotel' ? 'BUILD_HOTEL' : 'BUILD_HOUSE', propertyId: propId });
        showToast(`Built a ${buildType}!`, 'success');
        const refreshedPlayer = state.players.find(p => p.id === player.id);
        showBuildModal(refreshedPlayer);
      }, 310);
    });
  });
}

// ═══════════════════════════════════════
// MODALS — SELL HOUSES
// ═══════════════════════════════════════

function showSellHouseModal(player) {
  const withBuildings = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && (p.state.houses > 0 || p.state.hasHotel));

  if (withBuildings.length === 0) { showToast('No buildings to sell!', 'warning'); return; }

  const content = `
    <div class="sell-modal">
      <p class="modal-instruction">Select a building to sell (half build cost refunded):</p>
      <div class="property-select-list">
        ${withBuildings.map(p => {
    const group = COLOR_GROUPS[p.data.colorGroup];
    const refund = Math.floor(group.buildCost / 2);
    return `
            <div class="build-property-row">
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}; width:14px; height:32px; border-radius:4px; margin-right:10px"></div>
              <div class="prop-select-info" style="flex:1">
                <span class="prop-select-name">${p.data.name}</span>
                <span class="prop-build-status">${p.state.hasHotel ? '🏨 Hotel' : `🏠 ×${p.state.houses}`}</span>
              </div>
              <div class="build-actions">
                ${p.state.hasHotel
        ? `<button class="btn btn-sm btn-warning sell-btn" data-prop-id="${p.id}" data-type="hotel">Sell Hotel (+$${refund})</button>`
        : p.state.houses > 0
          ? `<button class="btn btn-sm btn-warning sell-btn" data-prop-id="${p.id}" data-type="house">Sell House (+$${refund})</button>`
          : ''}
              </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;

  const closeModal = showModal('🔻 Sell Buildings', content);

  document.querySelectorAll('.sell-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dispatch({ type: btn.dataset.type === 'hotel' ? 'SELL_HOTEL' : 'SELL_HOUSE', propertyId: btn.dataset.propId });
      closeModal();
      setTimeout(() => {
        const refreshedPlayer = state.players.find(p => p.id === player.id);
        showSellHouseModal(refreshedPlayer);
      }, 310);
    });
  });
}

// ═══════════════════════════════════════
// MODALS — MORTGAGE / UNMORTGAGE
// ═══════════════════════════════════════

function showMortgageModal(player) {
  const mortgageable = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && !p.state.isMortgaged);

  if (mortgageable.length === 0) { showToast('No properties to mortgage!', 'warning'); return; }

  const content = `
    <div class="mortgage-modal">
      <p class="modal-instruction">Select a property to mortgage:</p>
      <div class="property-select-list">
        ${mortgageable.map(p => {
    const check = canMortgage(p.id, player.id, state.propertyStates);
    const group = COLOR_GROUPS[p.data.colorGroup];
    return `
            <button class="property-select-btn ${!check.allowed ? 'disabled' : ''}"
              data-prop-id="${p.id}" ${!check.allowed ? 'disabled' : ''}>
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <span class="prop-select-name">${p.data.name}</span>
              <span class="prop-select-price" style="color:var(--c-success)">+$${p.data.mortgageValue.toLocaleString()}</span>
              ${!check.allowed ? `<span class="prop-select-note">${check.reason}</span>` : ''}
            </button>
          `;
  }).join('')}
      </div>
    </div>
  `;

  const closeModal = showModal('🏦 Mortgage Property', content);

  document.querySelectorAll('.property-select-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      dispatch({ type: 'MORTGAGE_PROPERTY', propertyId: btn.dataset.propId });
      closeModal();
      showToast('Property mortgaged!', 'info');
    });
  });
}

function showUnmortgageModal(player) {
  const mortgaged = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && p.state.isMortgaged);

  if (mortgaged.length === 0) { showToast('No mortgaged properties!', 'info'); return; }

  const content = `
    <div class="unmortgage-modal">
      <p class="modal-instruction">Select a property to unmortgage (mortgage value + 10% interest):</p>
      <div class="property-select-list">
        ${mortgaged.map(p => {
    const cost = getUnmortgageCost(p.id);
    const canAfford = player.balance >= cost;
    const group = COLOR_GROUPS[p.data.colorGroup];
    return `
            <button class="property-select-btn ${!canAfford ? 'disabled' : ''}"
              data-prop-id="${p.id}" ${!canAfford ? 'disabled' : ''}>
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <span class="prop-select-name">${p.data.name}</span>
              <span class="prop-select-price" style="color:var(--c-primary)">-$${cost.toLocaleString()}</span>
              ${!canAfford ? '<span class="prop-select-note">Cannot afford</span>' : ''}
            </button>
          `;
  }).join('')}
      </div>
    </div>
  `;

  const closeModal = showModal('🔓 Unmortgage Property', content);

  document.querySelectorAll('.property-select-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      dispatch({ type: 'UNMORTGAGE_PROPERTY', propertyId: btn.dataset.propId });
      closeModal();
      showToast('Property unmortgaged!', 'success');
    });
  });
}

// ═══════════════════════════════════════
// MODALS — COLLECT SALARY
// ═══════════════════════════════════════

function showCollectSalaryModal(player) {
  if (state.turnState?.hasPassedGo) {
    showToast('Salary was already collected this turn.', 'error');
    return;
  }

  const content = `
    <div class="salary-modal">
      <p>Did <strong>${player.name}</strong> land exactly on Go?</p>
      <div class="salary-buttons">
        <button class="btn btn-success btn-lg" id="salary-passed">Passed Go ($200)</button>
        ${state.settings.rules.doubleSalaryOnGo
      ? `<button class="btn btn-primary btn-lg" id="salary-exact">Landed on Go ($400)</button>`
      : ''}
      </div>
    </div>
  `;

  const closeModal = showModal('💰 Collect Salary', content);

  document.getElementById('salary-passed').addEventListener('click', () => {
    dispatch({ type: 'COLLECT_SALARY', playerId: player.id, exactLanding: false });
    closeModal();
    showToast(`${player.name} collected $200!`, 'success');
  });

  const exactBtn = document.getElementById('salary-exact');
  if (exactBtn) {
    exactBtn.addEventListener('click', () => {
      dispatch({ type: 'COLLECT_SALARY', playerId: player.id, exactLanding: true });
      closeModal();
      showToast(`${player.name} collected $400 landing on Go!`, 'success');
    });
  }
}

// ═══════════════════════════════════════
// MODALS — INCOME TAX
// ═══════════════════════════════════════

function showIncomeTaxModal(player) {
  if (state.turnState?.hasPaidTax) {
    showToast('Tax was already paid this turn.', 'error');
    return;
  }

  const netWorth = calculateNetWorth(player, state.propertyStates);
  const tenPercent = Math.floor(netWorth * 0.1);

  const content = `
    <div class="tax-modal">
      <h3 style="margin-bottom:8px">Income Tax — Choose One</h3>
      <p style="font-size:13px;color:#888;margin-bottom:16px">
        Your net worth is $${netWorth.toLocaleString()}. Pick whichever costs less.
      </p>
      <div class="tax-options">
        <button class="btn btn-primary btn-lg tax-option" id="tax-flat">
          <span class="tax-amount">$200</span>
          <span class="tax-label">Flat Rate</span>
        </button>
        <button class="btn btn-secondary btn-lg tax-option" id="tax-percent">
          <span class="tax-amount">$${tenPercent.toLocaleString()}</span>
          <span class="tax-label">10% of Net Worth</span>
        </button>
      </div>
    </div>
  `;

  const closeModal = showModal('📊 Income Tax', content);

  document.getElementById('tax-flat').addEventListener('click', () => {
    dispatch({ type: 'PLAYER_TO_BANK', playerId: player.id, amount: 200, reason: 'Income Tax ($200 flat)' });
    closeModal();
  });
  document.getElementById('tax-percent').addEventListener('click', () => {
    dispatch({ type: 'PLAYER_TO_BANK', playerId: player.id, amount: tenPercent, reason: `Income Tax (10% of $${netWorth})` });
    closeModal();
  });
}

// ═══════════════════════════════════════
// MODALS — BANKRUPTCY (Quit Game)
// ═══════════════════════════════════════

function showBankruptcyModal(player) {
  const others = state.players.filter(p => p.id !== player.id && !p.isBankrupt);

  const content = `
    <div class="bankruptcy-modal">
      <div class="bankruptcy-warning">
        <span class="warning-icon">⚠️</span>
        <h3>Quit Game?</h3>
        <p>This is <strong>irreversible</strong>. ${player.name} will be eliminated.</p>
      </div>
      <p class="modal-instruction">Who is ${player.name} bankrupt to?</p>
      <div class="bankruptcy-options">
        <button class="btn btn-warning btn-lg" id="bankrupt-to-bank">🏦 Bankrupt to the Bank</button>
        ${others.map(p => `
          <button class="btn btn-secondary btn-lg bankrupt-to-player" data-creditor-id="${p.id}">
            ${TOKENS.find(t => t.id === p.token)?.emoji || ''} Bankrupt to ${p.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  const closeModal = showModal('🚪 Quit Game', content);

  document.getElementById('bankrupt-to-bank').addEventListener('click', () => {
    dispatch({ type: 'DECLARE_BANKRUPTCY', playerId: player.id, creditorId: null });
    closeModal();
  });
  document.querySelectorAll('.bankrupt-to-player').forEach(btn => {
    btn.addEventListener('click', () => {
      dispatch({ type: 'DECLARE_BANKRUPTCY', playerId: player.id, creditorId: btn.dataset.creditorId });
      closeModal();
    });
  });
}

// ═══════════════════════════════════════
// AUTO-BANKRUPTCY MODAL
// ═══════════════════════════════════════

function showAutoBankruptcyModal(player) {
  const others = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
  const liquidation = calculateLiquidationValue(player, state.propertyStates);

  const content = `
    <div class="bankruptcy-modal">
      <div class="bankruptcy-warning">
        <span class="warning-icon">💀</span>
        <h3>${player.name} is Bankrupt!</h3>
        <p>Balance: <strong style="color:var(--c-danger)">$${player.balance.toLocaleString()}</strong></p>
        <p>Even after selling everything, total value is <strong>$${liquidation.toLocaleString()}</strong> — cannot continue.</p>
      </div>
      <p class="modal-instruction">Transfer assets to creditor:</p>
      <div class="bankruptcy-options">
        <button class="btn btn-warning btn-lg" id="auto-bankrupt-bank">🏦 Assets go to Bank</button>
        ${others.map(p => `
          <button class="btn btn-secondary btn-lg auto-bankrupt-player" data-creditor-id="${p.id}">
            ${TOKENS.find(t => t.id === p.token)?.emoji || ''} Assets to ${p.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  const closeModal = showModal('💀 Bankruptcy', content, null, true);

  document.getElementById('auto-bankrupt-bank')?.addEventListener('click', () => {
    dispatch({ type: 'DECLARE_BANKRUPTCY', playerId: player.id, creditorId: null });
    closeModal();
  });
  document.querySelectorAll('.auto-bankrupt-player').forEach(btn => {
    btn.addEventListener('click', () => {
      dispatch({ type: 'DECLARE_BANKRUPTCY', playerId: player.id, creditorId: btn.dataset.creditorId });
      closeModal();
    });
  });
}

// ═══════════════════════════════════════
// MODALS — TRADE  (with net totals)
// ═══════════════════════════════════════

function showTradeModal(player) {
  const others = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
  if (others.length === 0) { showToast('No other players to trade with!', 'warning'); return; }

  const content = `
    <div class="trade-modal">
      <p class="modal-instruction">Step 1: Select a trade partner</p>
      <div class="trade-partner-list" style="display:flex;flex-direction:column;gap:10px">
        ${others.map(p => `
          <button class="property-select-btn trade-partner-btn" data-partner-id="${p.id}" style="padding:16px">
            <span style="font-size:28px;margin-right:12px">${TOKENS.find(t => t.id === p.token)?.emoji || ''}</span>
            <div style="flex:1;text-align:left">
              <div style="font-weight:700;font-size:16px">${p.name}</div>
              <div style="font-size:13px;color:#888">Balance: $${p.balance.toLocaleString()} · ${p.ownedPropertyIds.length} properties</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  showModal('🤝 Trade', content);

  document.querySelectorAll('.trade-partner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const partnerId = btn.dataset.partnerId;
      const partner = state.players.find(p => p.id === partnerId);
      closeModalThen(() => showTradeBuilder(player, partner));
    });
  });
}

function calcTradeNetValue(cashAmount, selectedPropIds) {
  let propValue = 0;
  selectedPropIds.forEach(id => {
    const propData = PROPERTIES.find(p => p.id === id);
    if (propData) propValue += propData.purchasePrice;
  });
  return cashAmount + propValue;
}

function showTradeBuilder(player1, player2) {
  const p1Props = player1.ownedPropertyIds.map(id => PROPERTIES.find(p => p.id === id)).filter(Boolean);
  const p2Props = player2.ownedPropertyIds.map(id => PROPERTIES.find(p => p.id === id)).filter(Boolean);
  const p1Goojf = player1.getOutOfJailFreeCards.chance + player1.getOutOfJailFreeCards.communityChest;
  const p2Goojf = player2.getOutOfJailFreeCards.chance + player2.getOutOfJailFreeCards.communityChest;

  const content = `
    <div class="trade-builder">
      <div class="trade-columns">
        <div class="trade-column">
          <h3 class="trade-col-title">${TOKENS.find(t => t.id === player1.token)?.emoji} ${player1.name} Offers</h3>
          <div class="trade-cash-input">
            <label>Cash to give:</label>
            <div class="cash-input-group">
              <span>$</span>
              <input type="number" id="trade-cash-1" value="0" min="0" max="${player1.balance}" style="border:none;background:transparent;flex:1;width:80px;color:var(--c-text)" />
            </div>
          </div>
          <div class="trade-props" id="trade-props-1">
            ${p1Props.map(p => `
              <label class="trade-prop-check">
                <input type="checkbox" value="${p.id}" class="trade-prop-1" data-price="${p.purchasePrice}" />
                <span class="prop-select-color" style="background:${COLOR_GROUPS[p.colorGroup]?.hex || '#999'};width:10px;height:10px;border-radius:50%;display:inline-block"></span>
                ${p.name}${state.propertyStates[p.id].isMortgaged ? ' (M)' : ''}
                <span class="trade-prop-price">$${p.purchasePrice.toLocaleString()}</span>
              </label>
            `).join('')}
            ${p1Props.length === 0 ? '<p class="trade-empty">No properties</p>' : ''}
          </div>
          ${p1Goojf > 0 ? `
            <label class="trade-prop-check">
              <input type="checkbox" id="trade-goojf-1" /> 🎫 GOOJF Card
            </label>
          ` : ''}
          <div class="trade-net-total" id="trade-net-1">
            <span class="trade-net-label">You give:</span>
            <span class="trade-net-value" id="trade-net-val-1">$0</span>
          </div>
        </div>

        <div class="trade-divider"><span class="trade-arrow">⟷</span></div>

        <div class="trade-column">
          <h3 class="trade-col-title">${TOKENS.find(t => t.id === player2.token)?.emoji} ${player2.name} Offers</h3>
          <div class="trade-cash-input">
            <label>Cash to give:</label>
            <div class="cash-input-group">
              <span>$</span>
              <input type="number" id="trade-cash-2" value="0" min="0" max="${player2.balance}" style="border:none;background:transparent;flex:1;width:80px;color:var(--c-text)" />
            </div>
          </div>
          <div class="trade-props" id="trade-props-2">
            ${p2Props.map(p => `
              <label class="trade-prop-check">
                <input type="checkbox" value="${p.id}" class="trade-prop-2" data-price="${p.purchasePrice}" />
                <span class="prop-select-color" style="background:${COLOR_GROUPS[p.colorGroup]?.hex || '#999'};width:10px;height:10px;border-radius:50%;display:inline-block"></span>
                ${p.name}${state.propertyStates[p.id].isMortgaged ? ' (M)' : ''}
                <span class="trade-prop-price">$${p.purchasePrice.toLocaleString()}</span>
              </label>
            `).join('')}
            ${p2Props.length === 0 ? '<p class="trade-empty">No properties</p>' : ''}
          </div>
          ${p2Goojf > 0 ? `
            <label class="trade-prop-check">
              <input type="checkbox" id="trade-goojf-2" /> 🎫 GOOJF Card
            </label>
          ` : ''}
          <div class="trade-net-total" id="trade-net-2">
            <span class="trade-net-label">You give:</span>
            <span class="trade-net-value" id="trade-net-val-2">$0</span>
          </div>
        </div>
      </div>

      <div class="trade-confirm-section">
        <button class="btn btn-success btn-lg" id="trade-execute">✓ Confirm Trade</button>
      </div>
    </div>
  `;

  const closeModal = showModal('🤝 Trade Builder', content);

  // Live net total update
  function updateTradeTotals() {
    const cash1 = parseInt(document.getElementById('trade-cash-1')?.value) || 0;
    const cash2 = parseInt(document.getElementById('trade-cash-2')?.value) || 0;
    const props1Val = [...document.querySelectorAll('.trade-prop-1:checked')].reduce((s, c) => s + parseInt(c.dataset.price || 0), 0);
    const props2Val = [...document.querySelectorAll('.trade-prop-2:checked')].reduce((s, c) => s + parseInt(c.dataset.price || 0), 0);
    const total1 = cash1 + props1Val;
    const total2 = cash2 + props2Val;
    const el1 = document.getElementById('trade-net-val-1');
    const el2 = document.getElementById('trade-net-val-2');
    if (el1) el1.textContent = `$${total1.toLocaleString()} (cash $${cash1.toLocaleString()} + props $${props1Val.toLocaleString()})`;
    if (el2) el2.textContent = `$${total2.toLocaleString()} (cash $${cash2.toLocaleString()} + props $${props2Val.toLocaleString()})`;
  }

  // Bind all inputs for live updates
  setTimeout(() => {
    document.getElementById('trade-cash-1')?.addEventListener('input', updateTradeTotals);
    document.getElementById('trade-cash-2')?.addEventListener('input', updateTradeTotals);
    document.querySelectorAll('.trade-prop-1, .trade-prop-2').forEach(cb => cb.addEventListener('change', updateTradeTotals));
  }, 50);

  document.getElementById('trade-execute').addEventListener('click', () => {
    const cash1 = parseInt(document.getElementById('trade-cash-1').value) || 0;
    const cash2 = parseInt(document.getElementById('trade-cash-2').value) || 0;
    const props1 = [...document.querySelectorAll('.trade-prop-1:checked')].map(c => c.value);
    const props2 = [...document.querySelectorAll('.trade-prop-2:checked')].map(c => c.value);
    const goojf1 = document.getElementById('trade-goojf-1')?.checked ? 1 : 0;
    const goojf2 = document.getElementById('trade-goojf-2')?.checked ? 1 : 0;

    if (!cash1 && !cash2 && !props1.length && !props2.length && !goojf1 && !goojf2) {
      showToast('Empty trade! Add something to trade.', 'warning');
      return;
    }
    if (cash1 > player1.balance) { showToast(`${player1.name} can't afford $${cash1}!`, 'error'); return; }
    if (cash2 > player2.balance) { showToast(`${player2.name} can't afford $${cash2}!`, 'error'); return; }

    dispatch({
      type: 'EXECUTE_TRADE',
      offer: { player1Id: player1.id, player2Id: player2.id, cash1, cash2, properties1: props1, properties2: props2, goojf1, goojf2 }
    });
    closeModal();
    showToast(`Trade completed between ${player1.name} and ${player2.name}!`, 'success');
  });
}

// ═══════════════════════════════════════
// PROPERTY DETAIL
// ═══════════════════════════════════════

function showPropertyDetail(propertyId) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  if (!propData) return;
  const propState = state.propertyStates[propertyId];
  const group = COLOR_GROUPS[propData.colorGroup];
  const owner = state.players.find(p => p.id === propState.ownerId);

  let rentTable = '';
  if (propData.type === 'property') {
    rentTable = `
      <div class="detail-rent-table">
        <h4>Rent Schedule</h4>
        <table class="rent-table">
          <tr><td>Base Rent</td>      <td>$${propData.rent.base}</td></tr>
          <tr><td>With Monopoly</td>  <td>$${propData.rent.base * 2}</td></tr>
          <tr><td>1 House</td>        <td>$${propData.rent.h1}</td></tr>
          <tr><td>2 Houses</td>       <td>$${propData.rent.h2}</td></tr>
          <tr><td>3 Houses</td>       <td>$${propData.rent.h3}</td></tr>
          <tr><td>4 Houses</td>       <td>$${propData.rent.h4}</td></tr>
          <tr><td>Hotel</td>          <td>$${propData.rent.hotel}</td></tr>
        </table>
        <p class="build-cost-info">Build Cost: $${group.buildCost} per house/hotel</p>
      </div>
    `;
  } else if (propData.type === 'railroad') {
    rentTable = `
      <div class="detail-rent-table">
        <h4>Railroad Rent</h4>
        <table class="rent-table">
          <tr><td>1 Railroad Owned</td><td>$25</td></tr>
          <tr><td>2 Railroads Owned</td><td>$50</td></tr>
          <tr><td>3 Railroads Owned</td><td>$100</td></tr>
          <tr><td>4 Railroads Owned</td><td>$200</td></tr>
        </table>
      </div>
    `;
  } else if (propData.type === 'utility') {
    rentTable = `
      <div class="detail-rent-table">
        <h4>Utility Rent</h4>
        <table class="rent-table">
          <tr><td>1 Utility Owned</td><td>4× Dice Roll</td></tr>
          <tr><td>Both Utilities</td><td>10× Dice Roll</td></tr>
        </table>
      </div>
    `;
  }

  const content = `
    <div class="property-detail">
      <div class="detail-header" style="background: ${group?.hex || '#999'}">
        <h3 class="detail-name" style="color: ${needsDarkText(group?.hex) ? '#1E2A38' : '#fff'}">${propData.name}</h3>
        <span class="detail-group" style="color: ${needsDarkText(group?.hex) ? '#1E2A38' : '#fff'}">${group?.name || ''}</span>
      </div>
      <div class="detail-body">
        <div class="detail-row"><span>Purchase Price</span>  <span>$${propData.purchasePrice.toLocaleString()}</span></div>
        <div class="detail-row"><span>Mortgage Value</span>  <span>$${propData.mortgageValue.toLocaleString()}</span></div>
        <div class="detail-row"><span>Unmortgage Cost</span> <span>$${getUnmortgageCost(propertyId).toLocaleString()}</span></div>
        <div class="detail-divider"></div>
        <div class="detail-row"><span>Owner</span>           <span>${owner ? `${TOKENS.find(t => t.id === owner.token)?.emoji || ''} ${owner.name}` : 'Unowned'}</span></div>
        ${propData.type === 'property' ? `
          <div class="detail-row"><span>Buildings</span>     <span>${propState.hasHotel ? '🏨 Hotel' : `🏠 ${propState.houses}`}</span></div>
        ` : ''}
        <div class="detail-row"><span>Status</span>          <span>${propState.isMortgaged ? '🔴 MORTGAGED' : '🟢 Active'}</span></div>
        ${rentTable}
      </div>
    </div>
  `;

  showModal(`📋 ${propData.name}`, content);
}

function needsDarkText(hex) {
  if (!hex) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

// ═══════════════════════════════════════
// AUCTION MODAL
// ═══════════════════════════════════════

function showAuctionModal(propertyId) {
  const propData = PROPERTIES.find(p => p.id === propertyId);
  const activePlayers = state.players.filter(p => !p.isBankrupt);
  let currentBid = 0;
  let currentBidder = null;
  let passedPlayers = new Set();

  function renderAuction() {
    const container = document.querySelector('.modal-body');
    if (!container) return;
    container.innerHTML = `
      <div class="auction-modal">
        <div class="auction-property">
          <div style="width:100%;height:8px;border-radius:4px;background:${COLOR_GROUPS[propData.colorGroup]?.hex || '#999'};margin-bottom:8px"></div>
          <h3>${propData.name}</h3>
          <p style="font-size:13px;color:#888">List Price: $${propData.purchasePrice.toLocaleString()}</p>
        </div>

        <div class="auction-current">
          <span class="auction-label">Current Bid</span>
          <span class="auction-amount">$${currentBid.toLocaleString()}</span>
          <span class="auction-bidder">${currentBidder ? `by ${currentBidder.name}` : 'No bids yet'}</span>
        </div>

        <div class="auction-players">
          ${activePlayers.map(p => {
      const hasPassed = passedPlayers.has(p.id);
      return `
              <div class="auction-player ${hasPassed ? 'auction-passed' : ''}">
                <span>${TOKENS.find(t => t.id === p.token)?.emoji || ''} ${p.name} ($${p.balance.toLocaleString()})</span>
                ${!hasPassed ? `
                  <div class="auction-actions">
                    <div class="auction-quick-btns">
                      <button class="auction-quick-btn" data-player-id="${p.id}" data-add="5">+$5</button>
                      <button class="auction-quick-btn" data-player-id="${p.id}" data-add="10">+$10</button>
                      <button class="auction-quick-btn" data-player-id="${p.id}" data-add="25">+$25</button>
                      <button class="auction-quick-btn" data-player-id="${p.id}" data-add="50">+$50</button>
                    </div>
                    <input type="number" class="auction-bid-input" data-player-id="${p.id}"
                      min="${currentBid + 1}" max="${p.balance}" value="${currentBid + 1}" />
                    <button class="btn btn-sm btn-success auction-bid-btn" data-player-id="${p.id}"
                      ${p.balance <= currentBid ? 'disabled' : ''}>Bid</button>
                    <button class="btn btn-sm btn-secondary auction-pass-btn" data-player-id="${p.id}">Pass</button>
                  </div>
                ` : '<span class="passed-label">Passed</span>'}
              </div>
            `;
    }).join('')}
        </div>

        ${passedPlayers.size >= activePlayers.length - (currentBidder ? 1 : 0) ? `
          <button class="btn btn-primary btn-lg" id="auction-finalize" style="width:100%;margin-top:14px">
            ${currentBidder ? `✓ ${currentBidder.name} Wins at $${currentBid}` : '✕ No Winner — Property Returns'}
          </button>
        ` : ''}
      </div>
    `;

    document.querySelectorAll('.auction-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.dataset.playerId;
        const input = document.querySelector(`.auction-bid-input[data-player-id="${playerId}"]`);
        const player = state.players.find(p => p.id === playerId);
        if (!input || !player) return;
        const add = parseInt(btn.dataset.add, 10);
        const currentValue = parseInt(input.value) || currentBid;
        input.value = Math.min(player.balance, currentValue + add);
      });
    });

    document.querySelectorAll('.auction-bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.dataset.playerId;
        const input = document.querySelector(`.auction-bid-input[data-player-id="${playerId}"]`);
        const bidAmount = parseInt(input.value) || currentBid + 1;
        const pl = state.players.find(p => p.id === playerId);
        if (bidAmount > pl.balance) { showToast('Cannot bid more than your balance!', 'error'); return; }
        if (bidAmount <= currentBid) { showToast('Bid must be higher than current bid!', 'error'); return; }
        currentBid = bidAmount;
        currentBidder = pl;
        renderAuction();
      });
    });

    document.querySelectorAll('.auction-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => { passedPlayers.add(btn.dataset.playerId); renderAuction(); });
    });

    const finalizeBtn = document.getElementById('auction-finalize');
    if (finalizeBtn) {
      finalizeBtn.addEventListener('click', () => {
        if (currentBidder) {
          dispatch({ type: 'AUCTION_BUY', playerId: currentBidder.id, propertyId, price: currentBid });
        }
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        if (overlay) overlay.classList.remove('modal-visible');
        setTimeout(() => { if (container) container.innerHTML = ''; }, 280);
      });
    }
  }

  showModal('🔨 Auction', '<div></div>');
  renderAuction();
}

// ═══════════════════════════════════════
// WIN SCREEN
// ═══════════════════════════════════════

function renderWinScreen() {
  const remaining = state.players.filter(p => !p.isBankrupt);
  const winner = remaining[0];
  if (!winner) { app.innerHTML = '<div class="splash-screen"><h1>Game Over</h1></div>'; return; }

  const token = TOKENS.find(t => t.id === winner.token);
  const winnerNW = calculateNetWorth(winner, state.propertyStates);
  const houseCount = winner.ownedPropertyIds.reduce((s, id) => s + (state.propertyStates[id]?.houses || 0), 0);
  const hotelCount = winner.ownedPropertyIds.filter(id => state.propertyStates[id]?.hasHotel).length;
  const rankings = state.players.filter(p => p.isBankrupt).sort((a, b) => (b.bankruptOrder || 0) - (a.bankruptOrder || 0));

  app.innerHTML = `
    <div class="win-screen">
      <div class="confetti-container" id="confetti-container"></div>
      <div class="win-content">
        <div class="win-crown">👑</div>
        <div class="win-token">${token?.emoji || '🎩'}</div>
        <h1 class="win-name">${winner.name}</h1>
        <h2 class="win-title">WINS!</h2>
        <div class="win-stats">
          <div class="win-stat">
            <span class="win-stat-value">$${winner.balance.toLocaleString()}</span>
            <span class="win-stat-label">Final Balance</span>
          </div>
          <div class="win-stat">
            <span class="win-stat-value">$${winnerNW.toLocaleString()}</span>
            <span class="win-stat-label">Net Worth</span>
          </div>
          <div class="win-stat">
            <span class="win-stat-value">${winner.ownedPropertyIds.length}</span>
            <span class="win-stat-label">Properties</span>
          </div>
          <div class="win-stat">
            <span class="win-stat-value">${houseCount} / ${hotelCount}</span>
            <span class="win-stat-label">Houses / Hotels</span>
          </div>
        </div>
        <div class="win-rankings">
          <h3 class="rankings-title">Player Rankings</h3>
          <div class="ranking-list">
            <div class="ranking-item ranking-1st">
              <span class="rank">🥇</span>
              <span class="rank-name">${token?.emoji} ${winner.name}</span>
              <span class="rank-status">Winner!</span>
            </div>
            ${rankings.map((p, i) => {
    const pToken = TOKENS.find(t => t.id === p.token);
    const medals = ['🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
    return `
                <div class="ranking-item">
                  <span class="rank">${medals[i] || (i + 2)}</span>
                  <span class="rank-name">${pToken?.emoji || ''} ${p.name}</span>
                  <span class="rank-status">Eliminated #${p.bankruptOrder || '?'}</span>
                </div>
              `;
  }).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-new-game-win" style="width:100%">
          🎲 New Game
        </button>
      </div>
    </div>
  `;

  createConfetti();

  document.getElementById('btn-new-game-win').addEventListener('click', () => {
    clearSave();
    cardHistory = {};
    state = createInitialState();
    dispatch({ type: 'SET_PHASE', phase: 'setup' });
  });
}

// ═══════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════

function createConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  const colors = ['#E53935', '#D4AF37', '#2E7D32', '#4A90E2', '#FF9800', '#9C27B0', '#00BCD4'];
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 4}s;
      animation-duration: ${Math.random() * 2 + 2.5}s;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 16 + 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(el);
  }
}

// ═══════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// ═══════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const saved = loadGame();
  if (saved && saved.phase) state = saved;
  render();
});

window.__dispatch = dispatch;
window.__state = () => state;
