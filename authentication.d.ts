/**
 * TypeScript definitions for Authentication Module
 * @version 1.0.0
 */

declare module './authentication' {
    import { Bundle, ZObject } from 'zapier-platform-core';

    export interface AuthData {
        apiKey?: string;
        email?: string;
        password?: string;
        jwt?: string;
        refreshToken?: string;
        expiresAt?: number;
        authMethod?: 'api_key' | 'jwt';
    }

    export interface RefreshResult {
        jwt: string;
        refreshToken: string;
        expiresAt: number;
        authMethod: 'jwt';
    }

    export interface SessionKey {
        authMethod: 'api_key' | 'jwt';
        apiKey?: string;
        jwt?: string;
        refreshToken?: string;
        expiresAt?: number;
    }

    export interface AuthenticationModule {
        authentication: {
            type: 'custom';
            fields: Array<any>;
            test: (z: ZObject, bundle: Bundle<AuthData>) => Promise<any>;
            connectionLabel: (z: ZObject, bundle: Bundle<AuthData>) => string;
        };
        beforeRequest: Array<(request: any, z: ZObject, bundle: Bundle<AuthData>) => Promise<any>>;
        refreshAccessToken: (z: ZObject, bundle: Bundle<AuthData>) => Promise<RefreshResult>;
        getSessionKey: (z: ZObject, bundle: Bundle<AuthData>) => Promise<SessionKey>;
        withRetry: <T>(requestFn: () => Promise<T>, options?: RetryOptions) => Promise<T>;
        exponentialBackoff: (attempt: number) => Promise<void>;
        test: (z: ZObject, bundle: Bundle<AuthData>) => Promise<any>;
    }

    export interface RetryOptions {
        maxAttempts?: number;
        retryOn?: number[];
    }

    const auth: AuthenticationModule;
    export default auth;
}
