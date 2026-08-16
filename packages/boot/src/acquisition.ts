import {
  createArtifactLease,
  parseArtifact,
  type ArtifactLease,
  type ArtifactSource,
  type ConnectionSnapshot,
  type JsonValue,
  type Session,
} from '@floegence/flowersec-core';
import type { ConnectionControllerOptions, SessionOptions } from '@floegence/flowersec-core/browser';
import { assertProxyRuntimeScope, type ProxyRuntimeScope } from '@floegence/flowersec-core/proxy';

const DIGEST_BYTES = 32;
const MAX_ISOLATED_FRAGMENT_BYTES = 16_384;
const HANDOFF_PREFIX = '#redeven=';

export type CriticalScopeProjectionV1 = Readonly<{
  scope: 'proxy.runtime';
  scope_version: 2;
  critical: true;
  payload: JsonValue;
}>;

export type SpendScopeV1 = Readonly<{
  v: 1;
  receipt: string;
  artifact_digest_b64u: string;
  projection_digest_b64u: string;
  launcher_origin: string;
  runtime_origin: string;
  app_origin: string;
  consumer: 'trusted' | 'isolated';
  target_binding: JsonValue;
  expires_at: string;
}>;

export type SerializedAcquisitionEnvelopeV1 = Readonly<{
  v: 1;
  connect_artifact: string;
  critical_scope_projection_json: string;
  spend_scope: SpendScopeV1;
}>;

export type RuntimeBootInitPayloadV6 = Readonly<{
  v: 6;
  env_public_id: string;
  floe_app: string;
  code_space_id: string;
  app_path: string;
  launcher_kind: 'cs' | 'pf';
  launcher_id: string;
  launcher_origin: string;
  runtime_origin: string;
  app_origin: string;
  acquisition: SerializedAcquisitionEnvelopeV1;
}>;

export type SpendBindingView = Readonly<{
  artifactDigestB64u: string;
  projectionDigestB64u: string;
  launcherOrigin: string;
  runtimeOrigin: string;
  appOrigin: string;
  consumer: 'trusted' | 'isolated';
  targetBinding: JsonValue;
  expiresAt: string;
}>;

export type SpendCommitRequest = SpendBindingView & Readonly<{
  attemptId: string;
  receipt: string;
}>;

export type CommitSpend = (request: SpendCommitRequest, signal?: AbortSignal) => Promise<void>;

export type ValidateSpendBinding = (binding: SpendBindingView) => string | void;

export class AcquisitionError extends Error {
  constructor(readonly code: string) {
    super(`Floe acquisition failed (code=${code})`);
    this.name = 'AcquisitionError';
  }
}

export class ConnectedAcquisition {
  readonly #connectedAcquisitionBrand = undefined;

  private constructor() {
    Object.freeze(this);
  }

  static create(): ConnectedAcquisition {
    return new ConnectedAcquisition();
  }

  static assertAuthentic(value: ConnectedAcquisition): void {
    void value.#connectedAcquisitionBrand;
  }
}

export class IsolatedOneShotAcquisition {
  readonly #isolatedOneShotAcquisitionBrand = undefined;

  private constructor() {
    Object.freeze(this);
  }

  static create(): IsolatedOneShotAcquisition {
    return new IsolatedOneShotAcquisition();
  }

  static assertAuthentic(value: IsolatedOneShotAcquisition): void {
    void value.#isolatedOneShotAcquisitionBrand;
  }
}

type PendingAcquisition = {
  readonly lease: ArtifactLease;
  readonly scope: ProxyRuntimeScope;
  readonly bindingIdentity: string;
  committed: boolean;
};

type AcquisitionSourceState = {
  pending: PendingAcquisition[];
  connected?: ConnectedAcquisition;
  connectedSession?: Session;
};

export type ConnectedAcquisitionDetails = Readonly<{
  session: Session;
  scope: ProxyRuntimeScope;
  bindingIdentity: string;
  attempt: number;
}>;

type IsolatedOneShotState = {
  readonly pending: PendingAcquisition;
  state: 'ready' | 'connecting' | 'consumed';
};

const acquisitionSources = new WeakMap<ArtifactSource, AcquisitionSourceState>();
const connectedAcquisitions = new WeakMap<ConnectedAcquisition, ConnectedAcquisitionDetails>();
const isolatedAcquisitions = new WeakMap<IsolatedOneShotAcquisition, IsolatedOneShotState>();
const consumedHandoffDigests = new Set<string>();

