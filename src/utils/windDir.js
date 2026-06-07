const DIRS = ['N','NE','E','SE','S','SO','O','NO'];
const ARROWS = ['↑','↗','→','↘','↓','↙','←','↖'];

export function windDirLabel(deg) {
  if (deg == null) return null;
  const i = Math.round(deg / 45) % 8;
  return DIRS[i];
}

export function windDirArrow(deg) {
  if (deg == null) return null;
  const i = Math.round(deg / 45) % 8;
  return ARROWS[i];
}
