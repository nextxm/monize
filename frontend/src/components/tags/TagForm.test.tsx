import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/render';
import { TagForm } from './TagForm';

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (values: any) => {
    const errors: any = {};
    if (!values.name || values.name.trim() === '') {
      errors.name = { type: 'required', message: 'Tag name is required' };
    }
    if (Object.keys(errors).length > 0) {
      return { values: {}, errors };
    }
    return { values, errors: {} };
  },
}));

describe('TagForm', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form with all fields', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText('Tag Name')).toBeInTheDocument();
    expect(screen.getByText('Colour')).toBeInTheDocument();
    expect(screen.getByText('Create Tag')).toBeInTheDocument();
  });

  it('renders update form when editing a tag', () => {
    const tag = {
      id: 't1',
      userId: 'u1',
      name: 'Groceries',
      color: '#ef4444',
      icon: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    render(<TagForm tag={tag} onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText('Update Tag')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument();
  });

  it('renders empty name field in create mode', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    const nameInput = screen.getByRole('textbox');
    expect(nameInput).toHaveValue('');
  });

  it('calls onCancel when cancel is clicked', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows validation error when name is empty on submit', async () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Create Tag'));
    await waitFor(() => {
      expect(screen.getByText('Tag name is required')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form data on valid submission', async () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'My Tag' } });
    fireEvent.click(screen.getByText('Create Tag'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Tag' }),
        expect.anything(),
      );
    });
  });

  it('renders colour swatches with palette options', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByTitle('Red')).toBeInTheDocument();
    expect(screen.getByTitle('Blue')).toBeInTheDocument();
    expect(screen.getByTitle('Green')).toBeInTheDocument();
    expect(screen.getByTitle('No colour')).toBeInTheDocument();
  });

  it('selects colour when swatch is clicked', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    const redSwatch = screen.getByTitle('Red');
    fireEvent.click(redSwatch);
    expect(redSwatch.className).toContain('ring-2');
  });

  it('renders a mobile colour dropdown with all palette options', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    const selects = screen.getAllByRole('combobox');
    const colourSelect = selects.find(s => {
      const options = s.querySelectorAll('option');
      return Array.from(options).some(o => o.textContent === 'Red');
    });
    expect(colourSelect).toBeTruthy();

    const options = colourSelect!.querySelectorAll('option');
    const optionLabels = Array.from(options).map(o => o.textContent);
    expect(optionLabels).toContain('No colour');
    expect(optionLabels).toContain('Red');
    expect(optionLabels).toContain('Blue');
    expect(optionLabels).toContain('Green');
  });

  it('selects colour via mobile dropdown', () => {
    render(<TagForm onSubmit={onSubmit} onCancel={onCancel} />);
    const selects = screen.getAllByRole('combobox');
    const colourSelect = selects.find(s => {
      const options = s.querySelectorAll('option');
      return Array.from(options).some(o => o.textContent === 'Red');
    });
    expect(colourSelect).toBeTruthy();

    fireEvent.change(colourSelect!, { target: { value: '#ef4444' } });

    const redSwatch = screen.getByTitle('Red');
    expect(redSwatch.className).toContain('ring-2');
  });

  it('pre-fills colour when editing a tag with colour', () => {
    const tag = {
      id: 't1',
      userId: 'u1',
      name: 'Urgent',
      color: '#ef4444',
      icon: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    render(<TagForm tag={tag} onSubmit={onSubmit} onCancel={onCancel} />);
    const redSwatch = screen.getByTitle('Red');
    expect(redSwatch.className).toContain('ring-2');
  });
});
