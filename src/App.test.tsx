import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { App } from './App';
import { fixture } from './test/fakes';
vi.mock('./LanternScene', () => ({ LanternScene: () => <div>Harbor scene</div> }));
it('uses the selected lower-load mode only after consent and Start', async () => {
  const f = fixture(), user = userEvent.setup();
  Object.assign(f.stream, { getVideoTracks: () => [{ getSettings: () => ({ width: 640, height: 480, frameRate: 30 }) }] });
  const getUserMedia = vi.fn().mockResolvedValue(f.stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  render(<App createSensor={f.create}/>);
  await user.selectOptions(screen.getByLabelText('Capture size'), 'lower-load'); expect(getUserMedia).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/Presage API key/), 'test-key'); await user.click(screen.getByRole('checkbox'));
  expect(getUserMedia).not.toHaveBeenCalled(); await user.click(screen.getByRole('button', { name: /Light the lantern/ }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: expect.objectContaining({ width: { ideal: 640, max: 640 } }) })));
  expect(screen.queryByLabelText('Capture size')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Stop & release/ }));
  await waitFor(() => expect(screen.getByLabelText('Capture size')).toHaveValue('lower-load'));
  expect(f.track.stop).toHaveBeenCalledOnce();
});
it('keeps diagnostic counts and mode readable after processing fails and the preview closes', async () => {
  const f = fixture(), user = userEvent.setup();
  Object.assign(f.stream, { getVideoTracks: () => [{ getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }) }] });
  render(<App createSensor={f.create} capture={f.capture}/>);
  await user.type(screen.getByLabelText(/Presage API key/), 'test-key'); await user.click(screen.getByRole('checkbox')); await user.click(screen.getByRole('button', { name: /Light the lantern/ }));
  await waitFor(() => expect(f.sensor.start).toHaveBeenCalled());
  await act(async () => { f.frame(true, 1); f.frame(false, 2); f.error('Processing failed'); });
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Session needs attention'));
  expect(screen.getByText(/Camera mode: 1280 × 720/)).toBeVisible();
  expect(screen.getByText(/SDK frame callbacks: 2/)).toBeVisible();
  expect(screen.getByLabelText('Local camera framing preview')).not.toBeVisible();
  expect(f.track.stop).toHaveBeenCalledOnce();
});
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
