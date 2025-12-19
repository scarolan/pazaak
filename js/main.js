// main.js - Application entry point for Pazaak

import { SideDeck, Card, CardType } from './deck.js';
import { PazaakGame, GameState, RoundResult } from './game.js';
import { PazaakAI } from './ai.js';
import { PazaakUI } from './ui.js';
import { soundManager } from './sound.js';
import { statsManager } from './stats.js';

class PazaakApp {
    constructor() {
        this.ui = new PazaakUI();
        this.game = null;
        this.ai = null;
        this.playerSideDeck = SideDeck.fromStorage();
        this.lastPlayerStanding = false; // Track for auto-stand detection

        // Deck builder state
        this.selectedBuilderCards = [];
        this.availableBuilderCards = SideDeck.getAvailableCards();

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStats();
        this.ui.updateSoundIcon(soundManager.isEnabled());
    }

    bindEvents() {
        // Menu buttons
        document.getElementById('btn-play').addEventListener('click', () => {
            soundManager.buttonClick();
            this.startGame();
        });

        document.getElementById('btn-deck-builder').addEventListener('click', () => {
            soundManager.buttonClick();
            this.openDeckBuilder();
        });

        document.getElementById('btn-how-to-play').addEventListener('click', () => {
            soundManager.buttonClick();
            this.ui.showScreen('howToPlay');
        });

        document.getElementById('btn-back-to-menu').addEventListener('click', () => {
            soundManager.buttonClick();
            this.ui.showScreen('menu');
        });

        // Sound toggle
        document.getElementById('btn-sound-toggle').addEventListener('click', () => {
            const enabled = soundManager.toggle();
            this.ui.updateSoundIcon(enabled);
        });

        // Game controls
        document.getElementById('btn-end-turn').addEventListener('click', () => {
            soundManager.buttonClick();
            this.playerEndTurn();
        });

        document.getElementById('btn-stand').addEventListener('click', () => {
            soundManager.buttonClick();
            soundManager.stand();
            this.playerStand();
        });

        // Plus/minus modal
        document.getElementById('btn-choose-plus').addEventListener('click', () => {
            soundManager.buttonClick();
            this.choosePlusMinusSign('plus');
        });

        document.getElementById('btn-choose-minus').addEventListener('click', () => {
            soundManager.buttonClick();
            this.choosePlusMinusSign('minus');
        });

        // Round modal
        document.getElementById('btn-next-round').addEventListener('click', () => {
            soundManager.buttonClick();
            this.ui.hideRoundResult();
            this.game.nextRound();
        });

        // Match modal
        document.getElementById('btn-play-again').addEventListener('click', () => {
            soundManager.buttonClick();
            this.ui.hideMatchResult();
            this.startGame();
        });

        document.getElementById('btn-return-menu').addEventListener('click', () => {
            soundManager.buttonClick();
            this.ui.hideMatchResult();
            this.updateStats();
            this.ui.showScreen('menu');
        });

        // Deck builder
        document.getElementById('btn-clear-deck').addEventListener('click', () => {
            soundManager.buttonClick();
            this.clearBuilderDeck();
        });

        document.getElementById('btn-save-deck').addEventListener('click', () => {
            soundManager.buttonClick();
            this.saveBuilderDeck();
        });
    }

    updateStats() {
        this.ui.updateStats(statsManager.getStats());
    }

    startGame() {
        this.playerSideDeck = SideDeck.fromStorage();
        this.lastPlayerStanding = false;

        this.game = new PazaakGame((state) => this.onGameStateChange(state));
        this.ai = new PazaakAI(this.game);

        this.game.startMatch(this.playerSideDeck);
        this.ui.showScreen('game');
    }

    onGameStateChange(state) {
        // Detect auto-stand at 20 (Pazaak!)
        if (state.player.standing && !this.lastPlayerStanding && state.player.score === 20) {
            soundManager.stand();
        }
        this.lastPlayerStanding = state.player.standing;

        // Update UI
        this.ui.renderGameState(state, (card) => this.onSideCardClick(card));

        // Handle game states
        if (state.state === GameState.ROUND_OVER) {
            this.handleRoundOver(state);
        } else if (state.state === GameState.MATCH_OVER) {
            this.handleMatchOver(state);
        } else if (state.state === GameState.OPPONENT_TURN) {
            // AI takes turn after a delay
            setTimeout(() => this.aiTurn(), 500);
        }
    }

