// ═══════════════════════════════════════
// MONOPOLY BANKING COMPANION — Main Application
// ═══════════════════════════════════════

import { TOKENS, PLAYER_COLORS } from './data/tokens.js';
import { PROPERTIES, COLOR_GROUPS, RAILROAD_RENT } from './data/properties.js';
import { BOARD_SPACES } from './data/boardSpaces.js';
import { 
  createInitialState, gameReducer, saveGame, loadGame, clearSave,
  calculateRent, calculateNetWorth, canBuildHouse, canBuildHotel,
  canMortgage, getUnmortgageCost, findNearest, createPlayer
} from './engine/gameEngine.js';

// ── State Management ──
let state = createInitialState();
let previousBalances = {};

function dispatch(action) {
  const oldState = state;
  state = gameReducer(state, action);
  // Track balance changes for animation
  oldState.players.forEach(p => {
    previousBalances[p.id] = p.balance;
  });
  saveGame(state);
  render();
}

// ── Render Engine ──
const app = document.getElementById('app');

function render() {
  switch (state.phase) {
    case 'splash': renderSplash(); break;
    case 'setup': renderSetup(); break;
    case 'playing': renderDashboard(); break;
    case 'finished': renderWinScreen(); break;
  }
}

// ═══════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════

function renderSplash() {
  const saved = loadGame();
  const hasSave = saved && saved.phase === 'playing';
  
  app.innerHTML = `
    <div class="splash-screen">
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
            <span class="btn-icon">🎲</span> New Game
          </button>
          ${hasSave ? `
            <button id="btn-resume" class="btn btn-success btn-lg splash-btn">
              <span class="btn-icon">📂</span> Resume Game
            </button>
            <p class="splash-save-info">Saved ${new Date(saved.lastSaved).toLocaleString()}</p>
          ` : ''}
        </div>
        
        <div class="splash-footer">
          <div class="splash-divider"></div>
          <p class="splash-version">Companion App v1.0</p>
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
  
  document.getElementById('btn-new-game').addEventListener('click', () => {
    state = createInitialState();
    dispatch({ type: 'SET_PHASE', phase: 'setup' });
  });
  
  if (hasSave) {
    document.getElementById('btn-resume').addEventListener('click', () => {
      dispatch({ type: 'LOAD_STATE', savedState: saved });
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
        <h1 class="setup-title">GAME SETUP</h1>
        <p class="setup-desc">Configure your players and house rules</p>
      </div>
      
      <div class="setup-content">
        <!-- Players Section -->
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
                    placeholder="Player ${i+1} Name" data-player-id="${p.id}" />
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
            <button id="btn-add-player" class="btn btn-secondary btn-add-player">
              <span>+ Add Player</span>
            </button>
          ` : ''}
        </div>
        
        <!-- Starting Balance -->
        <div class="setup-section">
          <h2 class="section-title">💰 Starting Balance</h2>
          <div class="balance-input-group">
            <span class="currency-symbol">$</span>
            <input type="number" id="starting-balance" class="balance-input" 
              value="${state.settings.startingBalance}" min="100" step="100" />
            <button class="btn btn-sm btn-secondary" id="btn-reset-balance">Reset to $1,500</button>
          </div>
        </div>
        
        <!-- House Rules -->
        <div class="setup-section">
          <h2 class="section-title">📜 House Rules</h2>
          <div class="rules-grid">
            ${renderRuleToggle('auctionUnowned', 'Auction Unowned Properties', 'If a player declines to buy, the property goes to auction.', state.settings.rules.auctionUnowned)}
            ${renderRuleToggle('freeParkingJackpot', 'Free Parking Jackpot', 'Taxes and fines go into a pool collected by the next player landing on Free Parking.', state.settings.rules.freeParkingJackpot)}
            ${renderRuleToggle('noBuildOnMortgagedGroup', 'No Build on Mortgaged Group', 'Cannot build houses if any property in the color group is mortgaged.', state.settings.rules.noBuildOnMortgagedGroup)}
            ${renderRuleToggle('doubleSalaryOnGo', 'Double Salary on Go', 'Collect $400 instead of $200 when landing exactly on Go.', state.settings.rules.doubleSalaryOnGo)}
          </div>
        </div>
        
        <!-- Start Game -->
        <div class="setup-start-section">
          <button id="btn-start-game" class="btn btn-primary btn-lg btn-start-game" 
            ${players.length < 2 ? 'disabled' : ''}>
            <span class="btn-icon">🎲</span> Start Game
          </button>
          ${players.length < 2 ? '<p class="start-hint">Add at least 2 players to start</p>' : ''}
        </div>
      </div>
    </div>
  `;
  
  // ── Event listeners ──
  
  // Add player
  const addBtn = document.getElementById('btn-add-player');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const nextToken = availableTokens[0];
      if (nextToken) {
        dispatch({ type: 'ADD_PLAYER', name: '', tokenId: nextToken.id });
      }
    });
  }
  
  // Remove player
  document.querySelectorAll('.btn-remove-player').forEach(btn => {
    btn.addEventListener('click', (e) => {
      dispatch({ type: 'REMOVE_PLAYER', playerId: e.target.dataset.playerId });
    });
  });
  
  // Update player name
  document.querySelectorAll('.setup-player-name').forEach(input => {
    input.addEventListener('change', (e) => {
      dispatch({ type: 'UPDATE_PLAYER', playerId: e.target.dataset.playerId, field: 'name', value: e.target.value });
    });
  });
  
  // Update player token
  document.querySelectorAll('.setup-token-select').forEach(select => {
    select.addEventListener('change', (e) => {
      dispatch({ type: 'UPDATE_PLAYER', playerId: e.target.dataset.playerId, field: 'token', value: e.target.value });
    });
  });
  
  // Starting balance
  document.getElementById('starting-balance').addEventListener('change', (e) => {
    dispatch({ type: 'UPDATE_SETTINGS', field: 'startingBalance', value: parseInt(e.target.value) || 1500 });
  });
  
  document.getElementById('btn-reset-balance').addEventListener('click', () => {
    dispatch({ type: 'UPDATE_SETTINGS', field: 'startingBalance', value: 1500 });
  });
  
  // Rule toggles
  document.querySelectorAll('.rule-toggle-input').forEach(input => {
    input.addEventListener('change', (e) => {
      dispatch({ type: 'UPDATE_SETTINGS', field: e.target.dataset.rule, value: e.target.checked });
    });
  });
  
  // Start game
  const startBtn = document.getElementById('btn-start-game');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // Validate
      const invalidPlayers = state.players.filter(p => !p.name.trim());
      if (invalidPlayers.length > 0) {
        showToast('Please enter names for all players!', 'error');
        return;
      }
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
// GAME DASHBOARD
// ═══════════════════════════════════════

function renderDashboard() {
  const activePlayer = state.players[state.activePlayerIndex];
  const activePlayers = state.players.filter(p => !p.isBankrupt);
  
  app.innerHTML = `
    <div class="dashboard">
      <!-- Header -->
      <header class="dash-header">
        <div class="dash-header-left">
          <h1 class="dash-logo">MONOPOLY</h1>
          <span class="dash-logo-sub">Banking Companion</span>
        </div>
        <div class="dash-header-right">
          <div class="turn-badge">
            <span class="turn-label">Turn</span>
            <span class="turn-number">${state.turnNumber}</span>
          </div>
          ${state.settings.rules.freeParkingJackpot && state.freeParkingPool > 0 ? `
            <div class="free-parking-badge" title="Free Parking Jackpot">
              <span>🅿️ $${state.freeParkingPool.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="bank-info" title="Bank Supply">
            <span>🏠 ${state.bank.housesRemaining}</span>
            <span>🏨 ${state.bank.hotelsRemaining}</span>
          </div>
        </div>
      </header>
      
      <!-- Player Cards -->
      <section class="player-grid" id="player-grid">
        ${state.players.filter(p => !p.isBankrupt).map((p, i) => renderPlayerCard(p, p.id === activePlayer.id)).join('')}
        ${state.players.filter(p => p.isBankrupt).map(p => renderBankruptPlayerCard(p)).join('')}
      </section>
      
      <!-- Active Player Actions -->
      <section class="action-section">
        <div class="action-header">
          <span class="action-player-token">${TOKENS.find(t => t.id === activePlayer.token)?.emoji}</span>
          <h2 class="action-title">${activePlayer.name}'s Turn</h2>
          ${activePlayer.isInJail ? '<span class="jail-badge">🔒 IN JAIL</span>' : ''}
        </div>
        <div class="action-grid" id="action-grid">
          ${renderActionButtons(activePlayer)}
        </div>
      </section>
      
      <!-- Bottom Panels -->
      <div class="bottom-panels">
        <!-- Property Registry -->
        <section class="panel property-panel">
          <div class="panel-header">
            <h2 class="panel-title">📋 Property Registry</h2>
            <div class="panel-controls">
              <select id="property-filter" class="select-sm">
                <option value="all">All Properties</option>
                <option value="unowned">Unowned</option>
                <option value="owned">Owned</option>
                <option value="mortgaged">Mortgaged</option>
                ${Object.entries(COLOR_GROUPS).map(([key, g]) => `<option value="${key}">${g.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="property-list" id="property-list">
            ${renderPropertyRegistry('all')}
          </div>
        </section>
        
        <!-- Game Log -->
        <section class="panel log-panel">
          <div class="panel-header">
            <h2 class="panel-title">📜 Game Log</h2>
          </div>
          <div class="log-list" id="log-list">
            ${state.log.slice(0, 50).map(entry => `
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
    
    <!-- Modal Container -->
    <div id="modal-container"></div>
    
    <!-- Toast Container -->
    <div id="toast-container"></div>
  `;
  
  bindDashboardEvents();
}

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
        ${goojfCount > 0 ? `<span class="stat" title="Get Out of Jail Free">🎫 ${goojfCount}</span>` : ''}
      </div>
    </div>
  `;
}

function renderBankruptPlayerCard(player) {
  const token = TOKENS.find(t => t.id === player.token);
  return `
    <div class="player-card player-card-bankrupt" data-player-id="${player.id}">
      <div class="player-card-header">
        <div class="player-token-ring bankrupt-ring">
          <span class="player-token-emoji">${token?.emoji || '❓'}</span>
        </div>
        <span class="player-name bankrupt-name">${player.name}</span>
      </div>
      <div class="bankrupt-label">BANKRUPT</div>
    </div>
  `;
}

function renderActionButtons(player) {
  const hasGoojf = player.getOutOfJailFreeCards.chance + player.getOutOfJailFreeCards.communityChest > 0;
  
  if (player.isInJail) {
    return `
      <button class="action-btn action-jail" data-action="payJailFine" ${player.balance < 50 ? 'disabled' : ''}>
        <span class="action-icon">💸</span> Pay $50 Fine
      </button>
      <button class="action-btn action-jail" data-action="useGoojf" ${!hasGoojf ? 'disabled' : ''}>
        <span class="action-icon">🎫</span> Use GOOJF Card
      </button>
      <button class="action-btn action-trade" data-action="trade">
        <span class="action-icon">🤝</span> Trade
      </button>
      <button class="action-btn action-mortgage" data-action="mortgage">
        <span class="action-icon">🏦</span> Mortgage
      </button>
      <button class="action-btn action-unmortgage" data-action="unmortgage">
        <span class="action-icon">🔓</span> Unmortgage
      </button>
      <button class="action-btn action-build" data-action="sellHouse">
        <span class="action-icon">🔻</span> Sell Houses
      </button>
      <button class="action-btn action-end" data-action="endTurn">
        <span class="action-icon">⏭️</span> End Turn
      </button>
      <button class="action-btn action-bankrupt" data-action="bankruptcy">
        <span class="action-icon">💀</span> Declare Bankruptcy
      </button>
    `;
  }
  
  return `
    <button class="action-btn action-buy" data-action="buyProperty">
      <span class="action-icon">🏠</span> Buy Property
    </button>
    <button class="action-btn action-rent" data-action="payRent">
      <span class="action-icon">💸</span> Pay Rent
    </button>
    <button class="action-btn action-chance" data-action="drawChance">
      <span class="action-icon">❓</span> Draw Chance
    </button>
    <button class="action-btn action-cc" data-action="drawCC">
      <span class="action-icon">📦</span> Draw Community Chest
    </button>
    <button class="action-btn action-build" data-action="build">
      <span class="action-icon">🏗️</span> Build Houses/Hotel
    </button>
    <button class="action-btn action-mortgage" data-action="mortgage">
      <span class="action-icon">🏦</span> Mortgage Property
    </button>
    <button class="action-btn action-unmortgage" data-action="unmortgage">
      <span class="action-icon">🔓</span> Unmortgage
    </button>
    <button class="action-btn action-trade" data-action="trade">
      <span class="action-icon">🤝</span> Trade
    </button>
    <button class="action-btn action-jail" data-action="goToJail">
      <span class="action-icon">🔒</span> Go to Jail
    </button>
    <button class="action-btn action-salary" data-action="collectSalary">
      <span class="action-icon">💰</span> Collect $200 Salary
    </button>
    <button class="action-btn action-tax" data-action="incomeTax">
      <span class="action-icon">📊</span> Income Tax
    </button>
    <button class="action-btn action-tax" data-action="luxuryTax">
      <span class="action-icon">💎</span> Luxury Tax ($75)
    </button>
    ${state.settings.rules.freeParkingJackpot && state.freeParkingPool > 0 ? `
      <button class="action-btn action-salary" data-action="collectFreeParking">
        <span class="action-icon">🅿️</span> Collect Free Parking
      </button>
    ` : ''}
    <button class="action-btn action-end" data-action="endTurn">
      <span class="action-icon">⏭️</span> End Turn
    </button>
    <button class="action-btn action-bankrupt" data-action="bankruptcy">
      <span class="action-icon">💀</span> Declare Bankruptcy
    </button>
  `;
}

function renderPropertyRegistry(filter) {
  let props = PROPERTIES.map(p => ({
    ...p,
    state: state.propertyStates[p.id],
    owner: state.players.find(pl => pl.id === state.propertyStates[p.id]?.ownerId),
    group: COLOR_GROUPS[p.colorGroup],
  }));
  
  if (filter === 'unowned') props = props.filter(p => !p.state.ownerId);
  else if (filter === 'owned') props = props.filter(p => p.state.ownerId);
  else if (filter === 'mortgaged') props = props.filter(p => p.state.isMortgaged);
  else if (filter !== 'all') props = props.filter(p => p.colorGroup === filter);
  
  return props.map(p => {
    const colorHex = p.group?.hex || '#999';
    const ownerName = p.owner ? p.owner.name : 'Unowned';
    const houses = p.state.houses;
    const hasHotel = p.state.hasHotel;
    const isMortgaged = p.state.isMortgaged;
    
    let statusBadges = '';
    if (hasHotel) statusBadges = '<span class="prop-badge hotel-badge">🏨 Hotel</span>';
    else if (houses > 0) statusBadges = `<span class="prop-badge house-badge">🏠 ×${houses}</span>`;
    if (isMortgaged) statusBadges += '<span class="prop-badge mortgage-badge">MORTGAGED</span>';
    
    return `
      <div class="property-row" data-property-id="${p.id}">
        <div class="prop-color-strip" style="background: ${colorHex}"></div>
        <div class="prop-info">
          <span class="prop-name">${p.name}</span>
          <span class="prop-owner">${ownerName}${p.owner ? ` ${TOKENS.find(t => t.id === p.owner.token)?.emoji || ''}` : ''}</span>
        </div>
        <div class="prop-status">
          ${statusBadges}
        </div>
        <div class="prop-price">$${p.purchasePrice?.toLocaleString() || '—'}</div>
      </div>
    `;
  }).join('');
}

function bindDashboardEvents() {
  const activePlayer = state.players[state.activePlayerIndex];
  
  // Action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleAction(action, activePlayer);
    });
  });
  
  // Property filter
  const filter = document.getElementById('property-filter');
  if (filter) {
    filter.addEventListener('change', (e) => {
      document.getElementById('property-list').innerHTML = renderPropertyRegistry(e.target.value);
      bindPropertyClicks();
    });
  }
  
  bindPropertyClicks();
}

function bindPropertyClicks() {
  document.querySelectorAll('.property-row').forEach(row => {
    row.addEventListener('click', () => {
      showPropertyDetail(row.dataset.propertyId);
    });
  });
}

// ═══════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════

function handleAction(action, player) {
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
    case 'luxuryTax': dispatch({ type: 'PLAYER_TO_BANK', playerId: player.id, amount: 75, reason: 'Luxury Tax' }); break;
    case 'endTurn': dispatch({ type: 'END_TURN' }); break;
    case 'bankruptcy': showBankruptcyModal(player); break;
    case 'sellHouse': showSellHouseModal(player); break;
  }
}

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════

function showModal(title, content, onClose) {
  const container = document.getElementById('modal-container') || document.body;
  container.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" id="modal">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    </div>
  `;
  
  // Animate in
  requestAnimationFrame(() => {
    document.getElementById('modal-overlay')?.classList.add('modal-visible');
  });
  
  const closeModal = () => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('modal-visible');
      setTimeout(() => { container.innerHTML = ''; if (onClose) onClose(); }, 300);
    }
  };
  
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  
  return closeModal;
}

