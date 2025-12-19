// deck.js - Card and Deck management for Pazaak

export const CardType = {
    MAIN: 'main',
    PLUS: 'plus',
    MINUS: 'minus',
    PLUSMINUS: 'plusminus'
};

export class Card {
    constructor(value, type = CardType.MAIN) {
        this.value = value;
        this.type = type;
        this.id = `${type}-${value}-${Math.random().toString(36).substr(2, 9)}`;
        this.used = false;
    }

    getDisplayValue() {
        switch (this.type) {
            case CardType.PLUS:
                return `+${this.value}`;
            case CardType.MINUS:
                return `-${this.value}`;
            case CardType.PLUSMINUS:
                return `±${this.value}`;
            default:
                return `${this.value}`;
        }
    }

    getEffectiveValue(chosenSign = null) {
        switch (this.type) {
            case CardType.PLUS:
                return this.value;
            case CardType.MINUS:
                return -this.value;
            case CardType.PLUSMINUS:
                if (chosenSign === 'plus') return this.value;
                if (chosenSign === 'minus') return -this.value;
                return this.value; // default to plus
            default:
                return this.value;
        }
    }

    clone() {
        const card = new Card(this.value, this.type);
        card.id = this.id;
        card.used = this.used;
        return card;
    }
}

export class MainDeck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        // 4 copies of each card 1-10
        for (let value = 1; value <= 10; value++) {
            for (let i = 0; i < 4; i++) {
                this.cards.push(new Card(value, CardType.MAIN));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this.reset();
        }
        return this.cards.pop();
    }

    cardsRemaining() {
        return this.cards.length;
    }
}

export class SideDeck {
    constructor(cards = []) {
        this.cards = cards.map(c => c.clone ? c.clone() : new Card(c.value, c.type));
    }

    static getAvailableCards() {
        const cards = [];

        // Plus cards (+1 to +6)
        for (let i = 1; i <= 6; i++) {
            cards.push(new Card(i, CardType.PLUS));
        }

        // Minus cards (-1 to -6)
        for (let i = 1; i <= 6; i++) {
            cards.push(new Card(i, CardType.MINUS));
        }

        // Plus/Minus cards (±1 to ±6)
        for (let i = 1; i <= 6; i++) {
            cards.push(new Card(i, CardType.PLUSMINUS));
        }

        return cards;
    }

    static getDefaultDeck() {
        // Default side deck: +3, +4, -2, ±3
        return new SideDeck([
            new Card(3, CardType.PLUS),
            new Card(4, CardType.PLUS),
            new Card(2, CardType.MINUS),
            new Card(3, CardType.PLUSMINUS)
        ]);
    }

    static fromStorage() {
        const stored = localStorage.getItem('pazaak-sidedeck');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const cards = parsed.map(c => new Card(c.value, c.type));
                if (cards.length === 4) {
                    return new SideDeck(cards);
                }
            } catch (e) {
                console.warn('Failed to load side deck from storage:', e);
            }
        }
        return SideDeck.getDefaultDeck();
    }

    save() {
        const toStore = this.cards.map(c => ({ value: c.value, type: c.type }));
        localStorage.setItem('pazaak-sidedeck', JSON.stringify(toStore));
    }

    getCards() {
        return this.cards.map(c => c.clone());
    }

    reset() {
        this.cards.forEach(c => c.used = false);
    }

    getAvailableCards() {
        return this.cards.filter(c => !c.used);
    }

    useCard(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
            card.used = true;
            return card;
        }
        return null;
    }

    hasAvailableCards() {
        return this.cards.some(c => !c.used);
    }
}

// Generate a random AI side deck
export function generateAISideDeck() {
    const available = SideDeck.getAvailableCards();
    const selected = [];

    // Shuffle available cards
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    // Pick 4 cards, favoring a balanced mix
    // Ensure at least one plus and one minus/plusminus
    const plusCards = available.filter(c => c.type === CardType.PLUS);
    const minusCards = available.filter(c => c.type === CardType.MINUS);
    const plusminusCards = available.filter(c => c.type === CardType.PLUSMINUS);

    // Pick 1-2 plus cards
    const numPlus = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPlus && plusCards.length > 0; i++) {
        selected.push(plusCards.splice(Math.floor(Math.random() * plusCards.length), 1)[0]);
    }

    // Pick 1-2 minus cards
    const numMinus = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numMinus && minusCards.length > 0 && selected.length < 4; i++) {
        selected.push(minusCards.splice(Math.floor(Math.random() * minusCards.length), 1)[0]);
    }

    // Fill remaining with plusminus or random
    while (selected.length < 4) {
        if (plusminusCards.length > 0 && Math.random() > 0.3) {
            selected.push(plusminusCards.splice(Math.floor(Math.random() * plusminusCards.length), 1)[0]);
        } else {
            const pool = [...plusCards, ...minusCards, ...plusminusCards];
            if (pool.length > 0) {
                selected.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
            }
        }
    }

    return new SideDeck(selected);
}
