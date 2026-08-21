export type ConnectVerificationState = 'idle' | 'verifying' | 'verified'

export const PROVIDER_SETUP_STEPS = [
  {
    id: 'connect',
    label: 'Connect hardware',
  },
  {
    id: 'discover',
    label: 'Discover inventory',
  },
  {
    id: 'template',
    label: 'Create template',
  },
] as const

export type ProviderSetupStepId = (typeof PROVIDER_SETUP_STEPS)[number]['id']

export const PROVIDER_SETUP_STEP_FOOTER: Record<
  ProviderSetupStepId,
  { title: string; summary: string; tips: string[] }
> = {
  connect: {
    title: 'Connection requirements',
    summary:
      'Test connection validates reachability to both operators without persisting configuration.',
    tips: [
      'Ensure firewall rules allow HTTPS from the portal cluster.',
      'Service account tokens expire — rotate them on a regular schedule.',
      'The Kubernetes namespace must already exist in the target cluster.',
    ],
  },
  discover: {
    title: 'Discovery overview',
    summary:
      'A scan queries Balance Operator and Metal3 for BareMetalHost resources and registers serial numbers, capacity, and rack placement.',
    tips: [
      'Discovery typically completes in under three minutes for a single rack.',
      'Hosts remain in "Available" status until assigned to a tenant template.',
      'Re-run discovery after adding new hardware to your data center.',
    ],
  },
  template: {
    title: 'Template publishing',
    summary:
      'Templates package discovered hardware into tenant-requestable instance types in the global catalog.',
    tips: [
      'Instance types map to capacity profiles found during discovery.',
      'Published templates sync to all tenants automatically.',
      'You can create additional templates from Global templates after setup.',
    ],
  },
}

export const DEMO_SERVICE_ACCOUNT_TOKEN = 'sk-prod-X9kL2mNqRvTwYzAb3cDeFgHiJoKpQrSt'
export const DEMO_PROVIDER_ADMIN_PASSWORD = 'Sovereign#2025!'

export const DEFAULT_CONNECT_FORM = {
  balanceOperatorEndpoint: 'https://balance-operator.datacenter-us-east1.local:8080',
  metal3Endpoint: 'https://metal3.osac-system.svc.cluster.local:6385',
  serviceAccountToken: DEMO_SERVICE_ACCOUNT_TOKEN,
  adminUsername: 'osac-admin',
  password: DEMO_PROVIDER_ADMIN_PASSWORD,
  kubernetesNamespace: 'metal3-system',
}

export type DiscoveryScanPhase = 'idle' | 'scanning' | 'complete'

export type HostScanStatus = 'inspecting' | 'available'

export type DiscoveredHost = {
  id: string
  serial: string
  vendor: string
  model: string
  rack: string
  port: string
  cpu: string
  memory: string
  gpu: string | null
}

export const DISCOVER_HEADER_COPY: Record<'idle' | 'scanning', string> = {
  idle: 'Ready to scan your physical server racks. Click Trigger Discovery Scan to begin.',
  scanning: 'Scanning hardware inventory...',
}

export const MOCK_DISCOVERED_HOSTS: DiscoveredHost[] = [
  {
    id: 'bm-dell-a1-01',
    serial: 'DLLR750-7X8K2A',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    rack: 'Rack-A1',
    port: 'Eth1/1',
    cpu: 'Intel Xeon Gold 6338 × 2',
    memory: '512 GB DDR4-3200',
    gpu: null,
  },
  {
    id: 'bm-dell-a1-02',
    serial: 'DLLR750-7X8K3B',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    rack: 'Rack-A1',
    port: 'Eth1/2',
    cpu: 'Intel Xeon Gold 6338 × 2',
    memory: '512 GB DDR4-3200',
    gpu: null,
  },
  {
    id: 'bm-dell-a2-01',
    serial: 'DLLR750-7X8K4C',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    rack: 'Rack-A2',
    port: 'Eth1/1',
    cpu: 'Intel Xeon Gold 6338 × 2',
    memory: '512 GB DDR4-3200',
    gpu: null,
  },
  {
    id: 'bm-hpe-b1-01',
    serial: 'HPEA100-NG4491D',
    vendor: 'HPE',
    model: 'ProLiant DL380 Gen10+',
    rack: 'Rack-B1',
    port: 'Eth2/1',
    cpu: 'AMD EPYC 7763 × 2',
    memory: '1 TB DDR4-3200',
    gpu: 'NVIDIA A100 80 GB × 4',
  },
  {
    id: 'bm-hpe-b1-02',
    serial: 'HPEA100-NG4492E',
    vendor: 'HPE',
    model: 'ProLiant DL380 Gen10+',
    rack: 'Rack-B1',
    port: 'Eth2/2',
    cpu: 'AMD EPYC 7763 × 2',
    memory: '1 TB DDR4-3200',
    gpu: 'NVIDIA A100 80 GB × 4',
  },
  {
    id: 'bm-hpe-b2-01',
    serial: 'HPEA100-NG4493F',
    vendor: 'HPE',
    model: 'ProLiant DL380 Gen10+',
    rack: 'Rack-B2',
    port: 'Eth2/1',
    cpu: 'AMD EPYC 7763 × 2',
    memory: '1 TB DDR4-3200',
    gpu: 'NVIDIA A100 80 GB × 4',
  },
  {
    id: 'bm-hpe-b2-02',
    serial: 'HPEA100-NG4494G',
    vendor: 'HPE',
    model: 'ProLiant DL380 Gen10+',
    rack: 'Rack-B2',
    port: 'Eth2/2',
    cpu: 'AMD EPYC 7763 × 2',
    memory: '1 TB DDR4-3200',
    gpu: 'NVIDIA A100 80 GB × 4',
  },
]

