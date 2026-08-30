import React from 'react'

// Isolates the 3D tab. If anything inside throws during render, the 2D view, the engine, and the
// API are completely unaffected — this just shows a fallback and offers a retry. The 2D hive is a
// sibling subtree, so it never unmounts when the 3D subtree errors.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.warn('[3D view] contained error (2D + engine unaffected):', error, info)
  }
  reset = () => this.setState({ error: null })
  render() {
    if (this.state.error) {
      return (
        <div className="threed-fallback">
          <div className="hex">⬡</div>
          <div className="tf-title">3D view unavailable</div>
          <div className="tf-sub">Your browser/GPU couldn’t start the 3D scene. The 2D hive and the
            governance engine are unaffected — switch back to the <b>2D View</b> tab for the demo.</div>
          <button onClick={this.reset}>retry 3D</button>
        </div>
      )
    }
    return this.props.children
  }
}
