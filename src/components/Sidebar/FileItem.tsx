import { useState, useRef, useEffect, MouseEvent } from 'react'
import { FileNode } from '../../store/appStore'
import styles from './Sidebar.module.css'

interface Props {
  node: FileNode
  depth: number
  activePath: string | null
  onOpenFile: (path: string) => void
  onRename: (oldPath: string, newPath: string) => void
  onDelete: (path: string) => void
}

export function FileItem({ node, depth, activePath, onOpenFile, onRename, onDelete }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(node.name)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) renameRef.current?.select()
  }, [renaming])

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      const parent = node.path.substring(0, node.path.length - node.name.length)
      onRename(node.path, parent + renameValue.trim())
    }
    setRenaming(false)
  }

  const isActive = !node.isDir && activePath === node.path

  return (
    <>
      <div
        className={`${styles.fileItem} ${isActive ? styles.active : ''}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => (node.isDir ? setExpanded(!expanded) : onOpenFile(node.path))}
        onDoubleClick={() => !node.isDir && setRenaming(true)}
        onContextMenu={handleContextMenu}
      >
        <span className={styles.fileIcon}>{node.isDir ? (expanded ? '▾' : '▸') : '·'}</span>
        {renaming ? (
          <input
            ref={renameRef}
            className={styles.renameInput}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') {
                setRenameValue(node.name)
                setRenaming(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.fileName}>{node.name}</span>
        )}
      </div>

      {node.isDir &&
        expanded &&
        node.children?.map((child) => (
          <FileItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            onOpenFile={onOpenFile}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onRename={() => {
            setRenaming(true)
            setContextMenu(null)
          }}
          onDelete={() => {
            onDelete(node.path)
            setContextMenu(null)
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

function ContextMenu({
  x,
  y,
  onRename,
  onDelete,
  onClose,
}: {
  x: number
  y: number
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div className={styles.contextMenu} style={{ left: x, top: y }}>
      <button onClick={onRename}>Переименовать</button>
      <button className={styles.deleteAction} onClick={onDelete}>
        Удалить
      </button>
    </div>
  )
}
