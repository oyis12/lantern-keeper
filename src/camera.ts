export async function captureCamera(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { min: 25, ideal: 30 },
        facingMode: 'user',
      },
    });
    const mode = stream.getVideoTracks()[0]?.getSettings();
    if (typeof mode?.frameRate === 'number' && mode.frameRate < 25) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error(`The camera selected ${mode.frameRate.toFixed(1)} fps. SmartSpectra needs at least 25 fps. Improve lighting, close other camera apps, or use a camera mode supporting 30 fps.`);
    }
    return stream;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OverconstrainedError') {
      throw new Error('This camera cannot provide the requested mode at 25–30 fps. Close other camera apps, improve lighting, or use a webcam that supports 30 fps.');
    }
    throw error;
  }
}
