'use client';

import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { SectionKey } from '@/types/homeSections';
import { ALL_SECTION_KEYS, getSectionsForRole, SECTION_META } from '@/types/homeSections';

interface CustomizeHomeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CustomizeHomeDialog({ open, onClose }: CustomizeHomeDialogProps) {
  const { homeSections, updateHomeSections, isMemberAccount } = useAuth();
  const theme = useTheme();
  const { brand } = theme.palette;
  const roleKeys = getSectionsForRole(isMemberAccount);
  const sections = ALL_SECTION_KEYS.filter((k) => roleKeys.has(k));

  const handleToggle = (key: SectionKey) => {
    void updateHomeSections({ ...homeSections, [key]: !homeSections[key] });
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Customize Home"
      subtitle="Toggle sections on or off"
      icon={<Typography sx={{ fontSize: '1.3rem' }}>🎨</Typography>}
      maxWidth="xs"
    >
      <Stack spacing={0.5}>
        {sections.map((key) => {
          const meta = SECTION_META[key];
          const enabled = homeSections[key];
          return (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: enabled ? alpha(brand[100], 0.5) : alpha(brand[50], 0.3),
                border: `1px solid ${alpha(brand[300], enabled ? 0.3 : 0.15)}`,
              }}
            >
              <Typography sx={{ fontSize: '1.2rem', mr: 1, flexShrink: 0 }}>
                {meta.emoji}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}
                >
                  {meta.label}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={enabled}
                    onChange={() => handleToggle(key)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: brand[400],
                      },
                    }}
                  />
                }
                label=""
                sx={{ m: 0, ml: 1 }}
              />
            </Box>
          );
        })}
      </Stack>
    </StyledDialog>
  );
}
