import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface MessageReactionsProps {
  /** emoji → the ids of everyone who reacted with it */
  reactions: Record<string, string[]>;
  /** Aligns the row with the bubble it belongs to */
  isMine: boolean;
  userId?: string;
  onToggle: (emoji: string) => void;
}

/** Reaction pills under a message bubble. Tapping one adds or removes your
 * own reaction. Rendered in normal flow so it never overlaps the next bubble. */
export function MessageReactions({ reactions, isMine, userId, onToggle }: MessageReactionsProps) {
  const { palette } = useTheme();
  const { brand } = palette;
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        gap: 0.4,
        mt: 0.25,
        px: 0.5,
      }}
    >
      {entries.map(([emoji, users]) => {
        const iReacted = userId ? users.includes(userId) : false;
        return (
          <Box
            key={emoji}
            component="button"
            onClick={() => onToggle(emoji)}
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') onToggle(emoji);
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.3,
              px: 0.8,
              py: 0.3,
              borderRadius: '12px',
              border: `1.5px solid ${iReacted ? alpha(brand[500], 0.5) : alpha(brand[300], 0.4)}`,
              bgcolor: iReacted ? alpha(brand[200], 0.85) : alpha('#fff', 0.9),
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
              transition: 'all 0.12s ease',
              boxShadow: `0 1px 4px ${alpha(brand[400], 0.25)}`,
              '&:hover': {
                bgcolor: alpha(brand[200], 0.8),
                borderColor: alpha(brand[400], 0.6),
                transform: 'scale(1.1)',
              },
            }}
          >
            <span>{emoji}</span>
            {users.length > 1 && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: iReacted ? brand[700] : brand[500],
                }}
              >
                {users.length}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
