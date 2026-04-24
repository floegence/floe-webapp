/* eslint-disable @typescript-eslint/triple-slash-reference -- ambient Monaco shims must load for direct source consumers. */
/// <reference path="../../monaco-internals.d.ts" />

export interface MonacoRuntimeFeatureSet {
  suggestMemory: boolean;
  codeLensCache: boolean;
  inlayHintsCache: boolean;
  treeViewsDnd: boolean;
  actionWidget: boolean;
}

export type MonacoRuntimeProfileName = 'editor_full' | 'preview_basic';

export interface CodeEditorRuntimeOptions {
  profile?: MonacoRuntimeProfileName;
  standaloneFeatures?: Partial<MonacoRuntimeFeatureSet>;
}

export const DEFAULT_MONACO_STANDALONE_FEATURES: MonacoRuntimeFeatureSet = {
  suggestMemory: true,
  codeLensCache: true,
  inlayHintsCache: true,
  treeViewsDnd: true,
  actionWidget: true,
};

export const DEFAULT_MONACO_RUNTIME_PROFILE: MonacoRuntimeProfileName = 'editor_full';

export interface MonacoStandaloneRuntimeModuleDescriptor {
  id: string;
  load: () => Promise<unknown>;
}

export interface MonacoStandaloneRuntimeBlueprint {
  profile: MonacoRuntimeProfileName;
  modules: readonly MonacoStandaloneRuntimeModuleDescriptor[];
}

export interface ResolvedMonacoRuntimeRequest {
  profile: MonacoRuntimeProfileName;
  cacheKey: string;
  blueprint: MonacoStandaloneRuntimeBlueprint;
}

type MonacoStandaloneRuntimeLoader = (request: ResolvedMonacoRuntimeRequest) => Promise<unknown>;

export function normalizeMonacoRuntimeFeatureSet(
  standaloneFeatures?: Partial<MonacoRuntimeFeatureSet>,
): MonacoRuntimeFeatureSet {
  return {
    ...DEFAULT_MONACO_STANDALONE_FEATURES,
    ...(standaloneFeatures ?? {}),
  };
}

const MONACO_EDITOR_FULL_MODULES: readonly MonacoStandaloneRuntimeModuleDescriptor[] = [
  {
    id: 'editor.main',
    load: () => import('monaco-editor/esm/vs/editor/editor.main.js'),
  },
];

export const MONACO_RUNTIME_BLUEPRINTS: Record<MonacoRuntimeProfileName, MonacoStandaloneRuntimeBlueprint> = {
  editor_full: {
    profile: 'editor_full',
    modules: MONACO_EDITOR_FULL_MODULES,
  },
  preview_basic: {
    profile: 'preview_basic',
    modules: [],
  },
};

function areAllStandaloneFeaturesDisabled(features: MonacoRuntimeFeatureSet): boolean {
  return (
    features.suggestMemory === false
    && features.codeLensCache === false
    && features.inlayHintsCache === false
    && features.treeViewsDnd === false
    && features.actionWidget === false
  );
}

export function resolveMonacoRuntimeProfile(
  options?: CodeEditorRuntimeOptions,
): MonacoRuntimeProfileName {
  if (options?.profile) {
    return options.profile;
  }

  if (!options?.standaloneFeatures) {
    return DEFAULT_MONACO_RUNTIME_PROFILE;
  }

  const features = normalizeMonacoRuntimeFeatureSet(options.standaloneFeatures);
  if (areAllStandaloneFeaturesDisabled(features)) {
    return 'preview_basic';
  }

  return DEFAULT_MONACO_RUNTIME_PROFILE;
}

export function resolveMonacoRuntimeRequest(
  options?: CodeEditorRuntimeOptions,
): ResolvedMonacoRuntimeRequest {
  const profile = resolveMonacoRuntimeProfile(options);
  return {
    profile,
    cacheKey: `profile:${profile}`,
    blueprint: MONACO_RUNTIME_BLUEPRINTS[profile],
  };
}

export function createMonacoStandaloneRuntime(
  loader: MonacoStandaloneRuntimeLoader,
): (options?: CodeEditorRuntimeOptions) => Promise<void> {
  const pendingByKey = new Map<string, Promise<void>>();

  return (options) => {
    const request = resolveMonacoRuntimeRequest(options);
    const pending = pendingByKey.get(request.cacheKey);
    if (pending) return pending;

    const next = loader(request)
      .then(() => undefined)
      .catch((error) => {
        pendingByKey.delete(request.cacheKey);
        throw error;
      });

    pendingByKey.set(request.cacheKey, next);
    return next;
  };
}

function loadMonacoStandaloneRuntime(request: ResolvedMonacoRuntimeRequest): Promise<unknown> {
  return Promise.all(request.blueprint.modules.map((module) => module.load()));
}

export const ensureMonacoStandaloneRuntime = createMonacoStandaloneRuntime(
  loadMonacoStandaloneRuntime,
);
