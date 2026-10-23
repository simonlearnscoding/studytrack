import { createFileRoute, redirect } from '@tanstack/react-router'

// Temporary compatibility shim: the Focus view moved from /beta to /.
export const Route = createFileRoute('/beta')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
