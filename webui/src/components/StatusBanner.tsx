interface Props {
  message: string
  error: string
}

export default function StatusBanner(props: Props) {
  if (props.error) {
    return (
      <md-filled-card class="card banner banner-error" role="alert">
        <div class="banner-row">
          <span class="banner-icon" aria-hidden="true">!</span>
          <span>{props.error}</span>
        </div>
      </md-filled-card>
    )
  }

  if (props.message) {
    return (
      <md-filled-card class="card banner banner-info" role="status">
        <div class="banner-row">
          <span class="banner-icon" aria-hidden="true">i</span>
          <span>{props.message}</span>
        </div>
      </md-filled-card>
    )
  }

  return null
}
