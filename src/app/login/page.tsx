"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, Divider, CircularProgress, IconButton, InputAdornment,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useAuth } from "@/contexts/AuthContext";
import WaitlistForm from "@/components/WaitlistForm";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithUsername } = useAuth();

  const [showWaitlist, setShowWaitlist] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);
    const result = await signInWithUsername(username, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.push("/");
  };

  return (
    <Box sx={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Card
        sx={(theme) => ({
          maxWidth: 420, width: "100%", borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.brand[300], 0.35)}`,
          boxShadow: `0 8px 40px ${alpha(theme.palette.brand[700], 0.10)}`,
          bgcolor: theme.palette.surfaces.overlay,
          backdropFilter: "blur(14px)",
        })}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{ fontFamily: '"DM Serif Display", serif', color: "primary.dark", mb: 1.5, textAlign: "center" }}
          >
            🌸 Kannanao
          </Typography>

          <Chip
            label="Beta · Sign-ups paused"
            size="small"
            sx={{
              display: "flex", mx: "auto", mb: 2.5,
              bgcolor: "rgba(251,191,36,0.12)", color: "#B45309",
              fontWeight: 700, fontSize: "0.72rem",
              border: "1px solid rgba(251,191,36,0.35)", borderRadius: 6,
            }}
          />

          {showWaitlist ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
                Sign-ups are currently closed while we&apos;re in beta. Leave your email and we&apos;ll let you know when we open up!
              </Typography>
              <WaitlistForm compact />
              <Divider sx={{ my: 0.5 }} />
              <Typography
                variant="body2"
                sx={{ textAlign: "center", color: "primary.dark", cursor: "pointer" }}
                onClick={() => setShowWaitlist(false)}
              >
                Already have an account? Sign in
              </Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" size="small" fullWidth required
              />
              <TextField
                label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" size="small" fullWidth required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
              <Button
                type="submit" variant="contained" disabled={busy}
                sx={{
                  bgcolor: "primary.dark", color: "#fff",
                  fontFamily: '"DM Serif Display", serif',
                  textTransform: "none", borderRadius: 6,
                  "&:hover": { bgcolor: "primary.dark", filter: "brightness(0.9)" },
                }}
              >
                {busy ? <CircularProgress size={20} color="inherit" /> : "Sign In"}
              </Button>
              <Divider sx={{ my: 0.5 }} />
              <Typography
                variant="body2"
                sx={{ textAlign: "center", color: "primary.dark", cursor: "pointer" }}
                onClick={() => { setShowWaitlist(true); setError(null); }}
              >
                Don&apos;t have an account? Join the waitlist
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
