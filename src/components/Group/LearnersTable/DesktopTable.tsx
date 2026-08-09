'use client';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { alpha, useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { LEARNER_COLUMNS } from './columns';
import type { SortDirection, SortKey } from './derive';
import { LearnerIdentity } from './LearnerIdentity';

interface DesktopTableProps {
  members: GroupMember[];
  sortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  onSelect: (id: string) => void;
}

/** The proper table for `sm` and up; xs gets `MobileList` instead. */
export function DesktopTable({ members, sortKey, direction, onSort, onSelect }: DesktopTableProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.learnersTable');
  const cellSx = { borderColor: alpha(brand[300], 0.25) };

  return (
    <TableContainer sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 580 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', border: 0 }}>
              {t('colLearner')}
            </TableCell>
            {LEARNER_COLUMNS.map((col) => (
              <TableCell
                key={col.key}
                align={col.align}
                sortDirection={sortKey === col.key ? direction : false}
                sx={{ fontWeight: 700, color: 'text.secondary', border: 0 }}
              >
                <TableSortLabel
                  active={sortKey === col.key}
                  direction={sortKey === col.key ? direction : 'desc'}
                  onClick={() => onSort(col.key)}
                >
                  {t(col.labelKey)}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell sx={{ border: 0 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow
              key={member.id}
              hover
              onClick={() => onSelect(member.id)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={cellSx}>
                <LearnerIdentity member={member} onSelect={onSelect} />
              </TableCell>
              {LEARNER_COLUMNS.map((col) => (
                <TableCell key={col.key} align={col.align} sx={cellSx}>
                  <col.Cell member={member} />
                </TableCell>
              ))}
              <TableCell align="right" sx={cellSx}>
                <ChevronRightIcon aria-hidden sx={{ fontSize: 18, color: 'text.secondary' }} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
