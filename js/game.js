// game.js - Core Pazaak game logic

import { MainDeck, SideDeck, generateAISideDeck, CardType } from './deck.js';

export const GameState = {
    WAITING: 'waiting',
    PLAYER_TURN: 'player_turn',
    OPPONENT_TURN: 'opponent_turn',
    ROUND_OVER: 'round_over',
    MATCH_OVER: 'match_over'
};

export const RoundResult = {
    PLAYER_WIN: 'player_win',
    OPPONENT_WIN: 'opponent_win',
    TIE: 'tie'
};

export class Player {
    constructor(name, sideDeck) {
        this.name = name;
        this.sideDeck = sideDeck;
        this.playedCards = [];
        this.score = 0;
        this.standing = false;
        this.busted = false;
        this.roundsWon = 0;
    }

    reset() {
        this.playedCards = [];
        this.score = 0;
        this.standing = false;
        this.busted = false;
    }

    resetMatch() {
        this.reset();
        this.roundsWon = 0;
        this.sideDeck.reset();
    }

    addCard(card) {
        this.playedCards.push(card);
        this.calculateScore();
    }

    calculateScore() {
        this.score = this.playedCards.reduce((sum, card) => {
            return sum + card.getEffectiveValue(card.chosenSign);
        }, 0);

        if (this.score > 20) {
            this.busted = true;
        } else {
            // Score is valid (20 or under) - not busted
            this.busted = false;
            if (this.score === 20) {
                // Auto-stand at 20 - it's a Pazaak!
                this.standing = true;
            }
        }
    }

    canPlaySideCard() {
        return !this.standing && !this.busted && this.sideDeck.hasAvailableCards();
    }

    playSideCard(cardId, chosenSign = null) {
        const card = this.sideDeck.useCard(cardId);
        if (card) {
            card.chosenSign = chosenSign;
            this.addCard(card);
            return card;
        }
        return null;
    }

    stand() {
        this.standing = true;
    }

    hasFilledBoard() {
        return this.playedCards.length >= 9;
    }
}

export class PazaakGame {
    constructor(onStateChange) {
        this.onStateChange = onStateChange;
        this.mainDeck = new MainDeck();
        this.player = null;
        this.opponent = null;
        this.state = GameState.WAITING;
        this.currentTurn = null;
        this.roundNumber = 1;
        this.firstPlayer = 'player'; // alternates each round
        this.pendingPlusMinusCard = null;
    }

    startMatch(playerSideDeck) {
        this.mainDeck.reset();
        this.player = new Player('Player', playerSideDeck);
        this.opponent = new Player('Opponent', generateAISideDeck());
        this.roundNumber = 1;
        this.firstPlayer = Math.random() < 0.5 ? 'player' : 'opponent';
        this.startRound();
    }

