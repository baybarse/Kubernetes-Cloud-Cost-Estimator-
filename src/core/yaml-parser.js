// ─── K8s YAML Parser ─────────────────────────────────────────────────────────
import jsYaml from 'js-yaml';
import { parseCPU, parseMemory } from '../utils/formatters.js';
import { K8S_WORKLOAD_KINDS } from '../utils/constants.js';

/**
 * Parse a YAML string containing one or more K8s manifests.
 * Returns an array of parsed workload objects.
 */
export function parseYAML(yamlString) {
  if (!yamlString || !yamlString.trim()) {
    return { workloads: [], errors: [] };
  }

  const workloads = [];
  const errors = [];

  try {
    const documents = jsYaml.loadAll(yamlString);

    for (const doc of documents) {
      if (!doc || typeof doc !== 'object') continue;

      try {
        const workload = extractWorkload(doc);
        if (workload) {
          workloads.push(workload);
        }
      } catch (e) {
        errors.push(`Error parsing ${doc?.kind || 'unknown'} "${doc?.metadata?.name || 'unnamed'}": ${e.message}`);
      }
    }
  } catch (e) {
    errors.push(`YAML syntax error: ${e.message}`);
  }

  return { workloads, errors };
}

/**
 * Extract workload information from a parsed K8s document.
 */
function extractWorkload(doc) {
  const kind = doc.kind;
  if (!kind || !K8S_WORKLOAD_KINDS.includes(kind)) {
    return null;
  }

  const metadata = doc.metadata || {};
  const spec = doc.spec || {};

  const workload = {
    kind,
    name: metadata.name || 'unnamed',
    namespace: metadata.namespace || 'default',
    labels: metadata.labels || {},
    replicas: getReplicas(kind, spec),
    containers: [],
    initContainers: [],
    totalCPURequests: 0,
    totalMemoryRequests: 0,
    totalCPULimits: 0,
    totalMemoryLimits: 0,
    hasResourceRequests: false,
    hasResourceLimits: false,
    hasLivenessProbe: false,
    hasReadinessProbe: false,
    usesLatestTag: false,
    hasNamespace: !!metadata.namespace,
    raw: doc,
  };

  // Get pod template spec
  const podSpec = getPodSpec(kind, spec);
  if (!podSpec) return workload;

  // Parse containers
  if (podSpec.containers) {
    for (const container of podSpec.containers) {
      const parsed = parseContainer(container);
      workload.containers.push(parsed);

      if (parsed.requests.cpu > 0 || parsed.requests.memory > 0) {
        workload.hasResourceRequests = true;
      }
      if (parsed.limits.cpu > 0 || parsed.limits.memory > 0) {
        workload.hasResourceLimits = true;
      }
      if (parsed.hasLivenessProbe) workload.hasLivenessProbe = true;
      if (parsed.hasReadinessProbe) workload.hasReadinessProbe = true;
      if (parsed.usesLatestTag) workload.usesLatestTag = true;
    }
  }

  // Parse init containers
  if (podSpec.initContainers) {
    for (const container of podSpec.initContainers) {
      workload.initContainers.push(parseContainer(container));
    }
  }

  // Compute totals (per replica)
  for (const c of workload.containers) {
    workload.totalCPURequests += c.requests.cpu;
    workload.totalMemoryRequests += c.requests.memory;
    workload.totalCPULimits += c.limits.cpu;
    workload.totalMemoryLimits += c.limits.memory;
  }

  return workload;
}

/**
 * Get the replica count based on workload kind.
 */
function getReplicas(kind, spec) {
  switch (kind) {
    case 'Deployment':
    case 'StatefulSet':
    case 'ReplicaSet':
      return spec.replicas ?? 1;
    case 'DaemonSet':
      return -1; // Special: depends on node count
    case 'Job':
      return spec.parallelism ?? spec.completions ?? 1;
    case 'CronJob':
      return spec.jobTemplate?.spec?.parallelism ?? 1;
    case 'Pod':
      return 1;
    default:
      return 1;
  }
}

/**
 * Get the pod spec from different workload kinds.
 */
function getPodSpec(kind, spec) {
  switch (kind) {
    case 'Deployment':
    case 'StatefulSet':
    case 'DaemonSet':
    case 'ReplicaSet':
      return spec.template?.spec;
    case 'Job':
      return spec.template?.spec;
    case 'CronJob':
      return spec.jobTemplate?.spec?.template?.spec;
    case 'Pod':
      return spec;
    default:
      return null;
  }
}

/**
 * Parse a single container spec.
 */
function parseContainer(container) {
  const resources = container.resources || {};
  const requests = resources.requests || {};
  const limits = resources.limits || {};

  return {
    name: container.name || 'unnamed',
    image: container.image || 'unknown',
    requests: {
      cpu: parseCPU(requests.cpu),
      memory: parseMemory(requests.memory),
    },
    limits: {
      cpu: parseCPU(limits.cpu),
      memory: parseMemory(limits.memory),
    },
    hasLivenessProbe: !!container.livenessProbe,
    hasReadinessProbe: !!container.readinessProbe,
    usesLatestTag: checkLatestTag(container.image),
    ports: (container.ports || []).map(p => p.containerPort),
  };
}

/**
 * Check if an image uses the :latest tag or no tag.
 */
function checkLatestTag(image) {
  if (!image) return false;
  if (!image.includes(':')) return true; // no tag = implicit latest
  return image.endsWith(':latest');
}
