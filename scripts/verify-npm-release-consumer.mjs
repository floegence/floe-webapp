#!/usr/bin/env node

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageNames = [
  '@floegence/floe-webapp-core',
  '@floegence/floe-webapp-boot',
  '@floegence/floe-webapp-protocol',
  '@floegence/floe-webapp-init',
];
const version = JSON.parse(readFileSync('packages/core/package.json', 'utf8')).version;
const root = mkdtempSync(join(tmpdir(), 'floe-webapp-release-consumer-'));
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'floe-webapp-release-consumer', private: true }, null, 2));
execFileSync('npm', [
  'install', '--prefix', root, '--no-audit', '--no-fund', '--ignore-scripts',
  ...packageNames.map((name) => `${name}@${version}`),
], { stdio: 'inherit' });

execFileSync(process.execPath, ['--input-type=module', '-e', [
  `await import('${packageNames[0]}')`,
  `await import('${packageNames[1]}')`,
  `await import('${packageNames[2]}')`,
].join(';')], { cwd: root, stdio: 'inherit' });

execFileSync('node', [join(root, 'node_modules', '.bin', 'floe-webapp-init'), '--help'], { cwd: root, stdio: 'inherit' });

await verifyBootProtocolConsumer();

const coreManifests = [];
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path);
    else if (entry === 'package.json' && path.endsWith(join('@floegence', 'flowersec-core', 'package.json'))) coreManifests.push(path);
  }
}
walk(join(root, 'node_modules'));
if (coreManifests.length !== 1) throw new Error(`expected one Flowersec core package, found ${coreManifests.length}`);
const flowersecManifest = JSON.parse(readFileSync(coreManifests[0], 'utf8'));
if (flowersecManifest.version !== '2.5.1') throw new Error(`expected Flowersec 2.5.1, found ${flowersecManifest.version}`);
console.log(`verified clean consumer ${version} with one Flowersec core ${flowersecManifest.version}`);

async function verifyBootProtocolConsumer() {
  const {
    createAcceptor,
    authorizeRuntime,
    createEndpointSet,
    Issuer,
  } = await import('@floegence/flowersec-core/node');
  const { createControlplaneArtifactSource, createArtifactDirectConnectionConfig } =
    await import('@floegence/floe-webapp-boot');
  const { ProtocolProvider, useProtocol } = await import('@floegence/floe-webapp-protocol');
  const { createComponent, createRoot } = await import('solid-js');

  const require = createRequire(import.meta.url);
  const wsModule = require('ws');
  const NativeWebSocket = wsModule.WebSocket ?? wsModule;
  const previousWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = class ConsumerWebSocket extends NativeWebSocket {
    constructor(url, protocol) {
      super(url, protocol, { headers: { Origin: 'http://127.0.0.1' } });
    }
  };

  let authorizationRecord;
  let acceptor;
  let accepted;
  let dispose;
  let protocol;
  let spendCount = 0;
  try {
    acceptor = await createAcceptor({
      listeners: [{
        carrier: 'websocket',
        path: 'direct',
        host: '127.0.0.1',
        port: 0,
        allowedOrigins: ['http://127.0.0.1'],
      }],
      maxInboundStreams: 8,
      authorize: async (request) => {
        if (authorizationRecord === undefined) return { decision: 'reject', reason: 'not_ready' };
        return authorizeRuntime(request, authorizationRecord, 'floe-release-smoke');
      },
    });
    const address = acceptor.addresses()[0];
    if (address === undefined) throw new Error('Flowersec smoke listener did not bind');
    const issued = new Issuer().issueDirect({
      session: { channelId: 'floe-release-smoke', maxInboundStreams: 8 },
      endpoints: createEndpointSet(`ws://127.0.0.1:${address.port}/flowersec/v2/direct`),
      rendezvousGroupId: 'floe-release-smoke-group',
      listenerAudience: 'floe-release-smoke-listener',
      upstreamAddress: '127.0.0.1:9000',
    });
    authorizationRecord = issued.authorizationRecord();

    const artifact = new globalThis.TextDecoder().decode(issued.artifactJSON());
    const projection = JSON.stringify({
      scope: 'proxy.runtime',
      scope_version: 2,
      critical: true,
      payload: {
        mode: 'controller_bridge',
        controllerBridge: { allowedOrigins: ['http://127.0.0.1'] },
      },
    });
    const artifactDigestB64u = await digest(artifact);
    const projectionDigestB64u = await digest(projection);
    const receiptDigest = await digest(`receipt:${artifactDigestB64u}`);
    const envelope = {
      v: 1,
      connect_artifact: artifact,
      critical_scope_projection_json: projection,
      spend_scope: {
        v: 1,
        receipt: `r1.floe-release.${receiptDigest}`,
        artifact_digest_b64u: artifactDigestB64u,
        projection_digest_b64u: projectionDigestB64u,
        launcher_origin: 'https://launcher.example.com',
        runtime_origin: 'https://runtime.example.com',
        app_origin: 'http://127.0.0.1',
        consumer: 'trusted',
        target_binding: { smoke: true },
        expires_at: '2099-01-01T00:00:00Z',
      },
    };
    const source = createControlplaneArtifactSource({
      baseUrl: 'https://controlplane.example.com',
      endpointId: 'floe-release-smoke',
      fetch: async () => new globalThis.Response(JSON.stringify(envelope), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      validateSpendBinding: (binding) => `${binding.artifactDigestB64u}.${binding.projectionDigestB64u}`,
      commitSpend: async () => {
        spendCount += 1;
      },
    });
    const connection = createArtifactDirectConnectionConfig({
      source,
      controller: { maximumAttempts: 1, connectTimeoutMs: 5_000 },
    });

    const contract = { id: 'floe-release-smoke', createRpc: () => ({}) };
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, {
        contract,
        get children() {
          return createComponent(() => {
            protocol = useProtocol();
            return null;
          }, {});
        },
      });
    });
    accepted = acceptor.accept();
    await protocol.connect(connection);
    const acceptedSession = await accepted;
    if (spendCount !== 1) throw new Error(`expected one durable spend, found ${spendCount}`);
    protocol.disconnect();
    await acceptedSession.close();
    console.log('verified Boot -> Protocol -> browser Flowersec consumer smoke');
  } finally {
    dispose?.();
    if (acceptor !== undefined) await acceptor.close().catch(() => undefined);
    globalThis.WebSocket = previousWebSocket;
  }
}

async function digest(value) {
  const bytes = new globalThis.TextEncoder().encode(value);
  const digestBytes = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  let binary = '';
  for (const byte of digestBytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}
