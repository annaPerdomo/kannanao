"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithUsername, signUpWithUsername } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);
    const fn = isSignUp ? signUpWithUsername : signInWithUsername;
    const { error } = await fn(username, password);
    setBusy(false);
    if (error) {
      setError(error);
    } else {
      router.push("/");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: "100%",
          borderRadius: 4,
          border: "1px solid rgba(249,168,212,0.35)",
          boxShadow: "0 8px 40px rgba(190,24,93,0.10)",
          bgcolor: "rgba(255,242,248,0.92)",
          backdropFilter: "blur(14px)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"DM Serif Display", serif',
              color: "#BE185D",
              mb: 3,
              textAlign: "center",
            }}
          >
            🌸 Kannanao
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              size="small"
              fullWidth
              required
            />
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={busy}
              sx={{
                bgcolor: "#BE185D",
                color: "#fff",
                fontFamily: '"DM Serif Display", serif',
                textTransform: "none",
                borderRadius: 6,
                "&:hover": { bgcolor: "#9D174D" },
              }}
            >
              {busy ? (
                <CircularProgress size={20} color="inherit" />
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
            <Divider sx={{ my: 0.5 }} />
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "#BE185D", cursor: "pointer" }}
              onClick={() => {
                setIsSignUp((s) => !s);
                setError(null);
              }}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "New here? Create account"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