type MaterializeOptions = Readonly<{
  commitSpend: CommitSpend;
  validateSpendBinding: ValidateSpendBinding;
  expectedConsumer: 'trusted' | 'isolated';
}>;

type ValidatedAcquisition = Readonly<{
  artifact: ReturnType<typeof parseArtifact>;
  scope: ProxyRuntimeScope;
  binding: SpendBindingView;
  bindingIdentity: string;
  receipt: string;
}>;

export function registerAcquisitionSource(source: ArtifactSource): void {
  if (acquisitionSources.has(source)) throw new AcquisitionError('duplicate_acquisition_source');
  acquisitionSources.set(source, { pending: [] });
}

export async function materializeAcquisitionForSource(
  source: ArtifactSource,
  value: unknown,
  options: MaterializeOptions,
): Promise<ArtifactLease> {
  const state = acquisitionSources.get(source);
  if (state === undefined) throw new AcquisitionError('invalid_acquisition_source');
  const validated = await validateAcquisitionEnvelope(value, options);
  return materializeLease(validated, options.commitSpend, (pending) => {
    state.pending.push(pending);
  }, (pending) => {
    state.pending = state.pending.filter((candidate) => candidate !== pending);
  });
}

export function synchronizeAcquisitionSourceSnapshot(
  source: ArtifactSource,
  snapshot: ConnectionSnapshot,
): ConnectedAcquisition | null {
  const state = acquisitionSources.get(source);
  if (state === undefined) return null;

  if (snapshot.state !== 'connected' || snapshot.currentSession === undefined) {
    if (snapshot.state === 'idle' || snapshot.state === 'waiting' || snapshot.state === 'failed' || snapshot.state === 'closed') {
      state.pending = [];
      state.connected = undefined;
      state.connectedSession = undefined;
    }
    return null;
  }

  if (state.connected !== undefined && state.connectedSession === snapshot.currentSession) return state.connected;

  const committed = state.pending.filter((candidate) => candidate.committed);
  if (committed.length !== 1 || state.pending.length !== 1) {
    state.pending = [];
    throw new AcquisitionError('connected_acquisition_mismatch');
  }
  const pending = committed[0];
  if (pending === undefined) throw new AcquisitionError('connected_acquisition_mismatch');

  const connected = ConnectedAcquisition.create();
  connectedAcquisitions.set(connected, Object.freeze({
    session: snapshot.currentSession,
    scope: pending.scope,
    bindingIdentity: pending.bindingIdentity,
    attempt: snapshot.attempt,
  }));
  state.pending = [];
  state.connected = connected;
  state.connectedSession = snapshot.currentSession;
  return connected;
}

export function clearAcquisitionSource(source: ArtifactSource): void {
  const state = acquisitionSources.get(source);
  if (state === undefined) return;
  state.pending = [];
  state.connected = undefined;
  state.connectedSession = undefined;
}

export function connectedAcquisitionDetails(acquisition: ConnectedAcquisition): ConnectedAcquisitionDetails {
  ConnectedAcquisition.assertAuthentic(acquisition);
  const details = connectedAcquisitions.get(acquisition);
  if (details === undefined) throw new AcquisitionError('invalid_connected_acquisition');
  return details;
}

export type IsolatedHandoffValidationContext = Readonly<{
  envPublicId: string;
  floeApp: string;
  codeSpaceId: string;
  appPath: string;
  launcherKind: 'cs' | 'pf';
  launcherId: string;
  launcherOrigin: string;
  runtimeOrigin: string;
  appOrigin: string;
  validateTargetBinding: (targetBinding: JsonValue) => void;
}>;

export type MaterializeIsolatedOneShotOptions = Readonly<{
  rawHandoff: string;
  clearSensitiveLocation: () => boolean;
  navigateToLauncher: () => void;
  validationContext: IsolatedHandoffValidationContext;
  commitSpend: CommitSpend;
}>;

