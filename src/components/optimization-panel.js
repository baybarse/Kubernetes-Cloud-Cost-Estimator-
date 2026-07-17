// ─── Optimization Panel Component ─────────────────────────────────────────────
import { SEVERITY } from '../utils/constants.js';

/**
 * Render optimization suggestions and health score.
 */
export function renderOptimizations(analysis) {
  const container = document.getElementById('optimization-container');
  if (!container) return;

  if (!analysis || analysis.suggestions.length === 0) {
    container.innerHTML = `
      <div class="health-gauge">
        <div>
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:4px;">Health Score</div>
          <div class="health-bar">
            <div class="health-bar-fill" style="width:100%;background:var(--severity-success)"></div>
          </div>
        </div>
        <div class="health-score" style="color:var(--severity-success)">10/10</div>
      </div>
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-icon">🎉</div>
        <div class="empty-title">All checks passed!</div>
        <div class="empty-text">Your manifests follow K8s best practices.</div>
      </div>
    `;
    return;
  }

  const { suggestions, healthScore } = analysis;
  const scoreColor = healthScore >= 7 ? 'var(--severity-success)'
    : healthScore >= 4 ? 'var(--severity-warning)'
    : 'var(--severity-critical)';
  const scorePercent = (healthScore / 10) * 100;

  // Count by severity
  const counts = { critical: 0, warning: 0, info: 0 };
  suggestions.forEach(s => counts[s.severity]++);

  container.innerHTML = `
    <div class="health-gauge animate-fade-in">
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:6px;">
          <span>Health Score</span>
          <span>
            ${counts.critical > 0 ? `<span class="badge badge-critical">${counts.critical} Critical</span> ` : ''}
            ${counts.warning > 0 ? `<span class="badge badge-warning">${counts.warning} Warning</span> ` : ''}
            ${counts.info > 0 ? `<span class="badge badge-info">${counts.info} Info</span>` : ''}
          </span>
        </div>
        <div class="health-bar">
          <div class="health-bar-fill" style="width:${scorePercent}%;background:${scoreColor}"></div>
        </div>
      </div>
      <div class="health-score" style="color:${scoreColor}">${healthScore}/10</div>
    </div>

    <div class="optimization-list stagger-children">
      ${suggestions.map(s => renderSuggestion(s)).join('')}
    </div>
  `;
}

function renderSuggestion(suggestion) {
  const severityInfo = SEVERITY[suggestion.severity] || SEVERITY.info;

  return `
    <div class="optimization-item ${suggestion.severity}">
      <div class="opt-icon">${severityInfo.icon}</div>
      <div class="opt-content">
        <div class="opt-title">${suggestion.title}</div>
        <div class="opt-description">
          ${suggestion.description}
          ${suggestion.action ? `<br><strong>Action:</strong> ${suggestion.action}` : ''}
          ${suggestion.costImpact ? `<br><em>💰 ${suggestion.costImpact}</em>` : ''}
        </div>
        ${suggestion.workload !== 'global' ? `
          <div style="margin-top:4px;font-size:0.7rem;color:var(--text-tertiary);">
            Workload: ${suggestion.workload} (${suggestion.kind})
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
