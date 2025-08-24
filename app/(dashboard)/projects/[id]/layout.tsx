import { ProjectNav } from '@/components/project-nav'

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <ProjectNav projectId={resolvedParams.id} />
        {children}
      </div>
    </div>
  )
}