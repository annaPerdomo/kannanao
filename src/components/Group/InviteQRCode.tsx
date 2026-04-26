'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintIcon from '@mui/icons-material/Print';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { Alert, Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';

interface InviteQRCodeProps {
  open: boolean;
  onClose: () => void;
  code: string;
  label: string | null;
  organizerName: string;
}

export function InviteQRCode({ open, onClose, code, label, organizerName }: InviteQRCodeProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kannanao Invite</title>
        <style>
          @media print {
            @page { margin: 1.5cm; }
          }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 2rem;
            box-sizing: border-box;
            color: #333;
          }
          .logo {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }
          .qr-container {
            margin: 2rem 0;
            padding: 1.5rem;
            border: 2px solid ${brand[200]};
            border-radius: 16px;
            background: ${alpha(brand[50], 0.5)};
          }
          .message {
            font-size: 1.1rem;
            text-align: center;
            max-width: 400px;
            line-height: 1.6;
            margin: 1rem 0;
          }
          .url {
            font-family: monospace;
            font-size: 0.85rem;
            color: #666;
            word-break: break-all;
            text-align: center;
            margin-top: 1rem;
          }
          .label {
            font-size: 0.9rem;
            color: #888;
            margin-top: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="logo">🌸 Kannanao</div>
        ${label ? `<div class="label">${label}</div>` : ''}
        <div class="qr-container">
          ${content.querySelector('svg')?.outerHTML ?? ''}
        </div>
        <div class="message">
          Scan this code to join <strong>${organizerName}</strong>'s study group on Kannanao!
        </div>
        <div class="url">${inviteUrl}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <StyledDialog
        open={open}
        onClose={onClose}
        title="Invite QR Code"
        subtitle={label || 'Share this with new members'}
        icon={<QrCode2Icon sx={{ color: brand[600], fontSize: 22 }} />}
        maxWidth="xs"
      >
        <Stack alignItems="center" gap={2.5} sx={{ py: 1 }}>
          <Box
            ref={printRef}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `2px solid ${alpha(brand[200], 0.5)}`,
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QRCodeSVG value={inviteUrl} size={200} level="M" />
          </Box>

          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'text.secondary',
              lineHeight: 1.6,
            }}
          >
            Scan this code to join <strong>{organizerName}</strong>&apos;s study group on Kannanao!
          </Typography>

          <Box
            sx={{
              width: '100%',
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(brand[100], 0.3),
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'text.secondary',
              wordBreak: 'break-all',
              textAlign: 'center',
            }}
          >
            {inviteUrl}
          </Box>

          <Stack direction="row" gap={1.5}>
            <Button
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                borderRadius: 6,
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              Copy link
            </Button>
            <Button
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                borderRadius: 6,
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              Print
            </Button>
          </Stack>
        </Stack>
      </StyledDialog>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setCopied(false)}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}
