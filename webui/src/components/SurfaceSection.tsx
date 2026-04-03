import type { ParentProps } from 'solid-js'

interface Props extends ParentProps {
  title?: string
  tone?: 'outlined' | 'filled'
  class?: string
}

export default function SurfaceSection(props: Props) {
  const tone = () => props.tone ?? 'outlined'
  const classes = () => `card section-card ${props.class ?? ''}`.trim()
  const hasHeader = () => Boolean(props.title)

  const content = (
    <>
      {hasHeader() ? (
        <div class="section-head">
          {props.title ? <h2 class="section-title">{props.title}</h2> : null}
        </div>
      ) : null}
      <div class={`section-content ${hasHeader() ? 'with-header' : ''}`}>{props.children}</div>
    </>
  )

  return (
    <section class="surface-section">
      {tone() === 'filled'
        ? <md-filled-card class={classes()}>{content}</md-filled-card>
        : <md-outlined-card class={classes()}>{content}</md-outlined-card>}
    </section>
  )
}
