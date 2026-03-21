import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

describe('App', () => {
  it('renders the app with header and chat page', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();
  });
});