export async function materializeIsolatedOneShot(
  options: MaterializeIsolatedOneShotOptions,
): Promise<IsolatedOneShotAcquisition> {
  const rawHandoff = options.rawHandoff;
  const oversized = typeof rawHandoff !== 'string' || byteLength(`${HANDOFF_PREFIX}${rawHandoff}`) > MAX_ISOLATED_FRAGMENT_BYTES;
  let cleared = false;
  try {
    cleared = options.clearSensitiveLocation() === true;
  } catch {
    cleared = false;
  }
  if (!cleared) {
    options.navigateToLauncher();
    throw new AcquisitionError('isolated_location_clear_failed');
  }
  if (oversized) throw new AcquisitionError('isolated_handoff_too_large');

  const rawBytes = decodeCanonicalBase64Url(rawHandoff, 'invalid_isolated_handoff');
  const handoffDigest = await sha256Base64Url(rawBytes);
  if (consumedHandoffDigests.has(handoffDigest)) throw new AcquisitionError('isolated_handoff_consumed');
  consumedHandoffDigests.add(handoffDigest);

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBytes)) as unknown;
  } catch {
    throw new AcquisitionError('invalid_isolated_handoff');
  }
  const payload = validateRuntimeBootPayload(value, options.validationContext);
  const validated = await validateAcquisitionEnvelope(payload.acquisition, {
    commitSpend: options.commitSpend,
    expectedConsumer: 'isolated',
    validateSpendBinding: (binding) => {
      validateIsolatedCrossBinding(payload, binding, options.validationContext);
      options.validationContext.validateTargetBinding(binding.targetBinding);
      return `${binding.artifactDigestB64u}.${binding.projectionDigestB64u}`;
    },
  });
  if (validated.scope.appBasePath !== payload.app_path) throw new AcquisitionError('isolated_app_path_mismatch');
  if (validated.scope.mode === 'controller_bridge') {
    const origins = validated.scope.controllerBridge.allowedOrigins;
    if (origins.length !== 1 || origins[0] !== payload.app_origin) {
      throw new AcquisitionError('isolated_allowed_origins_mismatch');
    }
  }

  let pending!: PendingAcquisition;
  const lease = materializeLease(validated, options.commitSpend, (created) => {
    pending = created;
  }, () => undefined);
  if (pending === undefined || pending.lease !== lease) throw new AcquisitionError('isolated_materialization_failed');
  const acquisition = IsolatedOneShotAcquisition.create();
  isolatedAcquisitions.set(acquisition, { pending, state: 'ready' });
  return acquisition;
}

export async function connectIsolatedOneShot(
  acquisition: IsolatedOneShotAcquisition,
  options: SessionOptions = {},
): Promise<ConnectedAcquisition> {
  IsolatedOneShotAcquisition.assertAuthentic(acquisition);
  const state = isolatedAcquisitions.get(acquisition);
  if (state === undefined || state.state !== 'ready') throw new AcquisitionError('isolated_acquisition_consumed');
  state.state = 'connecting';
  try {
    const { connect } = await import('@floegence/flowersec-core/browser');
    const session = await connect(state.pending.lease, options);
    if (!state.pending.committed) {
      await session.close().catch(() => undefined);
      throw new AcquisitionError('isolated_spend_not_committed');
    }
    const connected = ConnectedAcquisition.create();
    connectedAcquisitions.set(connected, Object.freeze({
      session,
      scope: state.pending.scope,
      bindingIdentity: state.pending.bindingIdentity,
      attempt: 1,
    }));
    state.state = 'consumed';
    return connected;
  } catch (error) {
    state.state = 'consumed';
    throw error;
  }
}

export type BrowserControllerOptions = ConnectionControllerOptions;

async function validateAcquisitionEnvelope(value: unknown, options: MaterializeOptions): Promise<ValidatedAcquisition> {
  const envelope = exactRecord(value, ['v', 'connect_artifact', 'critical_scope_projection_json', 'spend_scope'], 'invalid_acquisition_envelope');
  if (envelope.v !== 1 || typeof envelope.connect_artifact !== 'string' || envelope.connect_artifact.length === 0 ||
      typeof envelope.critical_scope_projection_json !== 'string' || envelope.critical_scope_projection_json.length === 0) {
    throw new AcquisitionError('invalid_acquisition_envelope');
  }
  const spendScope = validateSpendScope(envelope.spend_scope, options.expectedConsumer);
  const artifactBytes = new TextEncoder().encode(envelope.connect_artifact);
  const projectionBytes = new TextEncoder().encode(envelope.critical_scope_projection_json);
  await verifyDigest(artifactBytes, spendScope.artifact_digest_b64u, 'artifact_digest_mismatch');
  await verifyDigest(projectionBytes, spendScope.projection_digest_b64u, 'projection_digest_mismatch');

  let projectionValue: unknown;
  try {
    projectionValue = JSON.parse(envelope.critical_scope_projection_json) as unknown;
  } catch {
    throw new AcquisitionError('invalid_critical_scope_projection');
  }
  const projection = exactRecord(projectionValue, ['scope', 'scope_version', 'critical', 'payload'], 'invalid_critical_scope_projection');
  if (projection.scope !== 'proxy.runtime' || projection.scope_version !== 2 || projection.critical !== true) {
    throw new AcquisitionError('invalid_critical_scope_projection');
  }
  let scope: ProxyRuntimeScope;
  try {
    scope = assertProxyRuntimeScope(projection.payload);
  } catch {
    throw new AcquisitionError('invalid_proxy_runtime_scope');
  }

  let artifact: ReturnType<typeof parseArtifact>;
  try {
    artifact = parseArtifact(envelope.connect_artifact);
  } catch {
    throw new AcquisitionError('invalid_connect_artifact');
  }
  const binding = freezeBindingView(spendScope);
  const customBindingIdentity = options.validateSpendBinding(binding);
  if (customBindingIdentity !== undefined && (typeof customBindingIdentity !== 'string' || customBindingIdentity.trim() === '' || customBindingIdentity !== customBindingIdentity.trim())) {
    throw new AcquisitionError('invalid_spend_binding_identity');
  }
  return Object.freeze({
    artifact,
    scope,
    binding,
    bindingIdentity: customBindingIdentity ?? `${binding.artifactDigestB64u}.${binding.projectionDigestB64u}`,
    receipt: spendScope.receipt,
  });
}

