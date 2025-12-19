// stats.js - Statistics tracking for Pazaak

const STORAGE_KEY = 'pazaak-stats';

export class StatsManager {
    constructor() {
        this.stats = this.load();
    }

    getDefaultStats() {
        return {
            matchesWon: 0,
            matchesLost: 0,
            roundsWon: 0,
            roundsLost: 0,
            roundsTied: 0,
            winStreak: 0,
            bestWinStreak: 0,
            totalMatches: 0,
            perfectMatches: 0  // 3-0 wins
        };
    }

    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new stats added over time
                return { ...this.getDefaultStats(), ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load stats:', e);
        }
        return this.getDefaultStats();
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Failed to save stats:', e);
        }
    }

    recordRoundWin() {
        this.stats.roundsWon++;
        this.save();
    }

    recordRoundLoss() {
        this.stats.roundsLost++;
        this.save();
    }

    recordRoundTie() {
        this.stats.roundsTied++;
        this.save();
    }

    recordMatchWin(opponentRoundsWon) {
        this.stats.matchesWon++;
        this.stats.totalMatches++;
        this.stats.winStreak++;

        if (this.stats.winStreak > this.stats.bestWinStreak) {
            this.stats.bestWinStreak = this.stats.winStreak;
        }

        if (opponentRoundsWon === 0) {
            this.stats.perfectMatches++;
        }

        this.save();
    }

    recordMatchLoss() {
        this.stats.matchesLost++;
        this.stats.totalMatches++;
        this.stats.winStreak = 0;
        this.save();
    }

    getStats() {
        return { ...this.stats };
    }

    getWinRate() {
        if (this.stats.totalMatches === 0) return 0;
        return Math.round((this.stats.matchesWon / this.stats.totalMatches) * 100);
    }

    getRoundWinRate() {
        const total = this.stats.roundsWon + this.stats.roundsLost;
        if (total === 0) return 0;
        return Math.round((this.stats.roundsWon / total) * 100);
    }

    reset() {
        this.stats = this.getDefaultStats();
        this.save();
    }
}

// Export singleton instance
export const statsManager = new StatsManager();
