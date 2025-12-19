// ai.js - AI opponent logic for Pazaak

import { CardType } from './deck.js';

export class PazaakAI {
    constructor(game) {
        this.game = game;
        this.thinkingDelay = 800; // ms delay to simulate thinking
    }

    async takeTurn() {
        const state = this.game.getGameState();

        // Don't take turn if already busted or standing
        if (state.opponent.busted || state.opponent.standing) {
            return;
        }

        // Add a small delay to simulate thinking
        await this.delay(this.thinkingDelay);

        // First, AI draws a card (this happens automatically at turn start)
        const drawnCard = this.game.opponentDrawCard();

        if (!drawnCard) return;

        // Re-check state after drawing
        const newState = this.game.getGameState();

        // If over 20 after drawing, try to recover with a minus card
        if (newState.opponent.score > 20) {
            const recoveryCard = this.findCardToReduce(newState.opponent.score,
                newState.opponent.sideCards.filter(c => !c.used));

            if (recoveryCard) {
                // Try to save ourselves
                await this.delay(400);
                this.game.opponentPlaySideCard(recoveryCard.card.id, recoveryCard.sign);
                this.game.notifyStateChange();

                // Check if we're still over 20
                const afterRecovery = this.game.getGameState();
                if (afterRecovery.opponent.score > 20) {
                    // Still over 20, bust and end round - AI loses
                    this.game.opponent.busted = true;
                    this.game.endRound();
                    return;
                }
                // Recovered! Continue with turn (might stand now)
            } else {
                // No recovery possible, bust and end round - AI loses
                this.game.opponent.busted = true;
                this.game.endRound();
                return;
            }
        }

        // If auto-stood at 20, handle it
        if (newState.opponent.standing) {
            if (newState.player.standing || newState.player.busted) {
                this.game.endRound();
            } else {
                // AI is done at 20 - switch to player turn
                this.game.switchToPlayerTurn();
            }
            return;
        }

        // Decide whether to play a side card
        await this.delay(400);
        const sideCardDecision = this.decideSideCard(newState);

        if (sideCardDecision) {
            this.game.opponentPlaySideCard(sideCardDecision.card.id, sideCardDecision.sign);
            this.game.notifyStateChange();
            await this.delay(400);

            // Check if over 20 or auto-stood after playing side card
            const afterSideCard = this.game.getGameState();
            if (afterSideCard.opponent.score > 20) {
                // Over 20 after playing side card - bust and end round
                this.game.opponent.busted = true;
                this.game.endRound();
                return;
            }
            if (afterSideCard.opponent.standing) {
                // Auto-stood at 20
                if (afterSideCard.player.standing || afterSideCard.player.busted) {
                    this.game.endRound();
                } else {
                    this.game.switchToPlayerTurn();
                }
                return;
            }
        }

        // Get updated state
        const finalState = this.game.getGameState();

        // Decide whether to stand or end turn
        const shouldStand = this.decideStand(finalState);

        if (shouldStand) {
            this.game.opponentStand();

            // Check if round is over
            if (this.game.checkRoundOver()) {
                this.game.endRound();
            } else {
                this.game.opponentEndTurn();
            }
        } else {
            // End turn - player will draw
            this.game.opponentEndTurn();
        }
    }

    decideSideCard(state) {
        const score = state.opponent.score;
        const availableCards = state.opponent.sideCards.filter(c => !c.used);

        if (availableCards.length === 0) return null;

        // If at exactly 20, no need to play anything
        if (score === 20) return null;

        // If score > 20 (busted), we need to reduce
        if (score > 20) {
            return this.findCardToReduce(score, availableCards);
        }

        // If score is good (17-19), consider playing to reach 20
        if (score >= 17 && score <= 19) {
            const needed = 20 - score;
            const exactCard = this.findExactCard(needed, availableCards, 'plus');
            if (exactCard) return exactCard;
        }

        // If score is low, might want to save cards
        // But if player is standing with a good score, we might need to catch up
        const playerScore = state.player.standing ? state.player.score : 0;

        if (state.player.standing && playerScore > score && playerScore <= 20) {
            // Need to beat player's score
            const needed = playerScore + 1 - score;
            if (needed > 0 && needed <= 6) {
                const card = this.findExactCard(needed, availableCards, 'plus');
                if (card) return card;
            }
        }

        return null;
    }

    findCardToReduce(score, availableCards) {
        const excess = score - 20;

        // Look for exact minus card
        for (const card of availableCards) {
            if (card.type === CardType.MINUS && card.value === excess) {
                return { card, sign: null };
            }
            if (card.type === CardType.PLUSMINUS && card.value === excess) {
                return { card, sign: 'minus' };
            }
        }

        // Look for any minus card that brings us under 20
        for (const card of availableCards) {
            if (card.type === CardType.MINUS && score - card.value <= 20) {
                return { card, sign: null };
            }
            if (card.type === CardType.PLUSMINUS && score - card.value <= 20) {
                return { card, sign: 'minus' };
            }
        }

        return null;
    }

    findExactCard(needed, availableCards, preferredSign) {
        for (const card of availableCards) {
            if (preferredSign === 'plus') {
                if (card.type === CardType.PLUS && card.value === needed) {
                    return { card, sign: null };
                }
                if (card.type === CardType.PLUSMINUS && card.value === needed) {
                    return { card, sign: 'plus' };
                }
            } else if (preferredSign === 'minus') {
                if (card.type === CardType.MINUS && card.value === needed) {
                    return { card, sign: null };
                }
                if (card.type === CardType.PLUSMINUS && card.value === needed) {
                    return { card, sign: 'minus' };
                }
            }
        }
        return null;
    }

    decideStand(state) {
        const score = state.opponent.score;
        const playerScore = state.player.score;
        const playerStanding = state.player.standing;
        const playerBusted = state.player.busted;

        // Always stand at 20
        if (score === 20) return true;

        // If busted, doesn't matter
        if (score > 20) return true;

        // If player busted, we win - stand
        if (playerBusted) return true;

        // If player is standing
        if (playerStanding) {
            // If we're beating them, stand
            if (score > playerScore) return true;

            // If we're tied or losing, need to decide based on risk
            // If score is good (18+), take the risk of drawing again if losing
            if (score >= playerScore && score >= 18) return true;

            // If score is 17+ and tied, stand (no need to risk)
            if (score === playerScore && score >= 17) return true;
        }

        // If player is not standing and not busted
        // Use probability-based decision

        // High scores - more likely to stand
        if (score >= 20) return true;
        if (score >= 19) return Math.random() < 0.85;
        if (score >= 18) return Math.random() < 0.7;
        if (score >= 17) return Math.random() < 0.5;

        // Low scores - keep drawing
        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
