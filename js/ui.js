// ui.js - DOM manipulation and rendering for Pazaak

import { CardType } from './deck.js';

export class PazaakUI {
    constructor() {
        // Screen elements
        this.screens = {
            menu: document.getElementById('menu-screen'),
            deckBuilder: document.getElementById('deck-builder-screen'),
            howToPlay: document.getElementById('how-to-play-screen'),
            game: document.getElementById('game-screen')
        };

        // Game elements
        this.elements = {
            // Scores
            playerScore: document.getElementById('player-score'),
            opponentScore: document.getElementById('opponent-score'),

            // Cards
            playerCards: document.getElementById('player-cards'),
            opponentCards: document.getElementById('opponent-cards'),
            playerSideDeck: document.getElementById('player-side-deck'),
            opponentSideDeck: document.getElementById('opponent-side-deck'),

            // Status
            playerStatus: document.getElementById('player-status'),
            opponentStatus: document.getElementById('opponent-status'),
            turnIndicator: document.getElementById('turn-indicator'),

            // Round indicators
            playerRounds: [
                document.getElementById('player-round-1'),
                document.getElementById('player-round-2'),
                document.getElementById('player-round-3')
            ],
            opponentRounds: [
                document.getElementById('opp-round-1'),
                document.getElementById('opp-round-2'),
                document.getElementById('opp-round-3')
            ],

            // Controls
            btnEndTurn: document.getElementById('btn-end-turn'),
            btnStand: document.getElementById('btn-stand'),

            // Modals
            plusMinusModal: document.getElementById('plusminus-modal'),
            roundModal: document.getElementById('round-modal'),
            matchModal: document.getElementById('match-modal'),
            modalCardValue: document.getElementById('modal-card-value'),
            roundResultTitle: document.getElementById('round-result-title'),
            roundResultMessage: document.getElementById('round-result-message'),
            roundPlayerScore: document.getElementById('round-player-score'),
            roundOpponentScore: document.getElementById('round-opponent-score'),
            matchResultTitle: document.getElementById('match-result-title'),
            matchResultMessage: document.getElementById('match-result-message'),

            // Stats
            statMatchesWon: document.getElementById('stat-matches-won'),
            statMatchesLost: document.getElementById('stat-matches-lost'),
            statWinStreak: document.getElementById('stat-win-streak'),

            // Deck builder
            selectedCards: document.getElementById('selected-cards'),
            selectedCount: document.getElementById('selected-count'),
            plusCards: document.getElementById('plus-cards'),
            minusCards: document.getElementById('minus-cards'),
            plusminusCards: document.getElementById('plusminus-cards'),

            // Sound
            soundIcon: document.getElementById('sound-icon')
        };
    }

    // Screen management
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    // Card rendering
    createCardElement(card, clickable = false, onClick = null) {
        const cardEl = document.createElement('div');
        cardEl.className = `card card-${card.type}`;
        cardEl.dataset.cardId = card.id;

        if (card.used) {
            cardEl.classList.add('used');
        }

        const valueEl = document.createElement('span');
        valueEl.className = 'card-value';
        valueEl.textContent = card.getDisplayValue();

        const typeEl = document.createElement('span');
        typeEl.className = 'card-type';
        typeEl.textContent = this.getCardTypeName(card.type);

        cardEl.appendChild(valueEl);
        cardEl.appendChild(typeEl);

        if (clickable && onClick && !card.used) {
            cardEl.addEventListener('click', () => onClick(card));
        }

        return cardEl;
    }

    createCardBack() {
        const cardEl = document.createElement('div');
        cardEl.className = 'card card-back';
        return cardEl;
    }

    getCardTypeName(type) {
        switch (type) {
            case CardType.MAIN: return 'Main';
            case CardType.PLUS: return 'Plus';
            case CardType.MINUS: return 'Minus';
            case CardType.PLUSMINUS: return '+/-';
            default: return '';
        }
    }

    // Game state rendering
    renderGameState(state, onSideCardClick) {
        // Update scores
        this.elements.playerScore.textContent = state.player.score;
        this.elements.opponentScore.textContent = state.opponent.score;

        // Update played cards
        this.renderPlayedCards(this.elements.playerCards, state.player.playedCards);
        this.renderPlayedCards(this.elements.opponentCards, state.opponent.playedCards);

        // Update side decks
        this.renderSideDeck(
            this.elements.playerSideDeck,
            state.player.sideCards,
            state.currentTurn === 'player' && state.player.canPlaySideCard,
            onSideCardClick
        );
        this.renderOpponentSideDeck(this.elements.opponentSideDeck, state.opponent.sideCards);

        // Update status
        this.updatePlayerStatus(this.elements.playerStatus, state.player);
        this.updatePlayerStatus(this.elements.opponentStatus, state.opponent);

        // Update turn indicator
        this.updateTurnIndicator(state.currentTurn, state.state);

        // Update round indicators
        this.updateRoundIndicators(state.player.roundsWon, state.opponent.roundsWon);

        // Update button states
        const isPlayerTurn = state.state === 'player_turn';
        this.elements.btnEndTurn.disabled = !isPlayerTurn;
        this.elements.btnStand.disabled = !isPlayerTurn;

        // Handle plus/minus modal
        if (state.pendingPlusMinusCard) {
            this.showPlusMinusModal(state.pendingPlusMinusCard);
        } else {
            this.hidePlusMinusModal();
        }
    }

