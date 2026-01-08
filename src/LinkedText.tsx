import React from 'react'
import styled from 'styled-components'
import { parseUrls } from './utils/urlUtils'
import type { UrlMetadata } from './types'
import type { Theme } from './theme'

interface LinkedTextProps {
  text: string
  metadata?: UrlMetadata[]
  theme: Theme
  className?: string
}

type Segment = {
  type: 'text' | 'link'
  content?: string
  url?: string
  displayText?: string
}

/**
 * テキスト内のURLを検出し、ハイパーリンクとして表示するコンポーネント
 */
export const LinkedText = React.memo(function LinkedText({
  text,
  metadata = [],
  theme,
  className,
}: LinkedTextProps) {
  const urls = parseUrls(text)

  if (urls.length === 0) {
    return <span className={className}>{text}</span>
  }

  // テキストをプレーンテキストとリンクのセグメントに分割
  const segments: Segment[] = []
  let lastIndex = 0

  urls.forEach(({ url, startIndex, endIndex }) => {
    // URL前のプレーンテキスト
    if (startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, startIndex),
      })
    }

    // リンクセグメント
    const meta = metadata.find((m) => m.url === url)
    const displayText = meta?.title || url

    segments.push({
      type: 'link',
      url,
      displayText,
    })

    lastIndex = endIndex
  })

  // 残りのテキスト
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.type === 'link' ? (
          <StyledLink
            key={`link-${i}-${segment.url}`}
            href={segment.url}
            target="_blank"
            rel="noopener noreferrer"
            $theme={theme}
            title={segment.url}
          >
            {segment.displayText}
          </StyledLink>
        ) : (
          <span key={`text-${i}`}>{segment.content}</span>
        )
      )}
    </span>
  )
})

const StyledLink = styled.a<{ $theme: Theme }>`
  color: ${props => props.$theme.linkColor};
  text-decoration: underline;
  cursor: pointer;
  word-break: break-word;

  &:hover {
    color: ${props => props.$theme.linkColorHover};
    text-decoration: none;
  }

  &:visited {
    color: ${props => props.$theme.linkColorVisited};
  }
`
