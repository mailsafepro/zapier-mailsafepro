/**
 * TypeScript definitions for MailSafePro Zapier Integration
 * @version 1.0.0
 */

declare module 'zapier-mailsafepro-integration' {
    import { Bundle, ZObject } from 'zapier-platform-core';

    // ============================================================================
    // Authentication
    // ============================================================================

    export interface AuthData {
        apiKey?: string;
        email?: string;
        password?: string;
        jwt?: string;
        refreshToken?: string;
        expiresAt?: number;
        authMethod?: 'api_key' | 'jwt';
    }

    export interface AuthenticationConfig {
        type: 'custom';
        fields: Array<AuthField>;
        test: (z: ZObject, bundle: Bundle<AuthData>) => Promise<AuthTestResult>;
        connectionLabel: (z: ZObject, bundle: Bundle<AuthData>) => string;
    }

    export interface AuthField {
        key: string;
        label: string;
        required: boolean;
        type: 'string' | 'password';
        helpText: string;
        placeholder?: string;
    }

    export interface AuthTestResult {
        authMethod: 'api_key' | 'jwt';
        message: string;
    }

    // ============================================================================
    // Email Validation
    // ============================================================================

    export interface EmailValidationInput {
        email: string;
        check_smtp?: boolean;
        include_raw_dns?: boolean;
        validation_timeout?: number;
    }

    export interface EmailValidationResult {
        email: string;
        valid: boolean;
        status: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
        risk_score: number;
        quality_score: number;
        processing_time: number;
        spam_trap_check: SpamTrapCheck;
        provider_analysis: ProviderAnalysis;
        dns_security?: DnsSecurity;
        metadata: ValidationMetadata;
        deliverability_status?: string;
        risk_level?: string;
        quality_tier?: string;
        has_security_records?: boolean;
        validated_at: string;
    }

    export interface SpamTrapCheck {
        checked: boolean;
        is_spam_trap: boolean;
        confidence: number;
        trap_type: string;
    }

    export interface ProviderAnalysis {
        provider: string;
        reputation: number;
        fingerprint: string;
    }

    export interface DnsSecurity {
        spf: { status: string };
        dkim: { status: string };
        dmarc: { status: string };
    }

    export interface ValidationMetadata {
        validation_id: string;
        cache_used: boolean;
        client_plan: string;
    }

    // ============================================================================
    // Batch Validation
    // ============================================================================

    export interface BatchValidationInput {
        input_method: 'text_list' | 'file_url' | 'direct_array';
        emails?: string | string[];
        file_url?: string;
        check_smtp?: boolean;
        include_raw_dns?: boolean;
        priority?: 'normal' | 'high' | 'highest';
        batch_name?: string;
        callback_url?: string;
    }

    export interface BatchValidationResult {
        job_id: string;
        status: 'processing' | 'completed' | 'failed';
        submitted_at: string;
        estimated_completion_time: string;
        input_method: string;
        total_emails: number;
        processed: number;
        tracking_url: string;
        results_url?: string;
        can_poll_status: boolean;
        recommended_poll_interval: number;
        batch_name?: string;
        callback_url?: string;
        queue_position?: number;
        estimated_processing_time?: number;
    }

    // ============================================================================
    // Usage Analytics
    // ============================================================================

    export interface UsageInput {
        time_range?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30Days' | 'last90Days';
        include_projections?: boolean;
        include_recommendations?: boolean;
    }

    export interface UsageResult {
        plan: string;
        usage_today: number;
        daily_limit: number;
        remaining_today: number;
        usage_month: number;
        monthly_limit: number;
        remaining_month: number;
        time_range: string;
        start_date: string;
        end_date: string;
        analytics?: UsageAnalytics;
        projections?: UsageProjections;
        recommendations?: UsageRecommendation[];
        alerts?: UsageAlert[];
        last_validation_at?: string;
    }

    export interface UsageAnalytics {
        average_daily_usage: number;
        peak_usage_day: number;
        usage_trend: string;
        efficiency_score: number;
    }

    export interface UsageProjections {
        days_until_limit: number;
        will_exceed_limit: boolean;
        recommended_plan?: string;
    }

    export interface UsageRecommendation {
        type: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        action: string;
        impact: string;
        description: string;
    }

    export interface UsageAlert {
        type: string;
        severity: 'info' | 'warning' | 'critical';
        message: string;
        threshold?: number;
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    export interface AppConfig {
        version: string;
        platformVersion: string;
        authentication: AuthenticationConfig;
        beforeRequest: Array<(z: ZObject, bundle: Bundle) => Promise<any>>;
        afterResponse: Array<(response: any, z: ZObject, bundle: Bundle) => Promise<any>>;
        triggers: Record<string, TriggerConfig>;
        creates: Record<string, CreateConfig>;
        searches: Record<string, SearchConfig>;
        testHelpers?: TestHelpers;
    }

    export interface TriggerConfig {
        key: string;
        noun: string;
        display: {
            label: string;
            description: string;
        };
        operation: {
            inputFields: Array<InputField>;
            perform: (z: ZObject, bundle: Bundle) => Promise<any>;
            sample: any;
            outputFields: Array<OutputField>;
        };
    }

    export interface CreateConfig extends TriggerConfig { }
    export interface SearchConfig extends TriggerConfig { }

    export interface InputField {
        key: string;
        type: 'string' | 'integer' | 'boolean' | 'number';
        required: boolean;
        label: string;
        helpText: string;
        default?: any;
        placeholder?: string;
        choices?: any;
    }

    export interface OutputField {
        key: string;
        label: string;
        type?: string;
    }

    export interface TestHelpers {
        logger: Logger;
        sanitizeForLogging: (obj: any) => any;
        isRecoverableError: (status: number) => boolean;
        calculateRetryDelay: (attempt: number, baseDelay?: number) => number;
        extractRequestInfo: (request: any) => any;
        extractResponseInfo: (response: any) => any;
        CONFIG: any;
    }

    export interface Logger {
        debug: (message: string, data?: any) => void;
        info: (message: string, data?: any) => void;
        warn: (message: string, data?: any) => void;
        error: (message: string, data?: any) => void;
    }

    // ============================================================================
    // Exports
    // ============================================================================

    export const authentication: AuthenticationConfig;
    export function beforeRequest(z: ZObject, bundle: Bundle): Promise<any>;
    export function afterResponse(response: any, z: ZObject, bundle: Bundle): Promise<any>;

    const app: AppConfig;
    export default app;
}
