/**
 * Calculates positioning styles for elements arranged radially.
 *
 * @param {Object} params
 * @param {number} [params.centerX=0] - X coordinate of the center point (or 0 if using percentage).
 * @param {number} [params.centerY=0] - Y coordinate of the center point (or 0 if using percentage).
 * @param {number} params.angle - Angle in radians.
 * @param {number} params.radius - Base radius.
 * @param {number} [params.offset=0] - Additional offset from the radius.
 * @param {boolean} [params.usePercentage=false] - If true, returns calc(50% + px) strings.
 * @returns {{left: string, top: string}} CSS style object.
 */
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
