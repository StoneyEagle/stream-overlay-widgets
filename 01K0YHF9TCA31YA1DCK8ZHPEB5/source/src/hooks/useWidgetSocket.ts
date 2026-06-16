import type { HubConnection } from '@microsoft/signalr';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { onUnmounted, reactive } from 'vue';

export interface WidgetConnection {
	state: {
		connection: HubConnection | null;
		isConnected: boolean;
	};
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	on: (methodName: string, callback: (...args: any[]) => void) => void;
	off: (methodName: string, callback?: (...args: any[]) => void) => void;
	invoke: (methodName: string, ...args: any[]) => Promise<any>;
}

/**
 * Generic WebSocket hook for widget connections
 * Usage:
 *
 * import { useWidgetSocket } from './hooks/useWidgetSocket';
 *
 * const socket = useWidgetSocket('{{WIDGET_ID}}');
 *
 * // Connect to widget hub
 * await socket.connect();
 *
 * // Listen for events
 * socket.on('ChatMessage', (data) => {
 *   console.log('Received:', data);
 * });
 *
 * // Send messages
 * await socket.invoke('SomeMethod', { data: 'example' });
 */

const widgetSocketInstances: Record<string, WidgetConnection> = {};

// --- Visual status indicator (shared across all widgets on the page) ---
// When disconnected for >5s the whole page desaturates to signal "stale".
// Non-disruptive: chat/feather/etc remain readable; only the color
// saturation drops. (No corner dot — it read as a stream glitch on camera.)
const STATUS_STYLE_ID = 'widget-socket-status-style';
const DISCONNECTED_CLASS = 'widget-disconnected';
const DISCONNECT_GRACE_MS = 5_000;
let disconnectedTimer: ReturnType<typeof setTimeout> | null = null;

const ensureStatusStyle = () => {
	if (typeof document === 'undefined' || document.getElementById(STATUS_STYLE_ID))
		return;
	const style = document.createElement('style');
	style.id = STATUS_STYLE_ID;
	style.textContent = `
		body.${DISCONNECTED_CLASS} {
			filter: saturate(0.4) opacity(0.85);
			transition: filter 1.2s ease;
		}
	`;
	document.head.appendChild(style);
};

const setStatus = (connected: boolean) => {
	if (typeof document === 'undefined' || !document.body)
		return;
	ensureStatusStyle();
	if (connected) {
		if (disconnectedTimer) {
			clearTimeout(disconnectedTimer);
			disconnectedTimer = null;
		}
		document.body.classList.remove(DISCONNECTED_CLASS);
	}
	else if (!disconnectedTimer && !document.body.classList.contains(DISCONNECTED_CLASS)) {
		// Grace period — brief blips shouldn't flash the desaturated state.
		disconnectedTimer = setTimeout(() => {
			disconnectedTimer = null;
			document.body.classList.add(DISCONNECTED_CLASS);
		}, DISCONNECT_GRACE_MS);
	}
};

interface HandlerEntry {
	method: string;
	cb: (...args: any[]) => void;
}

function createWidgetSocket(widgetId: string): WidgetConnection {
	const state = reactive({
		connection: null as HubConnection | null,
		isConnected: false,
	});

	const RETRY_MS = 60_000;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;

	// Caller-registered handlers. Persisted across reconnects so a fresh
	// HubConnection (built each time we reconnect) still has the listeners
	// the consuming component attached on initial mount.
	const handlers: HandlerEntry[] = [];

	const scheduleRetry = () => {
		if (retryTimer)
			return;
		retryTimer = setTimeout(() => {
			retryTimer = null;
			connect();
		}, RETRY_MS);
	};

	const connect = async () => {
		if (state.connection?.state === 'Connected') {
			return;
		}

		try {
			state.connection = new HubConnectionBuilder()
				.withUrl(`/hubs/widgets?widgetId=${widgetId}`)
				.configureLogging(LogLevel.Information)
				.build();

			// Re-attach all caller-registered handlers BEFORE start, so the very
			// first event (typically the on-join state push from the server) is
			// observed even on a reconnect.
			for (const h of handlers)
				state.connection.on(h.method, h.cb);

			// Bot is local with no rate limit — a steady 60s reconnect on close is fine.
			// Skipping withAutomaticReconnect so we control cadence ourselves; onclose
			// fires on every drop, including the initial-failure path.
			state.connection.on('ServerShutdown', () => {
				console.log('Server is shutting down - marking as disconnected');
				state.isConnected = false;
				setStatus(false);
			});

			state.connection.onclose((error) => {
				console.log('Widget socket disconnected:', error);
				state.isConnected = false;
				setStatus(false);
				scheduleRetry();
			});

			await state.connection.start();
			await state.connection.invoke('JoinWidgetGroup', widgetId);
			state.isConnected = true;
			setStatus(true);
		}
		catch (error) {
			console.error(`Failed to connect to widget socket, retrying in ${RETRY_MS / 1000}s:`, error);
			state.isConnected = false;
			setStatus(false);
			scheduleRetry();
		}
	};

	const disconnect = async () => {
		if (retryTimer) {
			clearTimeout(retryTimer);
			retryTimer = null;
		}
		if (state.connection) {
			// Leave widget group before disconnecting
			try {
				await state.connection.invoke('LeaveWidgetGroup', widgetId);
			}
			catch (error) {
				console.warn('Failed to leave widget group:', error);
			}

			await state.connection.stop();
		}
		state.connection = null;
		state.isConnected = false;
	};

	const on = (methodName: string, callback: (...args: any[]) => void) => {
		handlers.push({ method: methodName, cb: callback });
		state.connection?.on(methodName, callback);
	};

	const off = (methodName: string, callback?: (...args: any[]) => void) => {
		if (callback) {
			const idx = handlers.findIndex(h => h.method === methodName && h.cb === callback);
			if (idx >= 0)
				handlers.splice(idx, 1);
			state.connection?.off(methodName, callback);
		}
		else {
			for (let i = handlers.length - 1; i >= 0; i--) {
				if (handlers[i].method === methodName)
					handlers.splice(i, 1);
			}
			state.connection?.off(methodName);
		}
	};

	const invoke = async (methodName: string, ...args: any[]) => {
		if (state.connection?.state === 'Connected') {
			return await state.connection.invoke(methodName, ...args);
		}
		throw new Error('Connection not established');
	};

	// Auto cleanup on component unmount
	onUnmounted(() => {
		disconnect().then();
	});

	return <WidgetConnection>{
		state,
		connect,
		disconnect,
		on,
		off,
		invoke,
	};
}

export function useWidgetSocket(widgetId: string) {
	if (!widgetSocketInstances[widgetId]) {
		widgetSocketInstances[widgetId] = createWidgetSocket(widgetId);
	}
	return widgetSocketInstances[widgetId];
}