function materializeLease(
  validated: ValidatedAcquisition,
  commitSpend: CommitSpend,
  registered: (pending: PendingAcquisition) => void,
  failed: (pending: PendingAcquisition) => void,
): ArtifactLease {
  const artifact = validated.artifact;
  const scope = validated.scope;
  const binding = validated.binding;
  const bindingIdentity = validated.bindingIdentity;
  let receipt: string | undefined = validated.receipt;
  // The callback closes over the record created immediately after the Lease.
  // eslint-disable-next-line prefer-const
  let pending!: PendingAcquisition;
  const lease = createArtifactLease(artifact, async (signal) => {
    const currentReceipt = receipt;
    receipt = undefined;
    if (currentReceipt === undefined) throw new AcquisitionError('spend_binding_consumed');
    const request = Object.freeze({
      ...binding,
      attemptId: randomBase64Url32(),
      receipt: currentReceipt,
    });
    try {
      await commitSpend(request, signal);
      pending.committed = true;
    } catch (error) {
      failed(pending);
      throw error;
    }
  });
  pending = { lease, scope, bindingIdentity, committed: false };
  registered(pending);
  return lease;
}

function validateSpendScope(value: unknown, expectedConsumer: 'trusted' | 'isolated'): SpendScopeV1 {
  const scope = exactRecord(value, [
    'v',
    'receipt',
    'artifact_digest_b64u',
    'projection_digest_b64u',
    'launcher_origin',
    'runtime_origin',
    'app_origin',
    'consumer',
    'target_binding',
    'expires_at',
  ], 'invalid_spend_scope');
  if (scope.v !== 1 || typeof scope.receipt !== 'string' || !validReceipt(scope.receipt) ||
      typeof scope.artifact_digest_b64u !== 'string' || !validDigest(scope.artifact_digest_b64u) ||
      typeof scope.projection_digest_b64u !== 'string' || !validDigest(scope.projection_digest_b64u) ||
      scope.consumer !== expectedConsumer || typeof scope.expires_at !== 'string' || !validRfc3339(scope.expires_at) ||
      !isJsonValue(scope.target_binding)) {
    throw new AcquisitionError('invalid_spend_scope');
  }
  const launcherOrigin = exactOrigin(scope.launcher_origin);
  const runtimeOrigin = exactOrigin(scope.runtime_origin);
  const appOrigin = exactOrigin(scope.app_origin);
  if (Date.parse(scope.expires_at) <= Date.now()) throw new AcquisitionError('expired_spend_scope');
  return Object.freeze({
    v: 1,
    receipt: scope.receipt,
    artifact_digest_b64u: scope.artifact_digest_b64u,
    projection_digest_b64u: scope.projection_digest_b64u,
    launcher_origin: launcherOrigin,
    runtime_origin: runtimeOrigin,
    app_origin: appOrigin,
    consumer: expectedConsumer,
    target_binding: deepFreezeJson(scope.target_binding),
    expires_at: scope.expires_at,
  });
}

function freezeBindingView(scope: SpendScopeV1): SpendBindingView {
  return Object.freeze({
    artifactDigestB64u: scope.artifact_digest_b64u,
    projectionDigestB64u: scope.projection_digest_b64u,
    launcherOrigin: scope.launcher_origin,
    runtimeOrigin: scope.runtime_origin,
    appOrigin: scope.app_origin,
    consumer: scope.consumer,
    targetBinding: scope.target_binding,
    expiresAt: scope.expires_at,
  });
}