    onSideCardClick(card) {
        if (this.game.state !== GameState.PLAYER_TURN) return;

        soundManager.cardPlay();
        this.game.playerPlaySideCard(card.id);
    }

    playerEndTurn() {
        if (this.game.state !== GameState.PLAYER_TURN) return;

        this.game.playerEndTurn();
    }

    playerStand() {
        if (this.game.state !== GameState.PLAYER_TURN) return;

        this.game.playerStand();
    }

    choosePlusMinusSign(sign) {
        soundManager.cardPlay();
        this.game.playerChoosePlusMinusSign(sign);
    }

    async aiTurn() {
        if (this.game.state !== GameState.OPPONENT_TURN) return;

        await this.ai.takeTurn();

        // Play sound for AI card draw
        soundManager.cardDraw();
    }

    handleRoundOver(state) {
        const result = this.game.determineRoundWinner();

        // Record stats
        if (result === RoundResult.PLAYER_WIN) {
            statsManager.recordRoundWin();
            soundManager.roundWin();
        } else if (result === RoundResult.OPPONENT_WIN) {
            statsManager.recordRoundLoss();
            soundManager.roundLose();
        } else {
            statsManager.recordRoundTie();
        }

        // Check for match end
        if (state.player.roundsWon >= 3 || state.opponent.roundsWon >= 3) {
            // Match is over, will be handled in MATCH_OVER state
            return;
        }

        // Show round result modal
        setTimeout(() => {
            this.ui.showRoundResult(
                state.player.score,
                state.opponent.score,
                state.player.busted,
                state.opponent.busted,
                result
            );
        }, 500);
    }

    handleMatchOver(state) {
        const playerWon = state.player.roundsWon >= 3;

        // Record stats
        if (playerWon) {
            statsManager.recordMatchWin(state.opponent.roundsWon);
            soundManager.matchWin();
        } else {
            statsManager.recordMatchLoss();
            soundManager.matchLose();
        }

        // Show match result modal
        setTimeout(() => {
            this.ui.showMatchResult(playerWon);
        }, 500);
    }

    // Deck Builder methods
    openDeckBuilder() {
        // Load current deck for editing
        const currentDeck = SideDeck.fromStorage();
        this.selectedBuilderCards = currentDeck.getCards().map(c => ({
            type: c.type,
            value: c.value
        }));

        this.renderDeckBuilder();
        this.ui.showScreen('deckBuilder');
    }

    renderDeckBuilder() {
        this.ui.renderDeckBuilder(
            this.availableBuilderCards,
            this.selectedBuilderCards.map(c => new Card(c.value, c.type)),
            (card) => this.onBuilderCardClick(card),
            (index) => this.onSelectedCardClick(index)
        );
    }

    onBuilderCardClick(card) {
        if (this.selectedBuilderCards.length >= 4) {
            // Deck is full
            return;
        }

        // Add card to selected
        this.selectedBuilderCards.push({
            type: card.type,
            value: card.value
        });

        soundManager.cardPlay();
        this.renderDeckBuilder();
    }

    onSelectedCardClick(index) {
        // Remove card from selected
        this.selectedBuilderCards.splice(index, 1);
        soundManager.cardPlay();
        this.renderDeckBuilder();
    }

    clearBuilderDeck() {
        this.selectedBuilderCards = [];
        this.renderDeckBuilder();
    }

    saveBuilderDeck() {
        if (this.selectedBuilderCards.length !== 4) {
            alert('Please select exactly 4 cards for your side deck.');
            return;
        }

        // Create and save the deck
        const cards = this.selectedBuilderCards.map(c => new Card(c.value, c.type));
        const deck = new SideDeck(cards);
        deck.save();

        this.playerSideDeck = deck;
        this.ui.showScreen('menu');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pazaakApp = new PazaakApp();
});
