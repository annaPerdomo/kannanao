import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReviewCardRow, type ReviewCardValue } from '@/components/ReviewCard';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/api', () => ({
  deleteStorageImage: vi.fn(),
  decodeUnsplashAttribution: vi.fn(() => null),
  encodeUnsplashUrl: vi.fn((r: { url: string }) => r.url),
  fetchImage: vi.fn(),
  formatFurigana: vi.fn(),
  isStorageImage: vi.fn(() => false),
  triggerUnsplashDownload: vi.fn(),
  uploadImage: vi.fn(),
}));

import { fetchImage } from '@/services/api';

const mockFetchImage = vi.mocked(fetchImage);

function value(over: Partial<ReviewCardValue> = {}): ReviewCardValue {
  return {
    word: '入居者',
    reading: 'にゅうきょしゃ',
    meaning: 'resident, tenant',
    exampleJp: '{犬|いぬ}が{増|ふ}えた。',
    exampleEn: 'The number of residents increased.',
    imageQuery: 'apartment',
    imageUrl: null,
    jlptLevel: null,
    ...over,
  };
}

function renderRow(
  valueOver: Partial<ReviewCardValue> = {},
  rowProps: Partial<React.ComponentProps<typeof ReviewCardRow>> = {},
) {
  const onChange = vi.fn();
  renderWithProviders(<ReviewCardRow value={value(valueOver)} onChange={onChange} {...rowProps} />);
  return { onChange };
}

describe('ReviewCardRow summary', () => {
  it('shows the word, the reading and the meaning', () => {
    renderRow();
    expect(screen.getByText('入居者')).toBeInTheDocument();
    expect(screen.getByText('にゅうきょしゃ')).toBeInTheDocument();
    expect(screen.getByText('resident, tenant')).toBeInTheDocument();
  });

  it('reveals the fields and image when expanded', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByLabelText('Find a new picture')).toBeInTheDocument();
    expect(screen.getByDisplayValue('入居者')).toBeInTheDocument();
  });
});

describe('ReviewCardRow editing', () => {
  it('calls onChange({ word }) when the word field changes', () => {
    const { onChange } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    fireEvent.change(screen.getByDisplayValue('入居者'), { target: { value: '入居人' } });
    expect(onChange).toHaveBeenCalledWith({ word: '入居人' });
  });

  it('calls onChange({ exampleJp }) with the reflowed markup when a reading changes', () => {
    const { onChange } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    fireEvent.click(screen.getByLabelText('Edit reading'));
    const readingInput = screen.getByLabelText('Reading for 増');
    fireEvent.change(readingInput, { target: { value: 'ぞう' } });
    expect(onChange).toHaveBeenCalledWith({
      exampleJp: '{犬|いぬ}が{増|ぞう}えた。',
    });
  });
});

describe('ReviewCardRow image', () => {
  it('refreshes the picture and shows an error on failure', async () => {
    mockFetchImage.mockResolvedValueOnce({
      url: 'https://images.unsplash.com/new',
      downloadLocation: 'https://api.unsplash.com/photos/x/download',
      photographerName: 'Jane',
      photographerUrl: 'https://unsplash.com/@jane',
      photoPageUrl: 'https://unsplash.com/photos/x',
    });
    const { onChange } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));

    fireEvent.click(screen.getByLabelText('Find a new picture'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ imageUrl: expect.any(String) }));
    expect(mockFetchImage).toHaveBeenCalledWith('apartment');

    mockFetchImage.mockRejectedValueOnce(new Error('nope'));
    fireEvent.click(screen.getByLabelText('Find a new picture'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Couldn't find a picture. Try different words.",
      ),
    );
  });

  it('falls back to the meaning when the search words are blank', async () => {
    mockFetchImage.mockResolvedValueOnce({
      url: 'https://images.unsplash.com/new',
      downloadLocation: 'https://api.unsplash.com/photos/x/download',
      photographerName: 'Jane',
      photographerUrl: 'https://unsplash.com/@jane',
      photoPageUrl: 'https://unsplash.com/photos/x',
    });
    renderRow({ imageQuery: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));

    fireEvent.click(screen.getByLabelText('Find a new picture'));
    await waitFor(() => expect(mockFetchImage).toHaveBeenCalledWith('resident, tenant'));
  });
});

describe('ReviewCardRow disabled', () => {
  it('disables the fields and the image buttons', () => {
    renderRow({}, { disabled: true });
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByDisplayValue('入居者')).toBeDisabled();
    expect(screen.getByLabelText('Find a new picture')).toBeDisabled();
  });
});

describe('ReviewCardRow slots', () => {
  it('renders leading/chips/actions and does not toggle expansion from actions', () => {
    const onExpandedChange = vi.fn();
    renderWithProviders(
      <ReviewCardRow
        value={value()}
        onChange={vi.fn()}
        onExpandedChange={onExpandedChange}
        leading={<span>leading-slot</span>}
        chips={<span>chip-slot</span>}
        actions={<button type="button">action-slot</button>}
      />,
    );
    expect(screen.getByText('leading-slot')).toBeInTheDocument();
    expect(screen.getByText('chip-slot')).toBeInTheDocument();
    expect(screen.getByText('action-slot')).toBeInTheDocument();

    fireEvent.click(screen.getByText('action-slot'));
    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it('calls the action handler but does not toggle expansion when Enter is pressed on it', async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const actionHandler = vi.fn();
    renderWithProviders(
      <ReviewCardRow
        value={value()}
        onChange={vi.fn()}
        onExpandedChange={onExpandedChange}
        actions={
          <button type="button" onClick={actionHandler}>
            action-slot
          </button>
        }
      />,
    );

    screen.getByText('action-slot').focus();
    await user.keyboard('{Enter}');

    expect(actionHandler).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).not.toHaveBeenCalled();
  });
});