export const DEFAULT_TEMPLATE_FORM = {
  name: 'bmaas-gpu-training-standard',
  instanceType: 'gpu-l40s-dual',
  description:
    'Dual NVIDIA L40S bare metal nodes for AI training workloads. Includes NVLink-ready rack placement from discovery.',
}

export type ProviderServiceId = 'baremetal' | 'cluster' | 'models' | 'virtual-machine'

export type ProviderServiceOffering = {
  id: ProviderServiceId
  title: string
  description: string
  features: readonly string[]
}

export const PROVIDER_SERVICE_OFFERINGS: ProviderServiceOffering[] = [
  {
    id: 'baremetal',
    title: 'Bare Metal as a Service',
    description:
      'Deploy pre-configured compute nodes via a streamlined e-commerce storefront, using locked catalog items curated directly for your corporate workspace.',
    features: [
      'Automated hardware ingestion via Metal3 / Ansible',
      'Instant system provisioning with secure SSH key injection',
      'One-click curated catalog items and blueprints',
      'Isolated tenant workspaces with front-end quota boundaries',
    ],
  },
  {
    id: 'cluster',
    title: 'Cluster as a Service',
    description:
      'Deploy and manage multi-tenant OpenShift clusters using an e-commerce-style setup wizard that completely abstracts raw infrastructure layers.',
    features: [
      'Automated OpenShift provisioning via pre-configured snapshots',
      'Custom cluster flavors with pre-installed platform operators',
      'Dynamic network fabric mapping powered by Netris',
      '3-field launch forms with real-time progress tracking',
    ],
  },
  {
    id: 'models',
    title: 'Models as a Service',
    description:
      'Deploy and access secure, sovereign AI foundation models via a self-service API storefront, leveraging pre-configured runtimes optimized for your workspace.',
    features: [
      'Automated model serving and orchestration via vLLM / KServe',
      'Instant inference API deployment with built-in token rate limiting',
      'Turnkey access to curated, open-source LLM catalog blueprints',
      'Isolated tenant workspaces with zero-data-retention guarantees',
    ],
  },
  {
    id: 'virtual-machine',
    title: 'Virtual Machine as a Service',
    description:
      'Provision scalable, secure virtualized environments via a streamlined storefront, using pre-approved guest images and blueprints customized for your sovereign workspace.',
    features: [
      'Automated VM orchestration via KVM / KubeVirt',
      'Rapid provisioning with curated OS blueprints',
      'Hypervisor sandboxing with confidential computing',
      'Isolated tenant workspaces with strict quota controls',
    ],
  },
]

export const DEFAULT_PROVIDER_SERVICE_SELECTION: ProviderServiceId[] = ['baremetal', 'cluster']

export const PROVIDER_SERVICE_CHIP_LABELS: Record<ProviderServiceId, string> = {
  baremetal: 'Bare Metal',
  cluster: 'Cluster',
  models: 'MaaS',
  'virtual-machine': 'Virtual Machine',
}

export function getProviderSetupWizardIntro(selectedServices: ProviderServiceId[]): {
  title: string
  lede: string
} {
  if (selectedServices.length === 1) {
    const [onlyService] = selectedServices
    switch (onlyService) {
      case 'baremetal':
        return {
          title: 'Set up Bare Metal as a Service',
          lede: 'Connect Metal3, discover hosts, and publish your first instance template.',
        }
      case 'cluster':
        return {
          title: 'Set up Cluster as a Service',
          lede: 'Connect your environment, define cluster profiles, and publish tenant-ready offerings.',
        }
      case 'models':
        return {
          title: 'Set up Models as a Service',
          lede: 'Connect your model-serving environment and publish tenant-ready inference offerings.',
        }
      case 'virtual-machine':
        return {
          title: 'Set up Virtual Machine as a Service',
          lede: 'Connect your virtualization environment and publish tenant-ready VM offerings.',
        }
      default:
        break
    }
  }

  return {
    title: 'Set up your selected services',
    lede: 'Start with Bare Metal as a Service—connect Metal3, discover hosts, and publish your first instance template.',
  }
}
