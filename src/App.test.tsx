import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { App } from './App';
import { fixture } from './test/fakes';
vi.mock('./LanternScene', () => ({ LanternScene: () => <div>Harbor scene</div> }));
it('requires consent and a key, starts only on click, and releases the camera on Stop', async () => {
  const f = fixture(), user = userEvent.setup(); render(<App createSensor={f.create} capture={f.capture}/>);
  const start = screen.getByRole('button', { name: /Light the lantern/ });
  expect(start).toBeDisabled(); expect(f.capture).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/Presage API key/), 'test-key'); expect(start).toBeDisabled();
  await user.click(screen.getByRole('checkbox')); expect(start).toBeEnabled(); expect(f.capture).not.toHaveBeenCalled();
  await user.click(start); await waitFor(() => expect(f.sensor.start).toHaveBeenCalledWith(f.stream));
  await user.click(screen.getByRole('button', { name: /Stop & release/ }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Camera off'));
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByLabelText(/Presage API key/)).toHaveValue('');
});
it('releases camera tracks when the view unmounts', async () => {
  const f = fixture(), user = userEvent.setup(); const view = render(<App createSensor={f.create} capture={f.capture}/>);
  await user.type(screen.getByLabelText(/Presage API key/), 'test-key'); await user.click(screen.getByRole('checkbox')); await user.click(screen.getByRole('button', { name: /Light the lantern/ }));
  await waitFor(() => expect(f.sensor.start).toHaveBeenCalled()); view.unmount();
  await waitFor(() => expect(f.track.stop).toHaveBeenCalledOnce());
});
it('disables camera capture when native runtime loading failed', async () => {
  history.replaceState({}, '', '?sdk=unavailable');
  try {
    const f = fixture(), user = userEvent.setup(); render(<App createSensor={f.create} capture={f.capture}/>);
    await user.type(screen.getByLabelText(/Presage API key/), 'test-key'); await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('alert')).toHaveTextContent('native runtime could not load');
    expect(screen.getByRole('button', { name: /Light the lantern/ })).toBeDisabled(); expect(f.capture).not.toHaveBeenCalled();
  } finally { history.replaceState({}, '', '/'); }
});