    renderPlayedCards(container, cards) {
        container.innerHTML = '';
        cards.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.classList.add('animate-in');
            cardEl.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(cardEl);
        });
    }

    renderSideDeck(container, cards, clickable, onClick) {
        container.innerHTML = '';
        cards.forEach(card => {
            const cardEl = this.createCardElement(card, clickable, onClick);
            container.appendChild(cardEl);
        });
    }

    renderOpponentSideDeck(container, cards) {
        container.innerHTML = '';
        cards.forEach(card => {
            if (card.used) {
                const cardEl = this.createCardElement(card);
                cardEl.classList.add('used');
                container.appendChild(cardEl);
            } else {
                container.appendChild(this.createCardBack());
            }
        });
    }

    updatePlayerStatus(element, playerState) {
        element.className = 'player-status';
        if (playerState.busted) {
            element.textContent = 'BUSTED';
            element.classList.add('busted');
        } else if (playerState.standing && playerState.score === 20) {
            element.textContent = 'PAZAAK!';
            element.classList.add('pazaak');
        } else if (playerState.standing) {
            element.textContent = 'STANDING';
            element.classList.add('standing');
        } else if (playerState.score > 20) {
            element.textContent = 'OVER 20!';
            element.classList.add('danger');
        } else {
            element.textContent = '';
        }
    }

    updateTurnIndicator(currentTurn, state) {
        const indicator = this.elements.turnIndicator;

        if (state === 'round_over' || state === 'match_over') {
            indicator.textContent = 'Round Over';
            indicator.className = 'turn-indicator';
        } else if (currentTurn === 'player') {
            indicator.textContent = 'Your Turn';
            indicator.className = 'turn-indicator';
        } else {
            indicator.textContent = 'Opponent\'s Turn';
            indicator.className = 'turn-indicator opponent-turn';
        }
    }

    updateRoundIndicators(playerWins, opponentWins) {
        this.elements.playerRounds.forEach((dot, i) => {
            dot.className = 'round-dot' + (i < playerWins ? ' won' : '');
        });
        this.elements.opponentRounds.forEach((dot, i) => {
            dot.className = 'round-dot' + (i < opponentWins ? ' won' : '');
        });
    }

    // Modals
    showPlusMinusModal(card) {
        this.elements.modalCardValue.textContent = `±${card.value}`;
        this.elements.plusMinusModal.classList.add('active');
    }

    hidePlusMinusModal() {
        this.elements.plusMinusModal.classList.remove('active');
    }

    showRoundResult(playerScore, opponentScore, playerBusted, opponentBusted, result) {
        let title, message;

        if (result === 'player_win') {
            title = 'You Win the Round!';
            if (opponentBusted) {
                message = 'Opponent busted!';
            } else {
                message = 'Your score is higher!';
            }
        } else if (result === 'opponent_win') {
            title = 'Opponent Wins the Round';
            if (playerBusted) {
                message = 'You busted!';
            } else {
                message = 'Opponent\'s score is higher.';
            }
        } else {
            title = 'Round Tied';
            message = 'No points awarded.';
        }

        this.elements.roundResultTitle.textContent = title;
        this.elements.roundResultMessage.textContent = message;
        this.elements.roundPlayerScore.textContent = playerScore;
        this.elements.roundOpponentScore.textContent = opponentScore;

        this.elements.roundModal.classList.add('active');
    }

    hideRoundResult() {
        this.elements.roundModal.classList.remove('active');
    }

    showMatchResult(playerWon) {
        if (playerWon) {
            this.elements.matchResultTitle.textContent = 'Victory!';
            this.elements.matchResultMessage.textContent = 'You have won the match!';
        } else {
            this.elements.matchResultTitle.textContent = 'Defeat';
            this.elements.matchResultMessage.textContent = 'You have lost the match.';
        }

        this.elements.matchModal.classList.add('active');
    }

    hideMatchResult() {
        this.elements.matchModal.classList.remove('active');
    }

    // Stats
    updateStats(stats) {
        this.elements.statMatchesWon.textContent = stats.matchesWon;
        this.elements.statMatchesLost.textContent = stats.matchesLost;
        this.elements.statWinStreak.textContent = stats.winStreak;
    }

    // Sound toggle
    updateSoundIcon(enabled) {
        this.elements.soundIcon.textContent = enabled ? '🔊' : '🔇';
    }

    // Deck builder
    renderDeckBuilder(availableCards, selectedCards, onCardClick, onSelectedClick) {
        // Clear containers
        this.elements.plusCards.innerHTML = '';
        this.elements.minusCards.innerHTML = '';
        this.elements.plusminusCards.innerHTML = '';

        // Render available cards by type
        availableCards.forEach(card => {
            const cardEl = this.createCardElement(card, true, () => onCardClick(card));

            // Check if card is already selected
            const isSelected = selectedCards.some(
                c => c.type === card.type && c.value === card.value
            );
            if (isSelected) {
                cardEl.classList.add('selected');
            }

            switch (card.type) {
                case CardType.PLUS:
                    this.elements.plusCards.appendChild(cardEl);
                    break;
                case CardType.MINUS:
                    this.elements.minusCards.appendChild(cardEl);
                    break;
                case CardType.PLUSMINUS:
                    this.elements.plusminusCards.appendChild(cardEl);
                    break;
            }
        });

        // Render selected cards
        this.renderSelectedCards(selectedCards, onSelectedClick);
    }

    renderSelectedCards(selectedCards, onClick) {
        this.elements.selectedCards.innerHTML = '';
        this.elements.selectedCount.textContent = selectedCards.length;

        for (let i = 0; i < 4; i++) {
            if (i < selectedCards.length) {
                const card = selectedCards[i];
                const cardEl = this.createCardElement(card, true, () => onClick(i));
                this.elements.selectedCards.appendChild(cardEl);
            } else {
                const slot = document.createElement('div');
                slot.className = 'card-slot empty';
                this.elements.selectedCards.appendChild(slot);
            }
        }
    }
}
