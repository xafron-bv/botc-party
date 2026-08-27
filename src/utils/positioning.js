export function calculateRadialPosition({
  centerX = 0,
  centerY = 0,
  angle,
  radius,
  offset = 0,
  usePercentage = false
}) {
  const totalDistance = radius + offset;
  const dx = Math.cos(angle) * totalDistance;
  const dy = Math.sin(angle) * totalDistance;
  if (usePercentage) {
    return {
      left: `calc(50% + ${dx}px)`,
      top: `calc(50% + ${dy}px)`
    };
  }
  return {
    left: `${centerX + dx}px`,
    top: `${centerY + dy}px`
  };
}