function showBuyPropertyModal(player) {
  const unownedProps = PROPERTIES.filter(p => !state.propertyStates[p.id].ownerId);
  
  if (unownedProps.length === 0) {
    showToast('All properties are owned!', 'warning');
    return;
  }
  
  const content = `
    <div class="buy-property-modal">
      <p class="modal-instruction">Select a property to purchase:</p>
      <div class="property-select-list">
        ${unownedProps.map(p => {
          const group = COLOR_GROUPS[p.colorGroup];
          const canAfford = player.balance >= p.purchasePrice;
          return `
            <button class="property-select-btn ${!canAfford ? 'disabled' : ''}" 
              data-prop-id="${p.id}" ${!canAfford ? 'disabled' : ''}>
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <span class="prop-select-name">${p.name}</span>
              <span class="prop-select-price">$${p.purchasePrice.toLocaleString()}</span>
              ${!canAfford ? '<span class="prop-select-note">Cannot afford</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div class="modal-player-balance">
        Your balance: <strong>$${player.balance.toLocaleString()}</strong>
      </div>
    </div>
  `;
  
  const closeModal = showModal('🏠 Buy Property', content);
  
  document.querySelectorAll('.property-select-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const propId = btn.dataset.propId;
      const propData = PROPERTIES.find(p => p.id === propId);
      
      if (confirm(`Buy ${propData.name} for $${propData.purchasePrice.toLocaleString()}?`)) {
        dispatch({ type: 'BUY_PROPERTY', playerId: player.id, propertyId: propId });
        closeModal();
        showToast(`${player.name} bought ${propData.name}!`, 'success');
      }
    });
  });
}

function showPayRentModal(player) {
  // Show owned properties that have rent due
  const ownedByOthers = PROPERTIES.filter(p => {
    const ps = state.propertyStates[p.id];
    return ps.ownerId && ps.ownerId !== player.id && !ps.isMortgaged;
  });
  
  if (ownedByOthers.length === 0) {
    showToast('No properties with rent to pay!', 'info');
    return;
  }
  
  const content = `
    <div class="pay-rent-modal">
      <p class="modal-instruction">Select which property you landed on:</p>
      
      ${ownedByOthers.some(p => p.type === 'utility') ? `
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
              <span class="prop-select-price rent-amount">Rent: $${rent.toLocaleString()}${p.type === 'utility' ? '*' : ''}</span>
            </button>
          `;
        }).join('')}
      </div>
      ${ownedByOthers.some(p => p.type === 'utility') ? '<p class="modal-note">* Utility rent depends on dice roll</p>' : ''}
    </div>
  `;
  
  const closeModal = showModal('💸 Pay Rent', content);
  
  document.querySelectorAll('.property-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const propId = btn.dataset.propId;
      const propData = PROPERTIES.find(p => p.id === propId);
      const owner = state.players.find(pl => pl.id === state.propertyStates[propId].ownerId);
      
      let diceTotal = 7;
      const diceInput = document.getElementById('dice-total-input');
      if (diceInput) diceTotal = parseInt(diceInput.value) || 7;
      
      const rent = calculateRent(propId, state.propertyStates, diceTotal, null);
      
      if (confirm(`Pay $${rent.toLocaleString()} rent to ${owner.name} for ${propData.name}?`)) {
        dispatch({ type: 'PLAYER_TO_PLAYER', fromId: player.id, toId: owner.id, amount: rent, reason: `Rent on ${propData.name}` });
        closeModal();
      }
    });
  });
}

function drawCard(deck, player) {
  dispatch({ type: 'DRAW_CARD', deck });
  
  const card = state._drawnCard;
  if (!card) return;
  
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
            <span class="card-id">${card.id}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const closeModal = showModal(`${bgEmoji} ${deckLabel}`, content, () => {
    // Apply effect after acknowledging
  });
  
  // Add apply button
  const modalBody = document.querySelector('.modal-body');
  if (modalBody) {
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary btn-lg card-apply-btn';
    applyBtn.innerHTML = '✓ Apply Effect';
    applyBtn.addEventListener('click', () => {
      // Handle special cases that need input
      if (card.effectType === 'advanceToNearest' && card.effectPayload.targetType === 'utility') {
        closeModal();
        handleNearestUtilityCard(card, player);
        return;
      }
      
      dispatch({ type: 'APPLY_CARD_EFFECT', card });
      closeModal();
      showToast('Card effect applied!', 'success');
    });
    modalBody.appendChild(applyBtn);
  }
}

function handleNearestUtilityCard(card, player) {
  const content = `
    <div class="utility-dice-modal">
      <p>You advanced to the nearest Utility.</p>
      <p>If owned, enter your dice roll to calculate rent (10× dice total):</p>
      <input type="number" id="utility-dice" class="dice-input" min="2" max="12" value="7" />
      <button class="btn btn-primary" id="utility-roll-btn">Calculate & Pay</button>
    </div>
  `;
  
  const closeModal = showModal('🎲 Utility Card', content);
  
  document.getElementById('utility-roll-btn').addEventListener('click', () => {
    const dice = parseInt(document.getElementById('utility-dice').value) || 7;
    const nearest = findNearest(player.boardPosition, 'utility');
    const propId = PROPERTIES.find(p => p.boardPosition === nearest)?.id;
    
    // Move player
    dispatch({ type: 'APPLY_CARD_EFFECT', card });
    
    if (propId && state.propertyStates[propId]?.ownerId && state.propertyStates[propId].ownerId !== player.id) {
      const rent = dice * 10;
      const owner = state.players.find(p => p.id === state.propertyStates[propId].ownerId);
      dispatch({ type: 'PLAYER_TO_PLAYER', fromId: player.id, toId: owner.id, amount: rent, reason: `Utility (Chance card) 10×${dice}` });
    }
    
    closeModal();
  });
}

function showBuildModal(player) {
  const buildable = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && p.data.type === 'property');
  
  if (buildable.length === 0) {
    showToast('You don\'t own any buildable properties!', 'warning');
    return;
  }
  
  const content = `
    <div class="build-modal">
      <p class="modal-instruction">Select a property to build on:</p>
      <div class="bank-supply-info">
        <span>🏠 Houses available: ${state.bank.housesRemaining}</span>
        <span>🏨 Hotels available: ${state.bank.hotelsRemaining}</span>
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
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <div class="prop-select-info">
                <span class="prop-select-name">${p.data.name}</span>
                <span class="prop-build-status">${p.state.hasHotel ? '🏨 Hotel' : `🏠 ×${p.state.houses}`}</span>
              </div>
              <div class="build-actions">
                ${houseCheck.allowed ? `
                  <button class="btn btn-sm btn-success build-btn" data-prop-id="${p.id}" data-type="house"
                    ${!canAffordHouse ? 'disabled' : ''}>
                    + House ($${houseCheck.cost})
                  </button>
                ` : `<span class="build-reason">${houseCheck.reason}</span>`}
                ${hotelCheck.allowed ? `
                  <button class="btn btn-sm btn-primary build-btn" data-prop-id="${p.id}" data-type="hotel"
                    ${!canAffordHotel ? 'disabled' : ''}>
                    + Hotel ($${hotelCheck.cost})
                  </button>
                ` : ''}
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
      dispatch({ type: buildType === 'hotel' ? 'BUILD_HOTEL' : 'BUILD_HOUSE', propertyId: propId });
      closeModal();
      showToast(`Built a ${buildType}!`, 'success');
      // Re-open to allow more building
      setTimeout(() => showBuildModal(state.players.find(p => p.id === player.id)), 100);
    });
  });
}

