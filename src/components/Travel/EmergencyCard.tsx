'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PhoneIcon from '@mui/icons-material/Phone';
import SaveIcon from '@mui/icons-material/Save';
import {
  alpha,
  Box,
  Button,
  Card,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'kannanao-emergency-card';

interface EmergencyInfo {
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  medicalConditions: string;
  allergies: string;
  bloodType: string;
  emergencyContact: string;
  embassyInfo: string;
  notes: string;
}

const DEFAULT_INFO: EmergencyInfo = {
  hotelName: '',
  hotelAddress: '',
  hotelPhone: '',
  medicalConditions: '',
  allergies: '',
  bloodType: '',
  emergencyContact: '',
  embassyInfo: '',
  notes: '',
};

export function EmergencyCard() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const [info, setInfo] = useState<EmergencyInfo>(DEFAULT_INFO);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setInfo(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setLoaded(true);
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setEditing(false);
  }, [info]);

  const updateField = useCallback((field: keyof EmergencyInfo, value: string) => {
    setInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  const hasAnyInfo = Object.values(info).some((v) => v.trim() !== '');

  if (!loaded) return null;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontFamily: (t) => t.fonts.display,
              color: 'text.primary',
              flex: 1,
            }}
          >
            My Emergency Card
          </Typography>
          <Button
            startIcon={editing ? <SaveIcon /> : <EditIcon />}
            onClick={editing ? handleSave : () => setEditing(true)}
            variant={editing ? 'contained' : 'outlined'}
            size="small"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {editing ? 'Save' : 'Edit'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Fill this in before your trip. Pull it up instantly when you need it — show to taxi
          drivers, hotel staff, or in emergencies.
        </Typography>

        {/* Emergency Numbers — always visible */}
        <Card
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: `2px solid ${alpha('#dc2626', 0.3)}`,
          }}
        >
          <Box sx={{ p: 2, background: alpha('#dc2626', 0.06) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PhoneIcon sx={{ color: '#dc2626', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Japan Emergency Numbers
              </Typography>
            </Box>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Police
                </Typography>
                <Typography
                  variant="h6"
                  component="a"
                  href="tel:110"
                  sx={{ fontWeight: 700, color: '#dc2626', textDecoration: 'none' }}
                >
                  110
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Ambulance & Fire
                </Typography>
                <Typography
                  variant="h6"
                  component="a"
                  href="tel:119"
                  sx={{ fontWeight: 700, color: '#dc2626', textDecoration: 'none' }}
                >
                  119
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Japan Helpline (English 24/7)
                </Typography>
                <Typography
                  variant="body2"
                  component="a"
                  href="tel:0570000911"
                  sx={{ fontWeight: 700, color: '#dc2626', textDecoration: 'none' }}
                >
                  0570-000-911
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        {/* User's info */}
        <Card
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(brand[300], 0.3)}`,
            overflow: 'hidden',
          }}
        >
          {/* Hotel info */}
          <Box sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand[600], mb: 1.5 }}>
              MY HOTEL
            </Typography>
            {editing ? (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="Hotel name"
                  value={info.hotelName}
                  onChange={(e) => updateField('hotelName', e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Address (in Japanese if possible — paste from booking)"
                  value={info.hotelAddress}
                  onChange={(e) => updateField('hotelAddress', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  size="small"
                  label="Hotel phone"
                  value={info.hotelPhone}
                  onChange={(e) => updateField('hotelPhone', e.target.value)}
                  fullWidth
                />
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {info.hotelName || '(not set)'}
                </Typography>
                {info.hotelAddress && (
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.jp,
                      fontSize: '1.1rem',
                      color: 'text.primary',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(brand[100], 0.4),
                      border: `1px solid ${alpha(brand[200], 0.4)}`,
                    }}
                  >
                    {info.hotelAddress}
                  </Typography>
                )}
                {info.hotelPhone && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {info.hotelPhone}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          <Divider />

          {/* Medical info */}
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LocalHospitalIcon sx={{ color: '#dc2626', fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand[600] }}>
                MEDICAL INFO
              </Typography>
            </Box>
            {editing ? (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="Medical conditions"
                  value={info.medicalConditions}
                  onChange={(e) => updateField('medicalConditions', e.target.value)}
                  fullWidth
                  placeholder="e.g. Asthma, Diabetes"
                />
                <TextField
                  size="small"
                  label="Allergies"
                  value={info.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                  fullWidth
                  placeholder="e.g. Peanuts, Shellfish, Penicillin"
                />
                <TextField
                  size="small"
                  label="Blood type"
                  value={info.bloodType}
                  onChange={(e) => updateField('bloodType', e.target.value)}
                  fullWidth
                  placeholder="e.g. O+"
                />
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                {info.medicalConditions && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>Conditions:</strong> {info.medicalConditions}
                  </Typography>
                )}
                {info.allergies && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>Allergies:</strong> {info.allergies}
                  </Typography>
                )}
                {info.bloodType && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>Blood type:</strong> {info.bloodType}
                  </Typography>
                )}
                {!info.medicalConditions && !info.allergies && !info.bloodType && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    (not set)
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          <Divider />

          {/* Emergency contact & embassy */}
          <Box sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand[600], mb: 1.5 }}>
              CONTACTS
            </Typography>
            {editing ? (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="Emergency contact (name + phone)"
                  value={info.emergencyContact}
                  onChange={(e) => updateField('emergencyContact', e.target.value)}
                  fullWidth
                  placeholder="e.g. Mom: +1-555-123-4567"
                />
                <TextField
                  size="small"
                  label="Embassy/Consulate info"
                  value={info.embassyInfo}
                  onChange={(e) => updateField('embassyInfo', e.target.value)}
                  fullWidth
                  placeholder="e.g. US Embassy Tokyo: 03-3224-5000"
                />
                <TextField
                  size="small"
                  label="Other notes"
                  value={info.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="e.g. Travel insurance policy #, medications"
                />
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                {info.emergencyContact && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>Contact:</strong> {info.emergencyContact}
                  </Typography>
                )}
                {info.embassyInfo && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>Embassy:</strong> {info.embassyInfo}
                  </Typography>
                )}
                {info.notes && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>Notes:</strong> {info.notes}
                  </Typography>
                )}
                {!info.emergencyContact && !info.embassyInfo && !info.notes && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    (not set)
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        </Card>

        {/* Helpful phrases for emergencies */}
        <Card
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${alpha(brand[300], 0.3)}`,
            background: alpha(brand[50], 0.5),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand[600], mb: 1 }}>
            EMERGENCY PHRASES
          </Typography>
          <Stack spacing={1}>
            {[
              { jp: '助けてください', romaji: 'tasukete kudasai', en: 'Help me please' },
              {
                jp: '救急車を呼んでください',
                romaji: 'kyuukyuusha wo yonde kudasai',
                en: 'Please call an ambulance',
              },
              {
                jp: '警察を呼んでください',
                romaji: 'keisatsu wo yonde kudasai',
                en: 'Please call the police',
              },
              {
                jp: '英語を話せる人はいますか？',
                romaji: 'eigo wo hanaseru hito wa imasu ka?',
                en: 'Is there someone who speaks English?',
              },
              {
                jp: 'このホテルに連れて行ってください',
                romaji: 'kono hoteru ni tsurete itte kudasai',
                en: 'Please take me to this hotel',
              },
            ].map((p) => (
              <Box
                key={p.jp}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.6),
                  border: `1px solid ${alpha(brand[200], 0.3)}`,
                }}
              >
                <Typography
                  sx={{ fontFamily: (t) => t.fonts.jp, fontSize: '0.9rem', color: 'text.primary' }}
                >
                  {p.jp}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                  <Typography variant="caption" sx={{ color: brand[600] }}>
                    {p.romaji}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    — {p.en}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Card>

        {!hasAnyInfo && !editing && (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              onClick={() => setEditing(true)}
              variant="contained"
              startIcon={<EditIcon />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Fill in my info
            </Button>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
