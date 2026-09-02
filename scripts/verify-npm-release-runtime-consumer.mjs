#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import {
  createArtifactDirectConnectionConfig,
  createControlplaneArtifactSource,
} from '@floegence/floe-webapp-boot';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';
import { createComponent, createRoot } from 'solid-js';

const smokePeerDirectory = resolveSmokePeerDirectory();
const require = createRequire(import.meta.url);
const wsModule = require('ws');
const NativeWebSocket = wsModule.WebSocket ?? wsModule;
const previousWebSocket = globalThis.WebSocket;
let trustedCertificate;
globalThis.WebSocket = class ConsumerWebSocket extends NativeWebSocket {
  constructor(url, protocol) {
    super(url, protocol, {
      ca: trustedCertificate,
      headers: { Origin: 'https://app.example.com' },
    });
  }
};

let dispose;
let peer;
let protocol;
let spendCount = 0;
try {
  peer = startSmokePeer(smokePeerDirectory);
  const ready = await waitForSmokePeerReady(peer);
  trustedCertificate = ready.ca_pem;
  const artifact = ready.artifact;
  const projection = JSON.stringify({
    scope: 'proxy.runtime',
    scope_version: 2,
    critical: true,
    payload: {
      mode: 'controller_bridge',
      controllerBridge: { allowedOrigins: ['https://app.example.com'] },
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
      app_origin: 'https://app.example.com',
      consumer: 'trusted',
      target_binding: { smoke: true },
      expires_at: '2099-01-01T00:00:00Z',
    },
  };
  const source = createControlplaneArtifactSource({
    baseUrl: 'https://controlplane.example.com',
    endpointId: 'floe-release-smoke',
    fetch: async () =>
      new globalThis.Response(JSON.stringify(envelope), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    validateSpendBinding: (binding) =>
      `${binding.artifactDigestB64u}.${binding.projectionDigestB64u}`,
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
  await protocol.connect(connection);
  if (spendCount !== 1) throw new Error(`expected one durable spend, found ${spendCount}`);
  const session = protocol.session();
  if (session === null) throw new Error('Flowersec smoke session was not available');
  await session.close();
  protocol.disconnect();
  await waitForSmokePeerExit(peer);
  console.log('verified Boot -> Protocol -> browser Flowersec consumer smoke');
} finally {
  dispose?.();
  protocol?.disconnect();
  if (peer !== undefined) await stopSmokePeer(peer);
  globalThis.WebSocket = previousWebSocket;
}

function resolveSmokePeerDirectory() {
  const configured = process.env.FLOE_FLOWERSEC_SMOKE_PEER_DIR;
  if (configured === undefined || !isAbsolute(configured)) {
    throw new Error('FLOE_FLOWERSEC_SMOKE_PEER_DIR must be an absolute path');
  }
  const directory = realpathSync(configured);
  if (!statSync(directory).isDirectory())
    throw new Error('Flowersec smoke peer path must be a directory');
  for (const file of ['go.mod', 'go.sum', 'main.go']) {
    if (!existsSync(join(directory, file)))
      throw new Error(`Flowersec smoke peer is missing ${file}`);
  }
  if (existsSync(join(directory, 'go.work')))
    throw new Error('Flowersec smoke peer must not use go.work');
  const module = readFileSync(join(directory, 'go.mod'), 'utf8');
  if (!/^require github\.com\/floegence\/flowersec\/flowersec-go\/v5 v5\.0\.1$/mu.test(module)) {
    throw new Error('Flowersec smoke peer must pin flowersec-go/v5 v5.0.1');
  }
  if (/^replace\s/mu.test(module) || /(?:^|\s)\.\.\//mu.test(module)) {
    throw new Error('Flowersec smoke peer must not use local dependency shortcuts');
  }
  return directory;
}

function startSmokePeer(directory) {
  const child = spawn('go', ['run', '.'], {
    cwd: directory,
    env: { ...process.env, GOWORK: 'off' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-4_096);
  });
  return { child, stderr: () => stderr.trim() };
}

async function waitForSmokePeerReady(peer) {
  const { child } = peer;
  child.stdout.setEncoding('utf8');
  return await new Promise((resolve, reject) => {
    let output = '';
    const timeout = globalThis.setTimeout(
      () => fail('Flowersec smoke peer readiness timed out'),
      60_000
    );
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      child.stdout.off('data', onData);
      child.off('error', onError);
      child.off('exit', onExit);
    };
    const fail = (message) => {
      cleanup();
      reject(new Error(formatPeerFailure(message, peer.stderr())));
    };
    const onError = () => fail('Flowersec smoke peer could not start');
    const onExit = (code, signal) =>
      fail(`Flowersec smoke peer exited before ready (${code ?? signal})`);
    const onData = (chunk) => {
      output += chunk;
      if (output.length > 1_000_000)
        return fail('Flowersec smoke peer ready output exceeded its limit');
      const newline = output.indexOf('\n');
      if (newline === -1) return;
      let ready;
      try {
        ready = JSON.parse(output.slice(0, newline));
      } catch {
        return fail('Flowersec smoke peer returned invalid ready JSON');
      }
      if (
        ready === null ||
        typeof ready !== 'object' ||
        typeof ready.artifact !== 'string' ||
        ready.artifact.length === 0 ||
        typeof ready.ca_pem !== 'string' ||
        ready.ca_pem.length === 0
      ) {
        return fail('Flowersec smoke peer returned an invalid ready contract');
      }
      cleanup();
      resolve(ready);
    };
    child.stdout.on('data', onData);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

async function waitForSmokePeerExit(peer) {
  const { child } = peer;
  if (child.exitCode !== null) {
    if (child.exitCode !== 0) {
      throw new Error(
        formatPeerFailure(`Flowersec smoke peer exited with ${child.exitCode}`, peer.stderr())
      );
    }
    return;
  }
  await new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error('Flowersec smoke peer did not observe session close'));
    }, 10_000);
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      child.off('error', onError);
      child.off('exit', onExit);
    };
    const onError = () => {
      cleanup();
      reject(new Error(formatPeerFailure('Flowersec smoke peer process failed', peer.stderr())));
    };
    const onExit = (code, signal) => {
      cleanup();
      if (code === 0) resolve();
      else
        reject(
          new Error(
            formatPeerFailure(`Flowersec smoke peer exited with ${code ?? signal}`, peer.stderr())
          )
        );
    };
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

async function stopSmokePeer(peer) {
  const { child } = peer;
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timeout = globalThis.setTimeout(resolve, 5_000);
    child.once('exit', () => {
      globalThis.clearTimeout(timeout);
      resolve();
    });
  });
  if (child.exitCode === null) child.kill('SIGKILL');
}

function formatPeerFailure(message, stderr) {
  return stderr === '' ? message : `${message}: ${stderr}`;
}

async function digest(value) {
  const bytes = new globalThis.TextEncoder().encode(value);
  const digestBytes = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  let binary = '';
  for (const byte of digestBytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}
