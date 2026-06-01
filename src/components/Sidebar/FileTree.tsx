import { FileNode } from '../../store/appStore'
import { FileItem } from './FileItem'
import styles from './Sidebar.module.css'

interface Props {
  files: FileNode[]
  activePath: string | null
  onOpenFile: (path: string) => void
  onRename: (oldPath: string, newPath: string) => void
  onDelete: (path: string) => void
}

export function FileTree({ files, activePath, onOpenFile, onRename, onDelete }: Props) {
  if (files.length === 0) {
    return <div className={styles.emptyTree}>Нет заметок</div>
  }

  return (
    <div className={styles.fileTree}>
      {files.map((node) => (
        <FileItem
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          onOpenFile={onOpenFile}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
