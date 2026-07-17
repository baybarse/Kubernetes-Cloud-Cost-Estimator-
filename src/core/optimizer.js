// ─── K8s Optimizer ────────────────────────────────────────────────────────────
import { SEVERITY } from '../utils/constants.js';

/**
 * Analyze workloads and generate optimization suggestions.
 * Returns { suggestions: [...], healthScore: number }
 */
export function analyzeWorkloads(workloads) {
  const suggestions = [];

  for (const workload of workloads) {
    // 1. No resource requests
    if (!workload.hasResourceRequests) {
      suggestions.push({
        severity: 'critical',
        title: `No resource requests defined`,
        workload: workload.name,
        kind: workload.kind,
        description: `"${workload.name}" (${workload.kind}) has no CPU/Memory requests. This means Kubernetes cannot properly schedule pods and may lead to resource contention. Always define resource requests for production workloads.`,
        action: 'Add resources.requests.cpu and resources.requests.memory to all containers.',
        costImpact: 'Cannot accurately estimate costs without resource requests.',
      });
    }

    // 2. No resource limits
    if (!workload.hasResourceLimits) {
      suggestions.push({
        severity: 'warning',
        title: `No resource limits defined`,
        workload: workload.name,
        kind: workload.kind,
        description: `"${workload.name}" has no CPU/Memory limits. Pods may consume unbounded resources, potentially affecting other workloads on the same node.`,
        action: 'Add resources.limits.cpu and resources.limits.memory to all containers.',
        costImpact: 'Risk of unexpected cost increases due to unbounded resource usage.',
      });
    }

    // 3. Overprovisioning check (limits >> requests)
    if (workload.hasResourceRequests && workload.hasResourceLimits) {
      const cpuRatio = workload.totalCPULimits / (workload.totalCPURequests || 1);
      const memRatio = workload.totalMemoryLimits / (workload.totalMemoryRequests || 1);

      if (cpuRatio > 3) {
        suggestions.push({
          severity: 'warning',
          title: `CPU over-provisioned (${cpuRatio.toFixed(1)}x ratio)`,
          workload: workload.name,
          kind: workload.kind,
          description: `CPU limits are ${cpuRatio.toFixed(1)}x higher than requests. This means you're reserving significantly more CPU than needed, which may waste cluster resources.`,
          action: `Consider reducing CPU limits closer to requests, or increasing requests if actual usage is high.`,
          costImpact: `Potential ${Math.round((1 - 1/cpuRatio) * 100)}% CPU cost reduction.`,
        });
      }

      if (memRatio > 3) {
        suggestions.push({
          severity: 'warning',
          title: `Memory over-provisioned (${memRatio.toFixed(1)}x ratio)`,
          workload: workload.name,
          kind: workload.kind,
          description: `Memory limits are ${memRatio.toFixed(1)}x higher than requests. Consider aligning limits closer to actual usage.`,
          action: 'Monitor actual memory usage and right-size the limits.',
          costImpact: `Potential ${Math.round((1 - 1/memRatio) * 100)}% memory cost reduction.`,
        });
      }
    }

    // 4. Memory QoS — requests != limits
    for (const container of workload.containers) {
      if (container.requests.memory > 0 && container.limits.memory > 0
          && container.requests.memory !== container.limits.memory) {
        suggestions.push({
          severity: 'info',
          title: `Memory QoS: Burstable class for "${container.name}"`,
          workload: workload.name,
          kind: workload.kind,
          description: `Container "${container.name}" has different memory requests and limits, placing it in the Burstable QoS class. For critical workloads, set requests equal to limits for Guaranteed QoS.`,
          action: 'Set memory requests equal to limits for Guaranteed QoS class.',
        });
        break; // One per workload
      }
    }

    // 5. High CPU request per container
    for (const container of workload.containers) {
      if (container.requests.cpu > 4) {
        suggestions.push({
          severity: 'info',
          title: `High CPU request: ${container.requests.cpu} vCPU for "${container.name}"`,
          workload: workload.name,
          kind: workload.kind,
          description: `Container "${container.name}" requests ${container.requests.cpu} vCPUs. Consider splitting into multiple smaller containers or using horizontal scaling.`,
          action: 'Review if the workload can be horizontally scaled with smaller resource requirements.',
        });
      }
    }

    // 6. Single replica (SPOF)
    if (workload.replicas === 1 && ['Deployment', 'StatefulSet'].includes(workload.kind)) {
      suggestions.push({
        severity: 'warning',
        title: `Single replica — Single Point of Failure`,
        workload: workload.name,
        kind: workload.kind,
        description: `"${workload.name}" runs with only 1 replica. Any pod disruption will cause downtime. Consider running at least 2 replicas for production workloads.`,
        action: 'Increase replicas to at least 2 for high availability.',
        costImpact: 'Adding 1 replica will approximately double the cost for this workload.',
      });
    }

    // 7. No liveness/readiness probes
    if (!workload.hasLivenessProbe && !workload.hasReadinessProbe) {
      suggestions.push({
        severity: 'warning',
        title: `No health probes defined`,
        workload: workload.name,
        kind: workload.kind,
        description: `"${workload.name}" has no liveness or readiness probes. Kubernetes cannot detect unhealthy pods, leading to potential availability issues.`,
        action: 'Add livenessProbe and readinessProbe to containers.',
      });
    }

    // 8. Uses :latest tag
    if (workload.usesLatestTag) {
      suggestions.push({
        severity: 'warning',
        title: `Using :latest or untagged image`,
        workload: workload.name,
        kind: workload.kind,
        description: `One or more containers use the :latest tag or no tag. This makes deployments non-reproducible and can cause unexpected behavior.`,
        action: 'Pin container images to specific versions (e.g., nginx:1.25.3).',
      });
    }

    // 9. No namespace defined
    if (!workload.hasNamespace) {
      suggestions.push({
        severity: 'info',
        title: `No namespace specified`,
        workload: workload.name,
        kind: workload.kind,
        description: `"${workload.name}" does not specify a namespace. It will be deployed to the "default" namespace. Use namespaces for better resource organization.`,
        action: 'Add metadata.namespace to organize resources.',
      });
    }
  }

  // 10. Global: Pod Disruption Budget (if multiple replicas exist)
  const multiReplicaWorkloads = workloads.filter(w => w.replicas > 1);
  if (multiReplicaWorkloads.length > 0) {
    suggestions.push({
      severity: 'info',
      title: `Consider adding PodDisruptionBudget`,
      workload: 'global',
      kind: '',
      description: `You have ${multiReplicaWorkloads.length} workload(s) with multiple replicas. Adding PodDisruptionBudgets ensures controlled pod eviction during node maintenance.`,
      action: 'Create PodDisruptionBudget resources with minAvailable or maxUnavailable.',
    });
  }

  // Calculate health score (0-10)
  const healthScore = calculateHealthScore(suggestions);

  return { suggestions, healthScore };
}

/**
 * Calculate a health score from 0-10 based on suggestion severity.
 */
function calculateHealthScore(suggestions) {
  if (suggestions.length === 0) return 10;

  let deductions = 0;
  for (const s of suggestions) {
    switch (s.severity) {
      case 'critical': deductions += 2.5; break;
      case 'warning': deductions += 1.0; break;
      case 'info': deductions += 0.3; break;
    }
  }

  return Math.max(0, Math.round((10 - deductions) * 10) / 10);
}
