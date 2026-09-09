'use client';
import type { GroupMember } from '@/hooks/useGroup';
import type { CreateInviteParams, InviteCode } from '@/hooks/useInvites';
import type { Deck } from '@/types/deck';

import { CreateAssignmentDialog } from './CreateAssignmentDialog';
import { CreateInviteDialog } from './CreateInviteDialog';
import { InviteQRCode } from './InviteQRCode';
import type { AssignDialogState } from './useAssignDialog';

interface GroupDashboardDialogsProps {
  assignDialog: AssignDialogState;
  members: GroupMember[];
  ownDecks: Deck[];
  onCreateAssignment: (opts: {
    memberIds: string[];
    deckId?: string;
    kanaSet?: string;
    title?: string;
    note?: string;
    dueDate?: string;
    availableOn?: string;
    requiredAccuracy?: number;
    requiredMode?: string;
  }) => Promise<void>;
  createInviteOpen: boolean;
  onCloseCreateInvite: () => void;
  onCreateInvite: (params: CreateInviteParams) => Promise<InviteCode>;
  invites: InviteCode[];
  onRevokeInvite: (id: string) => void;
  qrInvite: InviteCode | null;
  onCreatedInvite: (invite: InviteCode) => void;
  onShowQr: (invite: InviteCode) => void;
  onCloseQr: () => void;
  organizerName: string;
}

export function GroupDashboardDialogs({
  assignDialog,
  members,
  ownDecks,
  onCreateAssignment,
  createInviteOpen,
  onCloseCreateInvite,
  onCreateInvite,
  invites,
  onRevokeInvite,
  qrInvite,
  onCreatedInvite,
  onShowQr,
  onCloseQr,
  organizerName,
}: GroupDashboardDialogsProps) {
  return (
    <>
      <CreateAssignmentDialog
        key={assignDialog.session}
        open={assignDialog.open}
        onClose={assignDialog.closeAssign}
        members={members}
        decks={ownDecks}
        preSelectedDeckId={assignDialog.preset?.deckId}
        preSelectedKanaSet={assignDialog.preset?.kanaSet}
        preSelectedMembers={assignDialog.preset?.memberIds}
        preSelectedFields={assignDialog.preset?.fields}
        onCreate={onCreateAssignment}
      />

      <CreateInviteDialog
        open={createInviteOpen}
        onClose={onCloseCreateInvite}
        onCreate={onCreateInvite}
        onCreated={onCreatedInvite}
        invites={invites}
        onRevoke={onRevokeInvite}
        onShowQR={onShowQr}
      />

      {qrInvite && (
        <InviteQRCode
          open={Boolean(qrInvite)}
          onClose={onCloseQr}
          code={qrInvite.code}
          label={qrInvite.label}
          organizerName={organizerName}
        />
      )}
    </>
  );
}
