// ─── YAML Editor Component ────────────────────────────────────────────────────
import { SAMPLE_YAML } from '../utils/constants.js';

/**
 * Initialize the YAML editor with tab support and sample loading.
 * @param {Function} onChange - callback(yamlString)
 */
export function initYAMLEditor(onChange) {
  const textarea = document.getElementById('yaml-textarea');
  const sampleBtn = document.getElementById('load-sample-btn');
  const clearBtn = document.getElementById('clear-editor-btn');
  const validationMsg = document.getElementById('yaml-validation');

  if (!textarea) return;

  // Tab key support
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      triggerChange();
    }
  });

  // Input change
  textarea.addEventListener('input', () => {
    triggerChange();
  });

  // Load sample
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      textarea.value = SAMPLE_YAML;
      triggerChange();
      textarea.scrollTop = 0;
    });
  }

  // Clear
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      textarea.value = '';
      triggerChange();
    });
  }

  function triggerChange() {
    const value = textarea.value;
    validateYAML(value);
    onChange(value);
  }

  function validateYAML(value) {
    if (!validationMsg) return;

    if (!value.trim()) {
      validationMsg.textContent = '';
      validationMsg.className = 'yaml-validation';
      return;
    }

    try {
      // Quick validation using js-yaml
      const jsYaml = window.__jsYaml;
      if (jsYaml) {
        jsYaml.loadAll(value);
      }
      validationMsg.textContent = '✓ Valid YAML';
      validationMsg.className = 'yaml-validation valid';
    } catch (e) {
      const line = e.mark ? ` (line ${e.mark.line + 1})` : '';
      validationMsg.textContent = `✗ ${e.message.split('\n')[0]}${line}`;
      validationMsg.className = 'yaml-validation invalid';
    }
  }

  // Public API
  return {
    setValue(value) {
      textarea.value = value;
      triggerChange();
    },
    getValue() {
      return textarea.value;
    },
    clear() {
      textarea.value = '';
      triggerChange();
    },
  };
}