function validateRuntimeBootPayload(value: unknown, expected: IsolatedHandoffValidationContext): RuntimeBootInitPayloadV6 {
  const payload = exactRecord(value, [
    'v',
    'env_public_id',
    'floe_app',
    'code_space_id',
    'app_path',
    'launcher_kind',
    'launcher_id',
    'launcher_origin',
    'runtime_origin',
    'app_origin',
    'acquisition',
  ], 'invalid_isolated_handoff');
  if (payload.v !== 6 || payload.env_public_id !== expected.envPublicId || payload.floe_app !== expected.floeApp ||
      payload.code_space_id !== expected.codeSpaceId || payload.app_path !== expected.appPath ||
      payload.launcher_kind !== expected.launcherKind || payload.launcher_id !== expected.launcherId ||
      payload.launcher_origin !== expected.launcherOrigin || payload.runtime_origin !== expected.runtimeOrigin ||
      payload.app_origin !== expected.appOrigin) {
    throw new AcquisitionError('isolated_context_mismatch');
  }
  exactOrigin(payload.launcher_origin);
  exactOrigin(payload.runtime_origin);
  exactOrigin(payload.app_origin);
  return payload as unknown as RuntimeBootInitPayloadV6;
}

function validateIsolatedCrossBinding(
  payload: RuntimeBootInitPayloadV6,
  binding: SpendBindingView,
  expected: IsolatedHandoffValidationContext,
): void {
  if (binding.consumer !== 'isolated' || binding.launcherOrigin !== payload.launcher_origin ||
      binding.runtimeOrigin !== payload.runtime_origin || binding.appOrigin !== payload.app_origin ||
      payload.runtime_origin !== expected.runtimeOrigin || payload.app_origin !== expected.appOrigin) {
    throw new AcquisitionError('isolated_spend_binding_mismatch');
  }
}

function exactRecord(value: unknown, keys: readonly string[], code: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new AcquisitionError(code);
  const record = value as Record<string, unknown>;
  const expected = new Set(keys);
  const actual = Object.keys(record);
  if (actual.length !== keys.length || actual.some((key) => !expected.has(key))) throw new AcquisitionError(code);
  return record;
}

function exactOrigin(value: unknown): string {
  if (typeof value !== 'string') throw new AcquisitionError('invalid_spend_scope');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AcquisitionError('invalid_spend_scope');
  }
  if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== value ||
      parsed.username !== '' || parsed.password !== '') {
    throw new AcquisitionError('invalid_spend_scope');
  }
  return value;
}

function validReceipt(value: string): boolean {
  const match = /^r1\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]+)$/u.exec(value);
  if (match === null || match[2] === undefined) return false;
  try {
    return decodeCanonicalBase64Url(match[2], 'invalid_spend_scope').length === DIGEST_BYTES;
  } catch {
    return false;
  }
}

function validDigest(value: string): boolean {
  try {
    return decodeCanonicalBase64Url(value, 'invalid_spend_scope').length === DIGEST_BYTES;
  } catch {
    return false;
  }
}

function validRfc3339(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry, depth + 1));
  if (typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every((entry) => isJsonValue(entry, depth + 1));
}

function deepFreezeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    for (const item of value) deepFreezeJson(item);
    return Object.freeze(value);
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) deepFreezeJson(item);
    return Object.freeze(value);
  }
  return value;
}

async function verifyDigest(bytes: Uint8Array, expected: string, code: string): Promise<void> {
  const actual = await sha256(bytes);
  const expectedBytes = decodeCanonicalBase64Url(expected, code);
  if (actual.length !== expectedBytes.length) throw new AcquisitionError(code);
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index]! ^ expectedBytes[index]!;
  if (mismatch !== 0) throw new AcquisitionError(code);
}

async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
  return encodeBase64Url(await sha256(bytes));
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  if (globalThis.crypto?.subtle === undefined) throw new AcquisitionError('acquisition_crypto_unavailable');
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return new Uint8Array(digest);
}

function randomBase64Url32(): string {
  if (globalThis.crypto?.getRandomValues === undefined) throw new AcquisitionError('acquisition_entropy_unavailable');
  return encodeBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(DIGEST_BYTES)));
}

function decodeCanonicalBase64Url(value: string, code: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) throw new AcquisitionError(code);
  const padded = value.replace(/-/gu, '+').replace(/_/gu, '/') + '='.repeat((4 - value.length % 4) % 4);
  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    throw new AcquisitionError(code);
  }
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  if (encodeBase64Url(bytes) !== value) throw new AcquisitionError(code);
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