function showSellHouseModal(player) {
  const withBuildings = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && (p.state.houses > 0 || p.state.hasHotel));
  
  if (withBuildings.length === 0) {
    showToast('No buildings to sell!', 'warning');
    return;
  }
  
  const content = `
    <div class="sell-modal">
      <p class="modal-instruction">Select a building to sell (half build cost refunded):</p>
      <div class="property-select-list">
        ${withBuildings.map(p => {
          const group = COLOR_GROUPS[p.data.colorGroup];
          const refund = Math.floor(group.buildCost / 2);
          return `
            <div class="build-property-row">
              <div class="prop-select-color" style="background: ${group?.hex || '#999'}"></div>
              <div class="prop-select-info">
                <span class="prop-select-name">${p.data.name}</span>
                <span class="prop-build-status">${p.state.hasHotel ? '🏨 Hotel' : `🏠 ×${p.state.houses}`}</span>
              </div>
              <div class="build-actions">
                ${p.state.hasHotel ? `
                  <button class="btn btn-sm btn-warning sell-btn" data-prop-id="${p.id}" data-type="hotel">
                    Sell Hotel (+$${refund})
                  </button>
                ` : p.state.houses > 0 ? `
                  <button class="btn btn-sm btn-warning sell-btn" data-prop-id="${p.id}" data-type="house">
                    Sell House (+$${refund})
                  </button>
                ` : ''}
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
      setTimeout(() => showSellHouseModal(state.players.find(p => p.id === player.id)), 100);
    });
  });
}

