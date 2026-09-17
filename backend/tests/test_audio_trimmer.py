"""Tests for the audio trimmer router."""

import array
import shutil
import subprocess
import wave

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import audio_trimmer

client = TestClient(app)

# The export endpoint allows 10 requests a minute, which a test run blows
# through immediately; the limit itself is configuration, not behaviour.
audio_trimmer.limiter.enabled = False

HAS_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None

needs_ffmpeg = pytest.mark.skipif(
    not HAS_FFMPEG, reason="ffmpeg/ffprobe not installed on this machine"
)

SAMPLE_RATE = 8000


@pytest.fixture(scope="module")
def stairs_wav(tmp_path_factory):
    """
    A ten second file whose amplitude steps up every second.

    Reading the level of each second of an export says exactly which source
    seconds survived, which is what distinguishes a correct trim from one that
    merely has the right duration.
    """
    path = tmp_path_factory.mktemp("audio") / "stairs.wav"

    frames = array.array("h")
    for second in range(10):
        amplitude = int(32767 * 0.09 * (second + 1))
        for frame in range(SAMPLE_RATE):
            # A square wave keeps the peak exact under any resampling.
            value = amplitude if (frame // 20) % 2 == 0 else -amplitude
            frames.append(value)

    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(frames.tobytes())

    return path


def post_export(path, **params):
    params.setdefault("output_format", "wav")
    params.setdefault("bitrate", 192)
    with open(path, "rb") as handle:
        return client.post(
            "/api/audio-trimmer/export",
            files={"file": (path.name, handle, "application/octet-stream")},
            data=params,
        )


def levels_per_second(raw_wav: bytes, tmp_path):
    """Peak level of each whole second of a WAV payload, to one decimal."""
    path = tmp_path / "output.wav"
    path.write_bytes(raw_wav)

    with wave.open(str(path), "rb") as handle:
        rate = handle.getframerate()
        channels = handle.getnchannels()
        frames = array.array("h")
        frames.frombytes(handle.readframes(handle.getnframes()))

    step = rate * channels
    levels = []
    for index in range(0, len(frames) - step // 2, step):
        window = frames[index : index + step]
        peak = max(max(window), -min(window)) / 32767.0
        levels.append(round(peak, 1))

    return levels


# --------------------------------------------------------------- validation


def test_rejects_unsupported_extension(stairs_wav):
    with open(stairs_wav, "rb") as handle:
        response = client.post(
            "/api/audio-trimmer/probe",
            files={"file": ("payload.exe", handle, "application/octet-stream")},
        )
    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()["detail"]


def test_rejects_end_before_start(stairs_wav):
    response = post_export(stairs_wav, start=5, end=2, mode="keep")
    assert response.status_code == 400
    assert "greater than start" in response.json()["detail"]


def test_rejects_negative_times(stairs_wav):
    response = post_export(stairs_wav, start=-2, end=4, mode="keep")
    assert response.status_code == 400


def test_rejects_unknown_mode(stairs_wav):
    response = post_export(stairs_wav, start=1, end=4, mode="sideways")
    assert response.status_code == 400


def test_rejects_unknown_output_format(stairs_wav):
    response = post_export(stairs_wav, start=1, end=4, mode="keep", output_format="ogg")
    assert response.status_code == 400


def test_rejects_unsupported_bitrate(stairs_wav):
    response = post_export(
        stairs_wav, start=1, end=4, mode="keep", output_format="mp3", bitrate=7
    )
    assert response.status_code == 400


@needs_ffmpeg
def test_rejects_start_beyond_end_of_file(stairs_wav):
    response = post_export(stairs_wav, start=50, end=55, mode="keep")
    assert response.status_code == 400
    assert "beyond the end" in response.json()["detail"]


@needs_ffmpeg
def test_rejects_removing_the_entire_file(stairs_wav):
    response = post_export(stairs_wav, start=0, end=10, mode="remove")
    assert response.status_code == 400
    assert "empty file" in response.json()["detail"]


# ------------------------------------------------------------------ trimming


@needs_ffmpeg
def test_keep_exports_only_the_selection(stairs_wav, tmp_path):
    source = post_export(stairs_wav, start=0, end=10, mode="keep")
    assert source.status_code == 200
    reference = levels_per_second(source.content, tmp_path)

    response = post_export(stairs_wav, start=2, end=6, mode="keep")
    assert response.status_code == 200
    assert levels_per_second(response.content, tmp_path) == reference[2:6]


@needs_ffmpeg
def test_remove_stitches_the_remaining_pieces(stairs_wav, tmp_path):
    source = post_export(stairs_wav, start=0, end=10, mode="keep")
    reference = levels_per_second(source.content, tmp_path)

    response = post_export(stairs_wav, start=3, end=7, mode="remove")
    assert response.status_code == 200
    assert (
        levels_per_second(response.content, tmp_path)
        == reference[0:3] + reference[7:10]
    )


@needs_ffmpeg
def test_remove_at_the_start_keeps_the_tail(stairs_wav, tmp_path):
    source = post_export(stairs_wav, start=0, end=10, mode="keep")
    reference = levels_per_second(source.content, tmp_path)

    response = post_export(stairs_wav, start=0, end=4, mode="remove")
    assert response.status_code == 200
    assert levels_per_second(response.content, tmp_path) == reference[4:10]


@needs_ffmpeg
def test_remove_at_the_end_keeps_the_head(stairs_wav, tmp_path):
    source = post_export(stairs_wav, start=0, end=10, mode="keep")
    reference = levels_per_second(source.content, tmp_path)

    response = post_export(stairs_wav, start=6, end=10, mode="remove")
    assert response.status_code == 200
    assert levels_per_second(response.content, tmp_path) == reference[0:6]


@needs_ffmpeg
def test_end_past_the_file_is_clamped(stairs_wav, tmp_path):
    exact = post_export(stairs_wav, start=5, end=10, mode="keep")
    past = post_export(stairs_wav, start=5, end=99, mode="keep")

    assert exact.status_code == 200
    assert past.status_code == 200
    assert levels_per_second(past.content, tmp_path) == levels_per_second(
        exact.content, tmp_path
    )


@needs_ffmpeg
@pytest.mark.parametrize("output_format", ["mp3", "m4a", "m4r", "wav"])
def test_every_output_format_encodes(stairs_wav, output_format):
    response = post_export(
        stairs_wav,
        start=1,
        end=4,
        mode="keep",
        output_format=output_format,
        bitrate=128,
    )

    assert response.status_code == 200
    assert len(response.content) > 1000
    assert f"stairs_trimmed.{output_format}" in response.headers["content-disposition"]


@needs_ffmpeg
def test_output_filename_is_derived_from_the_upload(stairs_wav):
    with open(stairs_wav, "rb") as handle:
        response = client.post(
            "/api/audio-trimmer/export",
            files={
                "file": ("../../etc/My Song.wav", handle, "application/octet-stream")
            },
            data={"start": 1, "end": 3, "mode": "keep", "output_format": "wav"},
        )

    assert response.status_code == 200
    disposition = response.headers["content-disposition"]
    assert ".." not in disposition
    assert "/" not in disposition.split("filename=")[1]


# --------------------------------------------------------------------- probe


@needs_ffmpeg
def test_probe_reports_duration_and_peaks(stairs_wav):
    with open(stairs_wav, "rb") as handle:
        response = client.post(
            "/api/audio-trimmer/probe",
            files={"file": (stairs_wav.name, handle, "application/octet-stream")},
            data={"peaks": 100},
        )

    assert response.status_code == 200
    body = response.json()
    assert abs(body["duration"] - 10.0) < 0.2
    assert len(body["peaks"]) == 100
    # The fixture ramps from quiet to loud, so the last bucket beats the first.
    assert body["peaks"][-1] > body["peaks"][0]
    assert all(0.0 <= peak <= 1.0 for peak in body["peaks"])


def test_probe_rejects_absurd_peak_counts(stairs_wav):
    with open(stairs_wav, "rb") as handle:
        response = client.post(
            "/api/audio-trimmer/probe",
            files={"file": (stairs_wav.name, handle, "application/octet-stream")},
            data={"peaks": 1_000_000},
        )
    assert response.status_code == 400


@needs_ffmpeg
def test_probe_rejects_a_file_that_is_not_audio(tmp_path):
    path = tmp_path / "not_really.wav"
    path.write_bytes(b"this is not a wav file at all")

    with open(path, "rb") as handle:
        response = client.post(
            "/api/audio-trimmer/probe",
            files={"file": (path.name, handle, "application/octet-stream")},
        )

    assert response.status_code == 400


def test_probe_rejects_an_empty_file(tmp_path):
    path = tmp_path / "empty.wav"
    path.write_bytes(b"")

    with open(path, "rb") as handle:
        response = client.post(
            "/api/audio-trimmer/probe",
            files={"file": (path.name, handle, "application/octet-stream")},
        )

    assert response.status_code == 400


# ------------------------------------------------------------- unit coverage


def test_bucket_peaks_normalises_to_unit_range():
    samples = array.array("h", [0, 16384, -32768, 32767] * 16)
    peaks = audio_trimmer._bucket_peaks(samples, 4)

    assert len(peaks) == 4
    assert all(0.0 <= peak <= 1.0 for peak in peaks)
    assert max(peaks) == 1.0


def test_bucket_peaks_on_silence():
    peaks = audio_trimmer._bucket_peaks(array.array("h", [0] * 100), 10)
    assert peaks == [0.0] * 10


def test_selection_args_use_concat_only_when_both_sides_survive():
    middle = audio_trimmer._build_selection_args(2.0, 4.0, "remove", 10.0)
    assert "-filter_complex" in middle

    head = audio_trimmer._build_selection_args(0.0, 4.0, "remove", 10.0)
    assert "-filter_complex" not in head
    assert head[:2] == ["-ss", "4.000000"]

    tail = audio_trimmer._build_selection_args(6.0, 10.0, "remove", 10.0)
    assert "-filter_complex" not in tail
    assert tail[:2] == ["-to", "6.000000"]


@needs_ffmpeg
def test_ffmpeg_is_available_in_this_environment():
    """The router is useless without ffmpeg, so state the dependency outright."""
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True)
    assert result.returncode == 0
