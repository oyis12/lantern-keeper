export type CameraProfile = 'standard' | 'lower-load';
export async function captureCamera(profile: CameraProfile = 'standard'): Promise<MediaStream> {
  const width = profile === 'lower-load' ? 640 : 1280;
  const height = profile === 'lower-load' ? 480 : 720;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: width, max: width },
        height: { ideal: height, max: height },
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
