import { GoogleTokens } from '../types';
import { requestUrl } from 'obsidian';
import * as http from 'http';
import * as url from 'url';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
];

const REDIRECT_PORT = 42813;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth/callback`;

export class GoogleOAuthHandler {
    private clientId: string;
    private clientSecret: string;

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    generateAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent',
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    async authenticate(): Promise<GoogleTokens> {
        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                try {
                    const parsedUrl = url.parse(req.url || '', true);

                    if (parsedUrl.pathname === '/oauth/callback') {
                        const code = parsedUrl.query.code as string;
                        const error = parsedUrl.query.error as string;

                        if (error) {
                            res.writeHead(400, { 'Content-Type': 'text/html' });
                            res.end(`
                                <html>
                                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                                    <h1>Authentication Failed</h1>
                                    <p>Error: ${error}</p>
                                    <p>You can close this window.</p>
                                </body>
                                </html>
                            `);
                            server.close();
                            reject(new Error(`OAuth error: ${error}`));
                            return;
                        }

                        if (code) {
                            try {
                                const tokens = await this.exchangeCodeForTokens(code);

                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`
                                    <html>
                                    <body style="font-family: system-ui; text-align: center; padding: 50px;">
                                        <h1>Authentication Successful!</h1>
                                        <p>You can close this window and return to Obsidian.</p>
                                        <script>setTimeout(() => window.close(), 2000);</script>
                                    </body>
                                    </html>
                                `);

                                server.close();
                                resolve(tokens);
                            } catch (tokenError) {
                                res.writeHead(500, { 'Content-Type': 'text/html' });
                                res.end(`
                                    <html>
                                    <body style="font-family: system-ui; text-align: center; padding: 50px;">
                                        <h1>Token Exchange Failed</h1>
                                        <p>Please try again.</p>
                                    </body>
                                    </html>
                                `);
                                server.close();
                                reject(tokenError);
                            }
                        } else {
                            res.writeHead(400, { 'Content-Type': 'text/html' });
                            res.end(`
                                <html>
                                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                                    <h1>No Authorization Code</h1>
                                    <p>No authorization code was received.</p>
                                </body>
                                </html>
                            `);
                            server.close();
                            reject(new Error('No authorization code received'));
                        }
                    }
                } catch (err) {
                    server.close();
                    reject(err);
                }
            });

            server.on('error', (err) => {
                reject(err);
            });

            server.listen(REDIRECT_PORT, () => {
                // Open the auth URL in the default browser
                const authUrl = this.generateAuthUrl();
                const { shell } = require('electron');
                shell.openExternal(authUrl);
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timed out'));
            }, 5 * 60 * 1000);
        });
    }

    private async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
        const response = await requestUrl({
            url: 'https://oauth2.googleapis.com/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            }).toString(),
        });

        const data = response.json;

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expiry_date: Date.now() + data.expires_in * 1000,
            token_type: data.token_type,
            scope: data.scope,
        };
    }
}
