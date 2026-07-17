// ─── Constants ────────────────────────────────────────────────────────────────
export const HOURS_PER_DAY = 24;
export const HOURS_PER_MONTH = 730; // industry standard
export const MONTHS_PER_YEAR = 12;
export const HOURS_PER_YEAR = HOURS_PER_MONTH * MONTHS_PER_YEAR;

export const PROVIDERS = {
  aws: { id: 'aws', name: 'Amazon Web Services', short: 'AWS', color: '#FF9900', icon: '☁️' },
  azure: { id: 'azure', name: 'Microsoft Azure', short: 'Azure', color: '#0078D4', icon: '☁️' },
  gcp: { id: 'gcp', name: 'Google Cloud Platform', short: 'GCP', color: '#4285F4', icon: '☁️' },
};

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  TRY: '₺',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '₹',
  BRL: 'R$',
};

export const CURRENCY_NAMES = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  TRY: 'Turkish Lira',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  INR: 'Indian Rupee',
  BRL: 'Brazilian Real',
};

export const PRICING_MODELS = {
  ondemand: { id: 'ondemand', name: 'On-Demand', description: 'Pay as you go, no commitment' },
  reserved_1yr: { id: 'reserved_1yr', name: 'Reserved 1yr', description: '1 year commitment, ~37% savings' },
  reserved_3yr: { id: 'reserved_3yr', name: 'Reserved 3yr', description: '3 year commitment, ~60% savings' },
  spot: { id: 'spot', name: 'Spot / Preemptible', description: 'Interruptible instances, ~70% savings' },
};

export const INSTANCE_FAMILIES = {
  general_purpose: { id: 'general_purpose', name: 'General Purpose', description: 'Balanced CPU/Memory ratio' },
  compute_optimized: { id: 'compute_optimized', name: 'Compute Optimized', description: 'High CPU-to-memory ratio' },
  memory_optimized: { id: 'memory_optimized', name: 'Memory Optimized', description: 'High memory-to-CPU ratio' },
};

export const K8S_WORKLOAD_KINDS = [
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'ReplicaSet',
  'Job',
  'CronJob',
  'Pod',
];

export const SEVERITY = {
  critical: { id: 'critical', label: 'Critical', color: '#ef4444', icon: '🔴' },
  warning: { id: 'warning', label: 'Warning', color: '#f59e0b', icon: '🟡' },
  info: { id: 'info', label: 'Info', color: '#3b82f6', icon: '🔵' },
};

export const SAMPLE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
  labels:
    app: web-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /healthz
              port: 80
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 80
            initialDelaySeconds: 5
        - name: sidecar-logger
          image: fluentd:v1.16
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-db
  namespace: production
spec:
  replicas: 2
  serviceName: postgres
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          ports:
            - containerPort: 5432
`;
