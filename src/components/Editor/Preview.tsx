import { useMemo } from 'react'
import { marked } from 'marked'
import styles from './Preview.module.css'

marked.setOptions({ breaks: true })

interface Props {
  content: string
}

export function Preview({ content }: Props) {
  const html = useMemo(() => {
    if (!content.trim()) return '<p class="empty">Start writing...</p>'
    return marked.parse(content) as string
  }, [content])

  return (
    <div
      className={styles.preview}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
