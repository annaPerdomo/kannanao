"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, Divider, CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithUsername, signUpWithUsername } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);
    const result = isSignUp
      ? await signUpWithUsername(username, password, name)
      : await signInWithUsername(username, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.push("/");
  };

  return (
    <Box sx={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Card
        sx={(theme) => ({
          maxWidth: 400, width: "100%", borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.brand[300], 0.35)}`,
          boxShadow: `0 8px 40px ${alpha(theme.palette.brand[700], 0.10)}`,
          bgcolor: theme.palette.surfaces.overlay,
          backdropFilter: "blur(14px)",
        })}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{ fontFamily: '"DM Serif Display", serif', color: "primary.dark", mb: 3, textAlign: "center" }}
          >
            🌸 Kannanao
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {isSignUp && (
              <TextField
                label="Your name" value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name" size="small" fullWidth placeholder="How should we call you?"
              />
            )}
            <TextField
              label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
              autoComplete="username" size="small" fullWidth required
            />
            <TextField
              label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"} size="small" fullWidth required
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
              {busy ? <CircularProgress size={20} color="inherit" /> : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <Divider sx={{ my: 0.5 }} />
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "primary.dark", cursor: "pointer" }}
              onClick={() => { setIsSignUp((s) => !s); setError(null); setName(""); }}
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create account"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
