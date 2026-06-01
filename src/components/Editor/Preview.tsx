import { useMemo, useRef, useEffect } from 'react'
import { marked } from 'marked'
import { useAppStore } from '../../store/appStore'
import { useVault } from '../../hooks/useVault'
import styles from './Preview.module.css'

marked.setOptions({ breaks: true })

interface Props {
  content: string
}

function preprocessWikilinks(content: string, fileSet: Set<string>): string {
  return content.replace(/\[\[([^\[\]\n]+)\]\]/g, (_, inner) => {
    const parts = inner.split('|')
    const target = parts[0].split('#')[0].trim()
    const display = parts[1]?.trim() ?? target
    const exists = fileSet.has(target.toLowerCase())
    const cls = exists ? 'wikilink' : 'wikilink wikilink-broken'
    return `<a class="${cls}" data-wikilink="${target}">${display}</a>`
  })
}

export function Preview({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { vaultFiles } = useAppStore()
  const { openByName } = useVault()

  const fileSet = useMemo(() => {
    const set = new Set<string>()
    const walk = (nodes: typeof vaultFiles) => {
      for (const n of nodes) {
        if (n.isDir) { if (n.children) walk(n.children) }
        else set.add(n.name.replace(/\.md$/, '').toLowerCase())
      }
    }
    walk(vaultFiles)
    return set
  }, [vaultFiles])

  const html = useMemo(() => {
    if (!content.trim()) return '<p class="preview-empty">Start writing...</p>'
    const preprocessed = preprocessWikilinks(content, fileSet)
    return marked.parse(preprocessed) as string
  }, [content, fileSet])

  // delegate click on wikilinks inside rendered HTML
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-wikilink]')
      if (!target) return
      e.preventDefault()
      const name = target.getAttribute('data-wikilink')
      if (name) openByName(name)
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [openByName])

  return (
    <div
      ref={containerRef}
      className={styles.preview}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
