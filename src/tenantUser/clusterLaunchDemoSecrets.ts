export const CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBJACfzqANDyWlygNn0FWP7YBZ6XLt+XPGpSw5PyknOW brotman@redhat.com'

export const CLUSTER_LAUNCH_DEMO_PULL_SECRET = JSON.stringify(
  {
    auths: {
      'cloud.openshift.com': {
        auth: 'ZGVtbzpwdWxsLXNlY3JldA==',
        email: 'brotman@redhat.com',
      },
      'quay.io': {
        auth: 'ZGVtbzpwdWxsLXNlY3JldA==',
        email: 'brotman@redhat.com',
      },
      'registry.connect.redhat.com': {
        auth: 'ZGVtbzpwdWxsLXNlY3JldA==',
        email: 'brotman@redhat.com',
      },
      'registry.redhat.io': {
        auth: 'ZGVtbzpwdWxsLXNlY3JldA==',
        email: 'brotman@redhat.com',
      },
    },
  },
  null,
  2,
)
