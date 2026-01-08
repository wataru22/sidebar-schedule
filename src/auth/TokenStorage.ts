import { Plugin } from 'obsidian';
import { GoogleTokens } from '../types';

interface StoredData {
    googleTokens?: GoogleTokens;
}

export class TokenStorage {
    constructor(private plugin: Plugin) {}

    async saveGoogleTokens(tokens: GoogleTokens): Promise<void> {
        const data = (await this.plugin.loadData() as StoredData) || {};
        data.googleTokens = tokens;
        await this.plugin.saveData(data);
    }

    async loadGoogleTokens(): Promise<GoogleTokens | null> {
        const data = (await this.plugin.loadData() as StoredData);
        return data?.googleTokens || null;
    }

    async clearGoogleTokens(): Promise<void> {
        const data = (await this.plugin.loadData() as StoredData) || {};
        delete data.googleTokens;
        await this.plugin.saveData(data);
    }

    async hasGoogleTokens(): Promise<boolean> {
        const tokens = await this.loadGoogleTokens();
        return tokens !== null && !!tokens.access_token;
    }
}
