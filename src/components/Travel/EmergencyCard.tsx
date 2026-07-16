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
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { logTravelEvent } from '@/lib/supabase';

import { TravelPhrase } from './TravelPhrase';

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
  const t = useTranslations('Travel.emergency');
  const tc = useTranslations('Common');
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
    logTravelEvent('emergency', 'view');
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
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/travel')} aria-label={t('backToHub')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{
              color: 'text.primary',
              flex: 1,
            }}
          >
            {t('title')}
          </Typography>
          <Button
            startIcon={editing ? <SaveIcon /> : <EditIcon />}
            onClick={editing ? handleSave : () => setEditing(true)}
            variant={editing ? 'contained' : 'outlined'}
            size="small"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {editing ? tc('save') : tc('edit')}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('intro')}
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
                {t('emergencyNumbersTitle')}
              </Typography>
            </Box>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {t('police')}
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
                  {t('ambulanceFire')}
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
                  {t('helpline')}
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
              {t('myHotel')}
            </Typography>
            {editing ? (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label={t('hotelName')}
                  value={info.hotelName}
                  onChange={(e) => updateField('hotelName', e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label={t('hotelAddressLabel')}
                  value={info.hotelAddress}
                  onChange={(e) => updateField('hotelAddress', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  size="small"
                  label={t('hotelPhone')}
                  value={info.hotelPhone}
                  onChange={(e) => updateField('hotelPhone', e.target.value)}
                  fullWidth
                />
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {info.hotelName || t('notSet')}
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
                {t('medicalInfo')}
              </Typography>
            </Box>
            {editing ? (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label={t('medicalConditions')}
                  value={info.medicalConditions}
                  onChange={(e) => updateField('medicalConditions', e.target.value)}
                  fullWidth
                  placeholder={t('medicalConditionsPlaceholder')}
                />
                <TextField
                  size="small"
                  label={t('allergies')}
                  value={info.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                  fullWidth
                  placeholder={t('allergiesPlaceholder')}
                />
                <TextField
                  size="small"
                  label={t('bloodType')}
                  value={info.bloodType}
                  onChange={(e) => updateField('bloodType', e.target.value)}
                  fullWidth
                  placeholder={t('bloodTypePlaceholder')}
                />
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                {info.medicalConditions && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>{t('conditionsLabel')}</strong> {info.medicalConditions}
                  </Typography>
                )}
                {info.allergies && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>{t('allergiesLabel')}</strong> {info.allergies}
                  </Typography>
                )}
                {info.bloodType && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>{t('bloodTypeLabel')}</strong> {info.bloodType}
                  </Typography>
                )}
                {!info.medicalConditions && !info.allergies && !info.bloodType && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {t('notSet')}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          <Divider />

          {/* Emergency contact & embassy */}
          <Box sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand[600], mb: 1.5 }}>
              {t('contacts')}
            </Typography>
            {editing ? (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label={t('emergencyContactLabel')}
                  value={info.emergencyContact}
                  onChange={(e) => updateField('emergencyContact', e.target.value)}
                  fullWidth
                  placeholder={t('emergencyContactPlaceholder')}
                />
                <TextField
                  size="small"
                  label={t('embassyInfoLabel')}
                  value={info.embassyInfo}
                  onChange={(e) => updateField('embassyInfo', e.target.value)}
                  fullWidth
                  placeholder={t('embassyInfoPlaceholder')}
                />
                <TextField
                  size="small"
                  label={t('otherNotes')}
                  value={info.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder={t('otherNotesPlaceholder')}
                />
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                {info.emergencyContact && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>{t('contactLabel')}</strong> {info.emergencyContact}
                  </Typography>
                )}
                {info.embassyInfo && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>{t('embassyLabel')}</strong> {info.embassyInfo}
                  </Typography>
                )}
                {info.notes && (
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    <strong>{t('notesLabel')}</strong> {info.notes}
                  </Typography>
                )}
                {!info.emergencyContact && !info.embassyInfo && !info.notes && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {t('notSet')}
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
            {t('emergencyPhrasesTitle')}
          </Typography>
          <Stack spacing={1}>
            {[
              { jp: '{助|たす}けてください', romaji: 'tasukete kudasai', en: 'Help me please' },
              {
                jp: '{救急車|きゅうきゅうしゃ}を{呼|よ}んでください',
                romaji: 'kyuukyuusha wo yonde kudasai',
                en: 'Please call an ambulance',
              },
              {
                jp: '{警察|けいさつ}を{呼|よ}んでください',
                romaji: 'keisatsu wo yonde kudasai',
                en: 'Please call the police',
              },
              {
                jp: '{英語|えいご}を{話|はな}せる{人|ひと}はいますか？',
                romaji: 'eigo wo hanaseru hito wa imasu ka?',
                en: 'Is there someone who speaks English?',
              },
              {
                jp: 'このホテルに{連|つ}れて{行|い}ってください',
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
                <TravelPhrase
                  japanese={p.jp}
                  romaji={p.romaji}
                  primarySize="0.9rem"
                  secondarySize="0.72rem"
                  layout="row"
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  — {p.en}
                </Typography>
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
              {t('fillInInfo')}
            </Button>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