    startRound() {
        this.player.reset();
        this.opponent.reset();
        this.player.sideDeck.reset();
        this.opponent.sideDeck.reset();

        // Draw first card for each player
        const playerCard = this.mainDeck.draw();
        const opponentCard = this.mainDeck.draw();

        this.player.addCard(playerCard);
        this.opponent.addCard(opponentCard);

        // Determine who goes first
        this.currentTurn = this.firstPlayer;
        this.state = this.currentTurn === 'player' ? GameState.PLAYER_TURN : GameState.OPPONENT_TURN;

        this.notifyStateChange();
    }

    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getGameState());
        }
    }

    getGameState() {
        return {
            state: this.state,
            currentTurn: this.currentTurn,
            player: {
                score: this.player.score,
                playedCards: [...this.player.playedCards],
                sideCards: this.player.sideDeck.getCards(),
                standing: this.player.standing,
                busted: this.player.busted,
                roundsWon: this.player.roundsWon,
                canPlaySideCard: this.player.canPlaySideCard()
            },
            opponent: {
                score: this.opponent.score,
                playedCards: [...this.opponent.playedCards],
                sideCards: this.opponent.sideDeck.getCards(),
                standing: this.opponent.standing,
                busted: this.opponent.busted,
                roundsWon: this.opponent.roundsWon,
                canPlaySideCard: this.opponent.canPlaySideCard()
            },
            roundNumber: this.roundNumber,
            pendingPlusMinusCard: this.pendingPlusMinusCard
        };
    }

    // Player actions
    playerEndTurn() {
        if (this.state !== GameState.PLAYER_TURN) return false;

        // Check if opponent is standing or busted
        if (this.opponent.standing || this.opponent.busted) {
            // Player draws again since opponent can't act
            const card = this.mainDeck.draw();
            this.player.addCard(card);

            if (this.player.busted || this.player.standing || this.player.hasFilledBoard()) {
                this.endRound();
            } else {
                this.notifyStateChange();
            }
        } else {
            // Switch to opponent's turn
            this.currentTurn = 'opponent';
            this.state = GameState.OPPONENT_TURN;
            this.notifyStateChange();
        }

        return true;
    }

    playerStand() {
        if (this.state !== GameState.PLAYER_TURN) return false;

        this.player.stand();

        // Check if both players are done
        if (this.opponent.standing || this.opponent.busted) {
            this.endRound();
        } else {
            this.currentTurn = 'opponent';
            this.state = GameState.OPPONENT_TURN;
            this.notifyStateChange();
        }

        return true;
    }

    playerPlaySideCard(cardId) {
        if (this.state !== GameState.PLAYER_TURN) return false;
        if (!this.player.canPlaySideCard()) return false;

        const card = this.player.sideDeck.cards.find(c => c.id === cardId && !c.used);
        if (!card) return false;

        // Check if it's a plus/minus card - if so, we need to ask the player
        if (card.type === CardType.PLUSMINUS) {
            this.pendingPlusMinusCard = card;
            this.notifyStateChange();
            return true;
        }

        // Play the card directly
        this.player.playSideCard(cardId);

        if (this.player.busted || this.player.standing) {
            this.checkAndEndRound();
        } else {
            this.notifyStateChange();
        }

        return true;
    }

    playerChoosePlusMinusSign(sign) {
        if (!this.pendingPlusMinusCard) return false;

        const card = this.pendingPlusMinusCard;
        this.pendingPlusMinusCard = null;

        this.player.playSideCard(card.id, sign);

        if (this.player.busted || this.player.standing) {
            this.checkAndEndRound();
        } else {
            this.notifyStateChange();
        }

        return true;
    }

    // Helper to check if round should end after player action
    checkAndEndRound() {
        if (this.opponent.standing || this.opponent.busted) {
            this.endRound();
        } else {
            // Switch to opponent's turn
            this.currentTurn = 'opponent';
            this.state = GameState.OPPONENT_TURN;
            this.notifyStateChange();
        }
    }

    // Switch to player's turn (used when AI finishes their turn)
    switchToPlayerTurn() {
        // Player draws a card at the start of their turn
        const card = this.mainDeck.draw();
        this.player.addCard(card);

        // Check if player busted or auto-stood
        if (this.player.busted) {
            this.endRound();
        } else if (this.player.standing) {
            // Player hit 20 - if opponent is also done, end round
            if (this.opponent.standing || this.opponent.busted) {
                this.endRound();
            } else {
                // This shouldn't happen since we call this when opponent is done
                // but handle it anyway
                this.currentTurn = 'player';
                this.state = GameState.PLAYER_TURN;
                this.notifyStateChange();
            }
        } else {
            // Normal case - player's turn to act
            this.currentTurn = 'player';
            this.state = GameState.PLAYER_TURN;
            this.notifyStateChange();
        }
    }

    // Opponent (AI) actions
    opponentDrawCard() {
        if (this.state !== GameState.OPPONENT_TURN) return null;

        const card = this.mainDeck.draw();
        this.opponent.addCard(card);

        return card;
    }

    opponentPlaySideCard(cardId, sign = null) {
        if (this.state !== GameState.OPPONENT_TURN) return false;

        this.opponent.playSideCard(cardId, sign);
        return true;
    }

    opponentStand() {
        if (this.state !== GameState.OPPONENT_TURN) return false;

        this.opponent.stand();
        return true;
    }

    opponentEndTurn() {
        if (this.state !== GameState.OPPONENT_TURN) return false;

        // Check if player is standing or busted
        if (this.player.standing || this.player.busted) {
            // Keep opponent's turn since player can't act
            // Notify state change to trigger AI to draw again
            this.notifyStateChange();
            return true;
        } else {
            // Switch to player's turn - player draws a card
            const card = this.mainDeck.draw();
            this.player.addCard(card);

            if (this.player.busted || this.player.hasFilledBoard()) {
                this.endRound();
            } else if (this.player.standing) {
                // Player auto-stood at 20, opponent continues playing
                // State stays as OPPONENT_TURN, notify so AI takes another turn
                this.notifyStateChange();
            } else {
                this.currentTurn = 'player';
                this.state = GameState.PLAYER_TURN;
                this.notifyStateChange();
            }
        }

        return true;
    }

    checkRoundOver() {
        // Check if round should end
        if (this.opponent.busted && (this.player.standing || this.player.busted)) {
            return true;
        }
        if (this.player.busted && (this.opponent.standing || this.opponent.busted)) {
            return true;
        }
        if (this.player.standing && this.opponent.standing) {
            return true;
        }
        if (this.player.hasFilledBoard() && this.opponent.hasFilledBoard()) {
            return true;
        }
        return false;
    }

    endRound() {
        this.state = GameState.ROUND_OVER;
        const result = this.determineRoundWinner();

        if (result === RoundResult.PLAYER_WIN) {
            this.player.roundsWon++;
        } else if (result === RoundResult.OPPONENT_WIN) {
            this.opponent.roundsWon++;
        }

        this.notifyStateChange();

        // Check for match win
        if (this.player.roundsWon >= 3 || this.opponent.roundsWon >= 3) {
            this.state = GameState.MATCH_OVER;
            this.notifyStateChange();
        }

        return result;
    }

    determineRoundWinner() {
        const playerScore = this.player.busted ? 0 : this.player.score;
        const opponentScore = this.opponent.busted ? 0 : this.opponent.score;

        // Both busted = tie
        if (this.player.busted && this.opponent.busted) {
            return RoundResult.TIE;
        }

        // One player busted
        if (this.player.busted) {
            return RoundResult.OPPONENT_WIN;
        }
        if (this.opponent.busted) {
            return RoundResult.PLAYER_WIN;
        }

        // Compare scores
        if (playerScore > opponentScore) {
            return RoundResult.PLAYER_WIN;
        } else if (opponentScore > playerScore) {
            return RoundResult.OPPONENT_WIN;
        } else {
            return RoundResult.TIE;
        }
    }

    getMatchWinner() {
        if (this.player.roundsWon >= 3) return 'player';
        if (this.opponent.roundsWon >= 3) return 'opponent';
        return null;
    }

    nextRound() {
        if (this.state !== GameState.ROUND_OVER) return false;

        // Alternate who goes first
        this.firstPlayer = this.firstPlayer === 'player' ? 'opponent' : 'player';
        this.roundNumber++;
        this.startRound();

        return true;
    }
}
