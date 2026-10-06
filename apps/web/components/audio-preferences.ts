export function preferredMicrophone(): MediaTrackConstraints | true {
  try {
    const deviceId = localStorage.getItem("makeng-audio-input");
    return deviceId ? { deviceId: { exact: deviceId } } : true;
  } catch {
    return true;
  }
}
export async function applyAudioOutput(audio: HTMLMediaElement) {
  let deviceId = "";
  try {
    deviceId = localStorage.getItem("makeng-audio-output") ?? "";
  } catch {
    return;
  }
  if ("setSinkId" in audio) {
    try {
      await audio.setSinkId(deviceId);
    } catch {
      throw new Error(
        "Không dùng được loa đã chọn. Mở Settings, chọn lại đầu ra hoặc Mặc định hệ thống.",
      );
    }
  } else if (deviceId)
    throw new Error(
      "Trình duyệt chưa hỗ trợ chọn loa riêng; đang dùng đầu ra hệ thống.",
    );
}