function showMortgageModal(player) {
  const mortgageable = player.ownedPropertyIds
    .map(id => ({ data: PROPERTIES.find(p => p.id === id), state: state.propertyStates[id], id }))
    .filter(p => p.data && !p.state.isMortgaged);
  
  if (mortgageable.length === 0) {
    showToast('No properties to mortgage!', 'warning');
    return;
  }
  
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
              <span class="prop-select-price">+$${p.data.mortgageValue.toLocaleString()}</span>
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
  
  if (mortgaged.length === 0) {
    showToast('No mortgaged properties!', 'info');
    return;
  }
  
  const content = `
    <div class="unmortgage-modal">
      <p class="modal-instruction">Select a property to unmortgage (mortgage + 10% interest):</p>
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
              <span class="prop-select-price">-$${cost.toLocaleString()}</span>
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

function showCollectSalaryModal(player) {
  const content = `
    <div class="salary-modal">
      <p>Did ${player.name} land exactly on Go?</p>
      <div class="salary-buttons">
        <button class="btn btn-success" id="salary-passed">Passed Go ($200)</button>
        ${state.settings.rules.doubleSalaryOnGo ? `
          <button class="btn btn-primary" id="salary-exact">Landed on Go ($400)</button>
        ` : ''}
      </div>
    </div>
  `;
  
  const closeModal = showModal('💰 Collect Salary', content);
  
  document.getElementById('salary-passed').addEventListener('click', () => {
    dispatch({ type: 'COLLECT_SALARY', playerId: player.id, exactLanding: false });
    closeModal();
  });
  
  const exactBtn = document.getElementById('salary-exact');
  if (exactBtn) {
    exactBtn.addEventListener('click', () => {
      dispatch({ type: 'COLLECT_SALARY', playerId: player.id, exactLanding: true });
      closeModal();
    });
  }
}

function showIncomeTaxModal(player) {
  const netWorth = calculateNetWorth(player, state.propertyStates);
  const tenPercent = Math.floor(netWorth * 0.1);
  
  const content = `
    <div class="tax-modal">
      <h3>Income Tax</h3>
      <p>Choose one:</p>
      <div class="tax-options">
        <button class="btn btn-primary btn-lg tax-option" id="tax-flat">
          <span class="tax-amount">Pay $200</span>
          <span class="tax-label">Flat Rate</span>
        </button>
        <button class="btn btn-secondary btn-lg tax-option" id="tax-percent">
          <span class="tax-amount">Pay $${tenPercent.toLocaleString()}</span>
          <span class="tax-label">10% of Net Worth ($${netWorth.toLocaleString()})</span>
        </button>
      </div>
    </div>
  `;
  
  const closeModal = showModal('📊 Income Tax', content);
  
  document.getElementById('tax-flat').addEventListener('click', () => {
    dispatch({ type: 'PLAYER_TO_BANK', playerId: player.id, amount: 200, reason: 'Income Tax (flat $200)' });
    closeModal();
  });
  
  document.getElementById('tax-percent').addEventListener('click', () => {
    dispatch({ type: 'PLAYER_TO_BANK', playerId: player.id, amount: tenPercent, reason: `Income Tax (10% of $${netWorth})` });
    closeModal();
  });
}

function showBankruptcyModal(player) {
  const otherPlayers = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
  
  const content = `
    <div class="bankruptcy-modal">
      <div class="bankruptcy-warning">
        <span class="warning-icon">⚠️</span>
        <h3>Are you sure?</h3>
        <p>This action is <strong>irreversible</strong>. ${player.name} will be eliminated from the game.</p>
      </div>
      <p class="modal-instruction">Who is ${player.name} bankrupt to?</p>
      <div class="bankruptcy-options">
        <button class="btn btn-warning btn-lg" id="bankrupt-to-bank">
          🏦 Bankrupt to the Bank
        </button>
        ${otherPlayers.map(p => `
          <button class="btn btn-secondary btn-lg bankrupt-to-player" data-creditor-id="${p.id}">
            ${TOKENS.find(t => t.id === p.token)?.emoji} Bankrupt to ${p.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  const closeModal = showModal('💀 Declare Bankruptcy', content);
  
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

function showTradeModal(player) {
  const otherPlayers = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
  
  if (otherPlayers.length === 0) {
    showToast('No other players to trade with!', 'warning');
    return;
  }
  
  // Step 1: Select trade partner
  const content = `
    <div class="trade-modal">
      <p class="modal-instruction">Step 1: Select a trade partner</p>
      <div class="trade-partner-list">
        ${otherPlayers.map(p => `
          <button class="trade-partner-btn" data-partner-id="${p.id}">
            <span class="partner-token">${TOKENS.find(t => t.id === p.token)?.emoji}</span>
            <span class="partner-name">${p.name}</span>
            <span class="partner-balance">$${p.balance.toLocaleString()}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  const closeModal = showModal('🤝 Trade', content);
  
  document.querySelectorAll('.trade-partner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
      const partnerId = btn.dataset.partnerId;
      const partner = state.players.find(p => p.id === partnerId);
      showTradeBuilder(player, partner);
    });
  });
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
            <label>Cash:</label>
            <div class="cash-input-group">
              <span>$</span>
              <input type="number" id="trade-cash-1" value="0" min="0" max="${player1.balance}" />
            </div>
          </div>
          <div class="trade-props" id="trade-props-1">
            ${p1Props.map(p => `
              <label class="trade-prop-check">
                <input type="checkbox" value="${p.id}" class="trade-prop-1" />
                <span class="prop-select-color" style="background: ${COLOR_GROUPS[p.colorGroup]?.hex || '#999'}; width: 12px; height: 12px; display: inline-block; border-radius: 2px; margin-right: 4px;"></span>
                ${p.name} ${state.propertyStates[p.id].isMortgaged ? '(M)' : ''}
              </label>
            `).join('')}
            ${p1Props.length === 0 ? '<p class="trade-empty">No properties</p>' : ''}
          </div>
          ${p1Goojf > 0 ? `
            <label class="trade-prop-check">
              <input type="checkbox" id="trade-goojf-1" />
              🎫 Get Out of Jail Free Card
            </label>
          ` : ''}
        </div>
        
        <div class="trade-divider">
          <span class="trade-arrow">⟷</span>
        </div>
        
        <div class="trade-column">
          <h3 class="trade-col-title">${TOKENS.find(t => t.id === player2.token)?.emoji} ${player2.name} Offers</h3>
          <div class="trade-cash-input">
            <label>Cash:</label>
            <div class="cash-input-group">
              <span>$</span>
              <input type="number" id="trade-cash-2" value="0" min="0" max="${player2.balance}" />
            </div>
          </div>
          <div class="trade-props" id="trade-props-2">
            ${p2Props.map(p => `
              <label class="trade-prop-check">
                <input type="checkbox" value="${p.id}" class="trade-prop-2" />
                <span class="prop-select-color" style="background: ${COLOR_GROUPS[p.colorGroup]?.hex || '#999'}; width: 12px; height: 12px; display: inline-block; border-radius: 2px; margin-right: 4px;"></span>
                ${p.name} ${state.propertyStates[p.id].isMortgaged ? '(M)' : ''}
              </label>
            `).join('')}
            ${p2Props.length === 0 ? '<p class="trade-empty">No properties</p>' : ''}
          </div>
          ${p2Goojf > 0 ? `
            <label class="trade-prop-check">
              <input type="checkbox" id="trade-goojf-2" />
              🎫 Get Out of Jail Free Card
            </label>
          ` : ''}
        </div>
      </div>
      
      <div class="trade-confirm-section">
        <button class="btn btn-success btn-lg" id="trade-execute">✓ Confirm Trade</button>
      </div>
    </div>
  `;
  
  const closeModal = showModal('🤝 Trade Builder', content);
  
  document.getElementById('trade-execute').addEventListener('click', () => {
    const cash1 = parseInt(document.getElementById('trade-cash-1').value) || 0;
    const cash2 = parseInt(document.getElementById('trade-cash-2').value) || 0;
    const props1 = [...document.querySelectorAll('.trade-prop-1:checked')].map(c => c.value);
    const props2 = [...document.querySelectorAll('.trade-prop-2:checked')].map(c => c.value);
    const goojf1 = document.getElementById('trade-goojf-1')?.checked ? 1 : 0;
    const goojf2 = document.getElementById('trade-goojf-2')?.checked ? 1 : 0;
    
    if (cash1 === 0 && cash2 === 0 && props1.length === 0 && props2.length === 0 && goojf1 === 0 && goojf2 === 0) {
      showToast('Empty trade! Add something to trade.', 'warning');
      return;
    }
    
    if (cash1 > player1.balance) {
      showToast(`${player1.name} can't afford $${cash1}!`, 'error');
      return;
    }
    if (cash2 > player2.balance) {
      showToast(`${player2.name} can't afford $${cash2}!`, 'error');
      return;
    }
    
    if (confirm(`Confirm trade between ${player1.name} and ${player2.name}?\n\nBoth players should review and agree.`)) {
      dispatch({
        type: 'EXECUTE_TRADE',
        offer: {
          player1Id: player1.id,
          player2Id: player2.id,
          cash1, cash2,
          properties1: props1,
          properties2: props2,
          goojf1, goojf2,
        }
      });
      closeModal();
      showToast('Trade completed!', 'success');
    }
  });
}

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
          <tr><td>Base Rent</td><td>$${propData.rent.base}</td></tr>
          <tr><td>With Monopoly</td><td>$${propData.rent.base * 2}</td></tr>
          <tr><td>1 House</td><td>$${propData.rent.h1}</td></tr>
          <tr><td>2 Houses</td><td>$${propData.rent.h2}</td></tr>
          <tr><td>3 Houses</td><td>$${propData.rent.h3}</td></tr>
          <tr><td>4 Houses</td><td>$${propData.rent.h4}</td></tr>
          <tr><td>Hotel</td><td>$${propData.rent.hotel}</td></tr>
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
          <tr><td>2 Utilities Owned</td><td>10× Dice Roll</td></tr>
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
        <div class="detail-row">
          <span>Purchase Price</span><span>$${propData.purchasePrice.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span>Mortgage Value</span><span>$${propData.mortgageValue.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span>Unmortgage Cost</span><span>$${getUnmortgageCost(propertyId).toLocaleString()}</span>
        </div>
        <div class="detail-divider"></div>
        <div class="detail-row">
          <span>Owner</span><span>${owner ? `${TOKENS.find(t => t.id === owner.token)?.emoji} ${owner.name}` : 'Unowned'}</span>
        </div>
        ${propData.type === 'property' ? `
          <div class="detail-row">
            <span>Buildings</span><span>${propState.hasHotel ? '🏨 Hotel' : `🏠 ${propState.houses} house(s)`}</span>
          </div>
        ` : ''}
        <div class="detail-row">
          <span>Status</span><span>${propState.isMortgaged ? '🔴 MORTGAGED' : '🟢 Active'}</span>
        </div>
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
    const content = `
      <div class="auction-modal">
        <div class="auction-property">
          <div class="prop-select-color" style="background: ${COLOR_GROUPS[propData.colorGroup]?.hex || '#999'}; width: 100%; height: 8px; border-radius: 4px;"></div>
          <h3>${propData.name}</h3>
          <p>Listed Price: $${propData.purchasePrice.toLocaleString()}</p>
        </div>
        
        <div class="auction-current">
          <span class="auction-label">Current Bid</span>
          <span class="auction-amount">$${currentBid.toLocaleString()}</span>
          ${currentBidder ? `<span class="auction-bidder">by ${currentBidder.name}</span>` : '<span class="auction-bidder">No bids yet</span>'}
        </div>
        
        <div class="auction-players">
          ${activePlayers.map(p => {
            const hasPassed = passedPlayers.has(p.id);
            return `
              <div class="auction-player ${hasPassed ? 'auction-passed' : ''}">
                <span>${TOKENS.find(t => t.id === p.token)?.emoji} ${p.name} ($${p.balance.toLocaleString()})</span>
                ${!hasPassed ? `
                  <div class="auction-actions">
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
          <button class="btn btn-primary btn-lg" id="auction-finalize">
            ${currentBidder ? `✓ ${currentBidder.name} Wins at $${currentBid}` : '✕ No Winner'}
          </button>
        ` : ''}
      </div>
    `;
    
    const container = document.querySelector('.modal-body');
    if (container) container.innerHTML = content;
    
    // Bind auction events
    document.querySelectorAll('.auction-bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.dataset.playerId;
        const input = document.querySelector(`.auction-bid-input[data-player-id="${playerId}"]`);
        const bidAmount = parseInt(input.value) || currentBid + 1;
        const player = state.players.find(p => p.id === playerId);
        
        if (bidAmount > player.balance) {
          showToast('Cannot bid more than your balance!', 'error');
          return;
        }
        if (bidAmount <= currentBid) {
          showToast('Bid must be higher than current bid!', 'error');
          return;
        }
        
        currentBid = bidAmount;
        currentBidder = player;
        renderAuction();
      });
    });
    
    document.querySelectorAll('.auction-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        passedPlayers.add(btn.dataset.playerId);
        renderAuction();
      });
    });
    
    const finalizeBtn = document.getElementById('auction-finalize');
    if (finalizeBtn) {
      finalizeBtn.addEventListener('click', () => {
        if (currentBidder) {
          dispatch({ type: 'AUCTION_BUY', playerId: currentBidder.id, propertyId, price: currentBid });
        }
        // Close modal
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
          overlay.classList.remove('modal-visible');
          setTimeout(() => { document.getElementById('modal-container').innerHTML = ''; }, 300);
        }
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
  const activePlayers = state.players.filter(p => !p.isBankrupt);
  const winner = activePlayers[0];
  
  if (!winner) {
    app.innerHTML = '<div class="splash-screen"><h1>Game Over</h1></div>';
    return;
  }
  
  const token = TOKENS.find(t => t.id === winner.token);
  const winnerNetWorth = calculateNetWorth(winner, state.propertyStates);
  const propertyCount = winner.ownedPropertyIds.length;
  const houseCount = winner.ownedPropertyIds.reduce((sum, id) => sum + (state.propertyStates[id]?.houses || 0), 0);
  const hotelCount = winner.ownedPropertyIds.filter(id => state.propertyStates[id]?.hasHotel).length;
  
  // Sort bankrupt players by bankruptOrder (descending — last to go bankrupt = 2nd place)
  const rankings = state.players
    .filter(p => p.isBankrupt)
    .sort((a, b) => (b.bankruptOrder || 0) - (a.bankruptOrder || 0));
  
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
            <span class="win-stat-value">$${winnerNetWorth.toLocaleString()}</span>
            <span class="win-stat-label">Net Worth</span>
          </div>
          <div class="win-stat">
            <span class="win-stat-value">${propertyCount}</span>
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
                  <span class="rank">${medals[i] || (i+2)}</span>
                  <span class="rank-name">${pToken?.emoji} ${p.name}</span>
                  <span class="rank-status">Eliminated Turn ${p.bankruptOrder || '?'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <button class="btn btn-primary btn-lg btn-new-game" id="btn-new-game-win">
          <span class="btn-icon">🎲</span> New Game
        </button>
      </div>
    </div>
  `;
  
  // Confetti animation
  createConfetti();
  
  document.getElementById('btn-new-game-win').addEventListener('click', () => {
    clearSave();
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
  
  const colors = ['#E53935', '#D4AF37', '#2E7D32', '#4A90E2', '#FF9800', '#9C27B0'];
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 3 + 's';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    container.appendChild(confetti);
  }
}

// ═══════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Check for saved game
  const saved = loadGame();
  if (saved && saved.phase) {
    state = saved;
  }
  render();
});

// Make dispatch available globally for debugging
window.__dispatch = dispatch;
window.__state = () => state;
