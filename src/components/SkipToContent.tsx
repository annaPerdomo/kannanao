'use client';

import Box from '@mui/material/Box';
import visuallyHidden from '@mui/utils/visuallyHidden';

export function SkipToContent() {
  return (
    <Box
      component="a"
      href="#main-content"
      className="skip-to-content"
      sx={{
        ...visuallyHidden,
        '&:focus': {
          position: 'fixed',
          top: 16,
          left: 16,
          width: 'auto',
          height: 'auto',
          padding: '8px 16px',
          margin: 0,
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
          zIndex: 9999,
          bgcolor: 'background.paper',
          border: '2px solid',
          borderColor: 'text.primary',
          borderRadius: 2,
          fontSize: 14,
          fontWeight: 600,
          color: 'text.primary',
          textDecoration: 'none',
        },
      }}
    >
      Skip to main content
    </Box>
  );
}
