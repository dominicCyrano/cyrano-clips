import argparse
import json
import sys

import modal

app = modal.App("cyrano-transcription")
JSON_MARKER = "__CYRANO_TRANSCRIPT_JSON__"


def download_models():
    """Pre-download all model weights at image build time."""
    import os

    import huggingface_hub
    import omegaconf
    import torch
    import whisperx

    torch.serialization.add_safe_globals(
        [
            omegaconf.listconfig.ListConfig,
            omegaconf.dictconfig.DictConfig,
            omegaconf.base.ContainerMetadata,
            omegaconf.base.Node,
            torch.torch_version.TorchVersion,
        ]
    )
    original_load = torch.load

    def safe_load(*args, **kwargs):
        kwargs["weights_only"] = False
        return original_load(*args, **kwargs)

    torch.load = safe_load

    hf_token = os.environ.get("HF_TOKEN")
    huggingface_hub.login(token=hf_token, add_to_git_credential=False)

    whisperx.load_model("large-v3", "cpu", compute_type="int8")
    whisperx.load_align_model(language_code="en", device="cpu")

    from whisperx.diarize import DiarizationPipeline

    DiarizationPipeline(use_auth_token=hf_token, device="cpu")


image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg")
    .pip_install("git+https://github.com/m-bain/whisperx.git")
    .pip_install("omegaconf")
    .run_function(
        download_models,
        secrets=[modal.Secret.from_name("huggingface-token")],
    )
)


@app.function(
    image=image,
    gpu="L4",
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface-token")],
)
def transcribe(audio_bytes: bytes, language: str = "en") -> dict:
    """Full WhisperX pipeline: transcribe -> align -> diarize."""
    import os
    import tempfile
    import uuid

    import huggingface_hub
    import omegaconf
    import torch
    import whisperx

    torch.serialization.add_safe_globals(
        [
            omegaconf.listconfig.ListConfig,
            omegaconf.dictconfig.DictConfig,
            omegaconf.base.ContainerMetadata,
            omegaconf.base.Node,
            torch.torch_version.TorchVersion,
        ]
    )
    original_load = torch.load

    def safe_load(*args, **kwargs):
        kwargs["weights_only"] = False
        return original_load(*args, **kwargs)

    torch.load = safe_load

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        audio_path = tmp.name

    device = "cuda"
    hf_token = os.environ["HF_TOKEN"]
    huggingface_hub.login(token=hf_token, add_to_git_credential=False)

    model = whisperx.load_model("large-v3", device, compute_type="float16")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16, language=language)

    model_a, metadata = whisperx.load_align_model(
        language_code=language, device=device
    )
    result = whisperx.align(
        result["segments"],
        model_a,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    del model
    del model_a
    torch.cuda.empty_cache()

    from whisperx.diarize import DiarizationPipeline, assign_word_speakers

    diarize_model = DiarizationPipeline(use_auth_token=hf_token, device=device)
    diarize_segments = diarize_model(audio)
    result = assign_word_speakers(diarize_segments, result)

    os.unlink(audio_path)

    segments = result.get("segments", [])
    speakers = set()
    for index, segment in enumerate(segments):
        segment["id"] = f"seg_{index:03d}"
        speakers.add(segment.get("speaker", "UNKNOWN"))

    duration = max((segment.get("end", 0) for segment in segments), default=0.0)

    return {
        "media_id": str(uuid.uuid4()),
        "duration": duration,
        "language": language,
        "speakers": sorted(speakers),
        "segments": segments,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--language", default="en")
    args = parser.parse_args()

    try:
        with open(args.audio, "rb") as infile:
            audio_bytes = infile.read()

        fn = modal.Function.from_name("cyrano-transcription", "transcribe")
        result = fn.remote(audio_bytes, language=args.language)
        sys.stdout.write(JSON_MARKER)
        json.dump(result, sys.stdout)
        sys.stdout.flush()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
