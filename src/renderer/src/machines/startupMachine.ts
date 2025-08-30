/**
 * XState machine for managing startup flow and provider initialization
 *
 * This machine prevents infinite loops by providing explicit finite states
 * for startup orchestration, replacing boolean flag-based navigation.
 *
 * @module StartupMachine
 */

import { createMachine, assign, fromPromise } from 'xstate';

/**
 * Provider status for tracking individual provider health and setup requirements
 */
export interface ProviderStatus {
  readonly id: 'gmail' | 'openai' | 'storage';
  readonly status: 'connected' | 'disconnected' | 'error' | 'checking';
  readonly message?: string;
  readonly lastChecked: Date;
  readonly requiresSetup: boolean;
  readonly setupType: 'token_refresh' | 'full_reconfiguration' | 'initial_setup';
}

/**
 * Startup state machine context
 */
export interface StartupContext {
  readonly providers: ProviderStatus[];
  readonly error: string | null;
  readonly checkStartTime: Date | null;
}

/**
 * Startup flow events
 */
export type StartupEvent =
  | { type: 'PROVIDERS_CHECKED'; providers: ProviderStatus[] }
  | { type: 'PROVIDER_SETUP_COMPLETE'; providerId: string }
  | { type: 'RETRY_PROVIDER_CHECK' }
  | { type: 'SETUP_TIMEOUT' }
  | { type: 'FORCE_DASHBOARD' };

/**
 * Initial context for the startup machine
 */
const initialContext: StartupContext = {
  providers: [],
  error: null,
  checkStartTime: null,
};

/**
 * XState machine for startup flow management
 *
 * States:
 * - initializing: Brief initial state to show loading
 * - checking_providers: Async provider health checks
 * - dashboard_ready: App is usable, providers connected
 * - setup_required: Some providers need setup but app is still usable
 * - setup_timeout: Timeout occurred during provider checks
 */
export const startupMachine = createMachine(
  {
    id: 'startup',
    initial: 'initializing',
    context: initialContext,
    states: {
      initializing: {
        entry: ['logStateTransition', 'recordCheckStartTime'],
        after: {
          100: 'checking_providers', // Small delay to show loading
        },
      },
      checking_providers: {
        entry: 'logStateTransition',
        invoke: {
          id: 'checkProviders',
          src: 'providerCheckService',
          onDone: [
            {
              target: 'dashboard_ready',
              guard: 'isAppUsable',
              actions: assign({
                providers: ({ event }) => event.output,
                error: null,
              }),
            },
            {
              target: 'setup_required',
              actions: assign({
                providers: ({ event }) => event.output,
                error: null,
              }),
            },
          ],
          onError: {
            target: 'setup_timeout',
            actions: assign({
              error: ({ event }) => (event.error as Error)?.message || 'Provider check failed',
            }),
          },
        },
        after: {
          15000: {
            // 15 second timeout for all provider checks
            target: 'setup_timeout',
            actions: assign({
              error: 'Provider health checks timed out',
            }),
          },
        },
      },
      dashboard_ready: {
        entry: 'logStateTransition',
        type: 'final',
      },
      setup_required: {
        entry: 'logStateTransition',
        on: {
          PROVIDER_SETUP_COMPLETE: {
            target: 'checking_providers',
            actions: 'logProviderSetupComplete',
          },
          RETRY_PROVIDER_CHECK: {
            target: 'checking_providers',
          },
          FORCE_DASHBOARD: {
            target: 'dashboard_ready',
          },
        },
      },
      setup_timeout: {
        entry: 'logStateTransition',
        on: {
          RETRY_PROVIDER_CHECK: {
            target: 'checking_providers',
          },
          FORCE_DASHBOARD: {
            target: 'dashboard_ready',
          },
        },
      },
    },
  },
  {
    actors: {
      providerCheckService: fromPromise(async () => {
        // This will be provided by the component
        throw new Error('providerCheckService must be provided');
      }),
    },
    actions: {
      logStateTransition: ({ context, event }) => {
        const duration = context.checkStartTime ? Date.now() - context.checkStartTime.getTime() : 0;
        console.log(`[StartupMachine] State transition:`, {
          event: event?.type,
          context: {
            providersCount: context.providers.length,
            error: context.error,
            duration: `${duration}ms`,
          },
        });
      },
      recordCheckStartTime: assign({
        checkStartTime: () => new Date(),
      }),
      logProviderSetupComplete: ({ context, event }) => {
        if (
          event &&
          'type' in event &&
          event.type === 'PROVIDER_SETUP_COMPLETE' &&
          'providerId' in event
        ) {
          console.log(`[StartupMachine] Provider setup completed:`, {
            providerId: (event as any).providerId,
            providersStatus: context.providers.map((p: ProviderStatus) => ({
              id: p.id,
              status: p.status,
            })),
          });
        }
      },
    },
    guards: {
      isAppUsable: ({ event }) => {
        // In XState v5, guards run before actions, so we need to get providers from the event
        const providers = (event as any)?.output || [];

        console.log(
          '[StartupMachine] isAppUsable guard checking providers from event:',
          providers.map((p: ProviderStatus) => ({
            id: p.id,
            status: p.status,
            requiresSetup: p.requiresSetup,
          })),
        );

        // App requires ALL three providers: Storage + Gmail + OpenAI
        const storage = providers.find((p: ProviderStatus) => p.id === 'storage');
        const gmail = providers.find((p: ProviderStatus) => p.id === 'gmail');
        const openai = providers.find((p: ProviderStatus) => p.id === 'openai');

        const hasWorkingStorage = storage?.status === 'connected';
        const hasWorkingGmail = gmail?.status === 'connected';
        const hasWorkingOpenAI = openai?.status === 'connected';

        console.log('[StartupMachine] All provider status:', {
          storageStatus: storage?.status,
          gmailStatus: gmail?.status,
          openaiStatus: openai?.status,
          hasWorkingStorage,
          hasWorkingGmail,
          hasWorkingOpenAI,
        });

        const allConnected = hasWorkingStorage && hasWorkingGmail && hasWorkingOpenAI;

        console.log('[StartupMachine] App usability result:', { allConnected });

        return allConnected;
      },
    },
  },
);

/**
 * Type-safe state machine service type
 */
export type StartupMachineService = typeof startupMachine;

/**
 * Helper function to create error provider status
 */
export function createErrorProviderStatus(
  id: ProviderStatus['id'],
  message: string,
  setupType: ProviderStatus['setupType'] = 'full_reconfiguration',
): ProviderStatus {
  return {
    id,
    status: 'error',
    message,
    lastChecked: new Date(),
    requiresSetup: true,
    setupType,
  };
}

/**
 * Helper function to create connected provider status
 */
export function createConnectedProviderStatus(
  id: ProviderStatus['id'],
  message?: string,
): ProviderStatus {
  return {
    id,
    status: 'connected',
    message,
    lastChecked: new Date(),
    requiresSetup: false,
    setupType: 'initial_setup', // Not used when connected
  };
}

/**
 * Helper function to create checking provider status
 */
export function createCheckingProviderStatus(id: ProviderStatus['id']): ProviderStatus {
  return {
    id,
    status: 'checking',
    lastChecked: new Date(),
    requiresSetup: false,
    setupType: 'initial_setup', // Will be determined after check
  };
}
