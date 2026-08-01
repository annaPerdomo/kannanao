import type { SvgIconProps } from '@mui/material/SvgIcon';
import SvgIcon from '@mui/material/SvgIcon';

// One petal pointing up: rounded shoulders with the notched outer tip that
// reads as sakura rather than a generic flower. The other four are rotations.
const PETAL =
  'M12 8.8C9.9 7.4 8.8 5.6 9.4 4.1 9.9 2.9 11.2 2.7 12 3.7 12.8 2.7 14.1 2.9 14.6 4.1 15.2 5.6 14.1 7.4 12 8.8Z';

/** Five-petal cherry blossom, single color (inherits like any MUI icon). */
export function SakuraIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <path key={deg} d={PETAL} transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.7" />
    </SvgIcon>
  );
}
