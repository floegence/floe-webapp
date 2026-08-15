import {
  createProxyRuntime,
  type ProxyRuntime,
} from '@floegence/flowersec-core/proxy';
import {
  AcquisitionError,
  ConnectedAcquisition,
  connectedAcquisitionDetails,
} from './acquisition';

export type ProxyBootstrapBinding = Readonly<{
  dispose(): void;
}>;

export type ServiceWorkerProxyBootstrapContext = Readonly<{
  runtime: ProxyRuntime;
  generation: number;
  bindingIdentity: string;
  scriptUrl: string;
  serviceWorkerScope: string;
  appBasePath?: string;
}>;

export type ControllerBridgeProxyBootstrapContext = Readonly<{
  runtime: ProxyRuntime;
  generation: number;
  bindingIdentity: string;
  allowedOrigins: readonly string[];
  appBasePath?: string;
  capabilityNonce: string;
}>;

export type ProxyBootstrapOwnerOptions = Readonly<{
  serviceWorker?: (context: ServiceWorkerProxyBootstrapContext) => ProxyBootstrapBinding;
  controllerBridge?: (context: ControllerBridgeProxyBootstrapContext) => ProxyBootstrapBinding;
}>;

export type ProxyBootstrapSnapshot = Readonly<{
  generation: number;
  mode: 'service_worker' | 'controller_bridge';
  bindingIdentity: string;
}>;

export class ProxyBootstrapOwner {
  readonly #proxyBootstrapOwnerBrand = undefined;

  private constructor() {
    Object.freeze(this);
  }

  static create(): ProxyBootstrapOwner {
    return new ProxyBootstrapOwner();
  }

  static assertAuthentic(value: ProxyBootstrapOwner): void {
    void value.#proxyBootstrapOwnerBrand;
  }
}

type ProxyBootstrapOwnerState = {
  readonly options: ProxyBootstrapOwnerOptions;
  generation: number;
  acquisition?: ConnectedAcquisition;
  runtime?: ProxyRuntime;
  binding?: ProxyBootstrapBinding;
  snapshot?: ProxyBootstrapSnapshot;
};

const proxyBootstrapOwners = new WeakMap<ProxyBootstrapOwner, ProxyBootstrapOwnerState>();

export function createProxyBootstrapOwner(options: ProxyBootstrapOwnerOptions): ProxyBootstrapOwner {
  const owner = ProxyBootstrapOwner.create();
  proxyBootstrapOwners.set(owner, { options, generation: 0 });
  return owner;
}

export function synchronizeProxyBootstrap(
  owner: ProxyBootstrapOwner,
  acquisition: ConnectedAcquisition | null,
): ProxyBootstrapSnapshot | null {
  const state = ownerState(owner);
  if (acquisition === null) {
    disposeCurrent(state);
    return null;
  }
  if (state.acquisition === acquisition && state.snapshot !== undefined) return state.snapshot;

  const details = connectedAcquisitionDetails(acquisition);
  disposeCurrent(state);
  const generation = state.generation + 1;
  state.generation = generation;
  const scope = details.scope;
  const runtime = createProxyRuntime({
    session: details.session,
    ...(scope.limits ?? {}),
    ...(scope.appBasePath === undefined
      ? {}
      : { pathPolicy: { allowedPathPrefixes: Object.freeze([scope.appBasePath]) } }),
  });
  try {
    let binding: ProxyBootstrapBinding;
    if (scope.mode === 'service_worker') {
      const adapter = state.options.serviceWorker;
      if (adapter === undefined) throw new AcquisitionError('service_worker_bootstrap_unavailable');
      binding = adapter(Object.freeze({
        runtime,
        generation,
        bindingIdentity: details.bindingIdentity,
        scriptUrl: scope.serviceWorker.scriptUrl,
        serviceWorkerScope: scope.serviceWorker.scope,
        ...(scope.appBasePath === undefined ? {} : { appBasePath: scope.appBasePath }),
      }));
    } else {
      const adapter = state.options.controllerBridge;
      if (adapter === undefined) throw new AcquisitionError('controller_bridge_bootstrap_unavailable');
      binding = adapter(Object.freeze({
        runtime,
        generation,
        bindingIdentity: details.bindingIdentity,
        allowedOrigins: scope.controllerBridge.allowedOrigins,
        ...(scope.appBasePath === undefined ? {} : { appBasePath: scope.appBasePath }),
        capabilityNonce: randomCapabilityNonce(),
      }));
    }
    if (binding === null || typeof binding !== 'object' || typeof binding.dispose !== 'function') {
      throw new AcquisitionError('invalid_proxy_bootstrap_binding');
    }
    const snapshot = Object.freeze({ generation, mode: scope.mode, bindingIdentity: details.bindingIdentity });
    state.acquisition = acquisition;
    state.runtime = runtime;
    state.binding = binding;
    state.snapshot = snapshot;
    return snapshot;
  } catch (error) {
    runtime.dispose();
    throw error;
  }
}

export function closeProxyBootstrap(owner: ProxyBootstrapOwner): void {
  disposeCurrent(ownerState(owner));
}

function ownerState(owner: ProxyBootstrapOwner): ProxyBootstrapOwnerState {
  ProxyBootstrapOwner.assertAuthentic(owner);
  const state = proxyBootstrapOwners.get(owner);
  if (state === undefined) throw new AcquisitionError('invalid_proxy_bootstrap_owner');
  return state;
}

function disposeCurrent(state: ProxyBootstrapOwnerState): void {
  const binding = state.binding;
  const runtime = state.runtime;
  state.acquisition = undefined;
  state.binding = undefined;
  state.runtime = undefined;
  state.snapshot = undefined;
  try {
    binding?.dispose();
  } finally {
    runtime?.dispose();
  }
}

function randomCapabilityNonce(): string {
  if (globalThis.crypto?.getRandomValues === undefined) throw new AcquisitionError('acquisition_entropy_unavailable');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}
