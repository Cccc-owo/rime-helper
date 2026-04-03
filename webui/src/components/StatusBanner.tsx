interface Props {
  message: string
  error: string
}

export default function StatusBanner(props: Props) {
  if (props.error) return <md-filled-card class="card banner banner-error" role="alert">{props.error}</md-filled-card>
  if (props.message) return <md-filled-card class="card banner banner-info" role="status">{props.message}</md-filled-card>
  return null
}
