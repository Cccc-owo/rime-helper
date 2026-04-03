import type { ParentProps } from 'solid-js'

interface Props extends ParentProps {
  title?: string
  description?: string
  tone?: 'outlined' | 'filled'
  class?: string
}

export default function SurfaceSection(props: Props) {
  const tone = () => props.tone ?? 'outlined'
  const classes = () => `card section-card ${props.class ?? ''}`.trim()

  return (
    <section class="surface-section">
      {props.title ? <h2>{props.title}</h2> : null}
      {props.description ? <p class="desc">{props.description}</p> : null}
      {tone() === 'filled'
        ? <md-filled-card class={classes()}>{props.children}</md-filled-card>
        : <md-outlined-card class={classes()}>{props.children}</md-outlined-card>}
    </section>
  )
}
