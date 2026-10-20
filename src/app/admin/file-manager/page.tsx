import FileManager from '@/components/FileManager'

export const metadata = {
  title: 'File Manager - Admin',
}

export default function AdminFileManagerPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <FileManager />
    </div>
  )
}
