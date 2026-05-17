export default function GlassSpinner({ size = 36 }: { size?: number }) {
  const ringSize = size * 0.8;
  const coreSize = size * 0.28;

  return (
    <div
      className="glass-spinner"
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    >
      <div className="glass-filter" />
      <div className="glass-overlay" />
      <div className="glass-specular" />
      <div className="glass-spinner-content">
        <div
          className="glass-spinner-ring"
          style={{ width: ringSize, height: ringSize }}
        />
        <div
          className="glass-spinner-core"
          style={{ width: coreSize, height: coreSize }}
        />
      </div>
    </div>
  );
}
