"""Log-mel features for the Conformer, in numpy (no torch), written to match NeMo's AudioToMelSpectrogramPreprocessor:

    pre-emphasis -> STFT (zero-padded, centre=True, non-periodic Hann) -> |.|^mag_power -> Slaney mel filterbank
    -> log(x + guard) -> per-feature normalisation (mean / unbiased std over the frames)

Every number comes from config.json, which tools/asr/export_sanskrit_onnx.py writes from the model's own preprocessor
settings -- nothing here is guessed. tools/asr/export_sanskrit_onnx.py also checks this file against NeMo on a real clip
(max difference printed); run that check after any change.
"""
import numpy as np


def _hz_to_mel(f):
    f = np.asarray(f, dtype=np.float64)
    f_sp = 200.0 / 3
    min_log_hz = 1000.0
    min_log_mel = min_log_hz / f_sp
    logstep = np.log(6.4) / 27.0
    return np.where(f >= min_log_hz, min_log_mel + np.log(np.maximum(f, 1e-10) / min_log_hz) / logstep, f / f_sp)


def _mel_to_hz(m):
    m = np.asarray(m, dtype=np.float64)
    f_sp = 200.0 / 3
    min_log_hz = 1000.0
    min_log_mel = min_log_hz / f_sp
    logstep = np.log(6.4) / 27.0
    return np.where(m >= min_log_mel, min_log_hz * np.exp(logstep * (m - min_log_mel)), f_sp * m)


def mel_filterbank(sr, n_fft, n_mels, fmin=0.0, fmax=None):
    """librosa.filters.mel(sr, n_fft, n_mels, fmin, fmax, htk=False, norm='slaney')"""
    fmax = fmax or sr / 2.0
    n_freq = 1 + n_fft // 2
    freqs = np.linspace(0, sr / 2.0, n_freq)
    hz = _mel_to_hz(np.linspace(_hz_to_mel(fmin), _hz_to_mel(fmax), n_mels + 2))
    fdiff = np.diff(hz)
    ramps = hz[:, None] - freqs[None, :]
    w = np.zeros((n_mels, n_freq))
    for i in range(n_mels):
        lower = -ramps[i] / fdiff[i]
        upper = ramps[i + 2] / fdiff[i + 1]
        w[i] = np.maximum(0, np.minimum(lower, upper))
    w *= (2.0 / (hz[2:n_mels + 2] - hz[:n_mels]))[:, None]
    return w.astype(np.float32)


class Featurizer:
    def __init__(self, cfg):
        p = cfg["preprocessor"]
        self.sr = int(p.get("sample_rate", 16000))
        self.win = int(round(float(p.get("window_size", 0.025)) * self.sr))
        self.hop = int(round(float(p.get("window_stride", 0.01)) * self.sr))
        self.n_fft = int(p.get("n_fft") or 2 ** int(np.ceil(np.log2(self.win))))
        self.n_mels = int(p.get("features", 80))
        self.preemph = float(p.get("preemph", 0.97))
        self.mag_power = float(p.get("mag_power", 2.0))
        self.guard = float(p.get("log_zero_guard_value", 2 ** -24))
        self.normalize = p.get("normalize", "per_feature")
        self.fmin = float(p.get("lowfreq", 0.0))
        self.fmax = p.get("highfreq")
        # torch.hann_window(win, periodic=False), zero-padded on both sides to n_fft (what torch.stft does)
        w = np.hanning(self.win)                                               # symmetric, as torch.hann_window(periodic=False)
        pad = (self.n_fft - self.win) // 2
        self.window = np.pad(w, (pad, self.n_fft - self.win - pad)).astype(np.float32)
        self.fb = mel_filterbank(self.sr, self.n_fft, self.n_mels, self.fmin, self.fmax)

    def __call__(self, wav):
        """wav: float32 mono at self.sr, range -1..1  ->  (features [1, n_mels, T], length [1])"""
        x = np.asarray(wav, dtype=np.float32)
        if x.size == 0:
            raise ValueError("empty audio")
        if self.preemph:
            x = np.concatenate([x[:1], x[1:] - self.preemph * x[:-1]])
        pad = self.n_fft // 2
        x = np.pad(x, (pad, pad))                                              # centre=True, pad_mode="constant"
        n_frames = 1 + (x.size - self.n_fft) // self.hop
        idx = np.arange(self.n_fft)[None, :] + self.hop * np.arange(n_frames)[:, None]
        frames = x[idx] * self.window[None, :]
        spec = np.abs(np.fft.rfft(frames, n=self.n_fft, axis=1))               # [T, n_freq]
        if self.mag_power != 1.0:
            spec = spec ** self.mag_power
        mel = self.fb @ spec.T.astype(np.float32)                              # [n_mels, T]
        mel = np.log(mel + self.guard)
        if self.normalize == "per_feature":
            t = mel.shape[1]
            mean = mel.mean(axis=1, keepdims=True)
            std = np.sqrt(((mel - mean) ** 2).sum(axis=1, keepdims=True) / max(t - 1, 1)) + 1e-5
            mel = (mel - mean) / std
        return mel[None].astype(np.float32), np.array([mel.shape[1]], dtype=np.int64)
