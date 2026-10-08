'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CollectionsIcon from '@mui/icons-material/Collections';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CreateDeckDialog } from '@/components/CreateDeckDialog';
import { DataErrorState } from '@/components/DataErrorState';
import { DeckGrid } from '@/components/DeckGrid';
import { AddDeckToGroupDialog } from '@/components/Group';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ReorderBanner } from '@/components/ReorderBanner';
import { ShareEmbedDialog } from '@/components/ShareEmbedDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDecks } from '@/hooks/useDecks';
import { LAYOUT } from '@/theme';

export default function Decks() {
  const t = useTranslations('Deck.decksPage');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const router = useRouter();

  const {
    decks,
    loading,
    error,
    retry,
    deleteDeck,
    pinDeck,
    setDeckPublic,
    updateDeckEmoji,
    reorderDecks,
  } = useDecks();
  const { user, isMemberAccount } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');
  const [addToGroupDeckId, setAddToGroupDeckId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;
  const canReorder = !isMemberAccount && decks.length > 1;

  const handleShare = (id: string) => {
    setShareDeckId(id);
    setShareDeckName(decks.find((d) => d.id === id)?.name ?? '');
  };

  const handleAddToGroup = isMemberAccount ? undefined : setAddToGroupDeckId;

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.contentMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Loading message={t('loadingDecks')} />
      </Box>
    );
  }

  const pinnedDecks = decks.filter((d) => d.pinned);
  const unpinnedDecks = decks.filter((d) => !d.pinned);
  const addToGroupDeck = decks.find((d) => d.id === addToGroupDeckId);

  return (
    <Box
      sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 5 } }}
    >
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
        <PageHeader
          icon={<CollectionsIcon />}
          title={t('title')}
          subtitle={t('subtitle')}
          onBack={() => router.push('/')}
          action={
            !isMemberAccount ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canReorder && (
                  <Button
                    variant={reordering ? 'contained' : 'outlined'}
                    startIcon={reordering ? <CheckIcon /> : <SwapVertIcon />}
                    onClick={() => setReordering((v) => !v)}
                    sx={{
                      borderRadius: 3,
                      px: 2,
                      py: 1,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      ...(reordering
                        ? {
                            background: `linear-gradient(135deg, ${accent[400]}, ${accent[500]})`,
                            boxShadow: `0 4px 16px ${alpha(accent[400], 0.35)}`,
                            '&:hover': {
                              background: `linear-gradient(135deg, ${accent[500]}, ${accent[600]})`,
                            },
                          }
                        : {
                            borderColor: alpha(brand[400], 0.5),
                            color: brand[600],
                            '&:hover': {
                              borderColor: brand[500],
                              bgcolor: alpha(brand[100], 0.5),
                            },
                          }),
                    }}
                  >
                    {reordering ? tCommon('done') : t('reorderButton')}
                  </Button>
                )}
                {!reordering && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{
                      borderRadius: 3,
                      px: 2.5,
                      py: 1,
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})`,
                      boxShadow: `0 4px 16px ${alpha(brand[400], 0.35)}`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${brand[500]}, ${accent[500]})`,
                      },
                    }}
                  >
                    {t('newDeckButton')}
                  </Button>
                )}
              </Box>
            ) : undefined
          }
        />
      </Box>

      {reordering && <ReorderBanner label={t('reorderBannerLabel')} />}

      {error && decks.length === 0 ? (
        <DataErrorState error={error} onRetry={retry} />
      ) : decks.length === 0 ? (
        <Box
          sx={{
            border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
            borderRadius: 4,
            p: 8,
            textAlign: 'center',
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '3.5rem', mb: 2 }}>📭</Typography>
          <Typography variant="h6" sx={{ color: brand[700], fontWeight: 700, mb: 1 }}>
            {isMemberAccount ? t('noDecksSharedYet') : t('noDecksYet')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
            {isMemberAccount ? t('memberEmptyHint') : t('ownerEmptyHint')}
          </Typography>
          {!isMemberAccount && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              {t('createDeckButton')}
            </Button>
          )}
        </Box>
      ) : (
        <>
          {/* Pinned section */}
          {pinnedDecks.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  color: brand[700],
                  fontWeight: 800,
                  mb: 2,
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {t('pinnedToHome')}
              </Typography>
              <DeckGrid
                decks={pinnedDecks}
                reordering={reordering}
                onReorder={reorderDecks}
                onOpen={(id) => router.push(`/deck/${id}`)}
                onDelete={deleteDeck}
                onShare={handleShare}
                onPin={pinDeck}
                onEmojiChange={updateDeckEmoji}
                onAddToGroup={handleAddToGroup}
                isOwner={isOwner}
              />
            </Box>
          )}

          {/* Unpinned / all section */}
          {unpinnedDecks.length > 0 && (
            <Box>
              {pinnedDecks.length > 0 && (
                <Typography
                  variant="h6"
                  sx={{
                    color: brand[700],
                    fontWeight: 800,
                    mb: 2,
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('allDecks')}
                </Typography>
              )}
              <DeckGrid
                decks={unpinnedDecks}
                reordering={reordering}
                onReorder={reorderDecks}
                onOpen={(id) => router.push(`/deck/${id}`)}
                onDelete={deleteDeck}
                onShare={handleShare}
                onPin={pinDeck}
                onEmojiChange={updateDeckEmoji}
                onAddToGroup={handleAddToGroup}
                isOwner={isOwner}
              />
            </Box>
          )}
        </>
      )}

      <CreateDeckDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <ShareEmbedDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
        isPublic={decks.find((d) => d.id === shareDeckId)?.isPublic ?? false}
        onPublicChange={(val) => {
          if (shareDeckId) setDeckPublic(shareDeckId, val);
        }}
      />

      {addToGroupDeck && (
        <AddDeckToGroupDialog
          open={Boolean(addToGroupDeckId)}
          onClose={() => setAddToGroupDeckId(null)}
          deckId={addToGroupDeck.id}
          deckName={addToGroupDeck.name}
        />
      )}
    </Box>
  );
}
