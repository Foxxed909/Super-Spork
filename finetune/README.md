# Spork × Nemotron — fine-tuning pipeline

Fine-tune NVIDIA Nemotron on **Spork's own conversation data** to make Berry
genuinely custom — not just a system prompt over a stock model, but a model that
has actually learned from the best exchanges on the platform.

## ⚠️ Reality check (read this first)

- **OpenRouter does not train models.** It's an inference router. You can't
  "fine-tune on OpenRouter." Training happens on your own GPU; OpenRouter (or
  any OpenAI-compatible endpoint) is only how Spork *serves* a model at runtime.
- **This will not run on the Spork dev box.** That box has 2 CPU cores, ~1GB
  free RAM, and no GPU. Fine-tuning even a 9B model needs a CUDA GPU with
  ~24GB VRAM (A10G / L4 / 3090 / 4090). Rent one (Lambda, RunPod, Modal,
  Vast.ai) for the training step. Everything *except* `train_lora.py` runs
  locally.

So the split is:
| Step | Where it runs |
|---|---|
| 1. Export dataset from Postgres | Spork box (local) ✅ |
| 2. LoRA training | Rented GPU host 🖥️ |
| 3. Serve adapter + point Spork at it | GPU host + Spork config |

## 1. Export the dataset (local)

Pulls conversations from the app's Postgres and writes a chat-format JSONL
train/val split into `finetune/data/`.

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' finetune/export_dataset.ts --only-liked --min-turns=1
```

Flags:
- `--only-liked` — only conversations with ≥1 like (a quality signal). Drop it to use everything.
- `--min-turns=N` — require ≥N assistant turns (default 1).
- `--val=0.1` — validation split fraction.
- `--system="…"` — system prompt prepended to every example (defaults to the Berry persona).
- `--limit=N` — cap the number of conversations.

Output (git-ignored): `finetune/data/train.jsonl`, `finetune/data/val.jsonl`,
each line:

```json
{"messages":[{"role":"system","content":"You are Berry…"},{"role":"user","content":"…"},{"role":"assistant","content":"…"}]}
```

> **Privacy:** this exports real user conversations. Only train on data you're
> allowed to use. Consider filtering to opted-in users, and never commit the
> generated `data/` (already in `.gitignore`).

## 2. Train the LoRA (GPU host)

Copy the repo (or just `finetune/`) to the GPU host, then:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r finetune/requirements.txt
python finetune/train_lora.py --config finetune/config.yaml
```

Defaults: 4-bit QLoRA on `nvidia/NVIDIA-Nemotron-Nano-9B-v2`, r=16, 3 epochs,
effective batch 16, 4096-token sequences. Adapter lands in
`finetune/output/spork-nemotron-lora/`. Tune everything in `config.yaml`.

## 3. Serve it and wire it into Spork

On the GPU host, serve the base model + adapter with an OpenAI-compatible API
(vLLM):

```bash
pip install vllm
vllm serve nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
  --enable-lora \
  --lora-modules spork-berry=finetune/output/spork-nemotron-lora \
  --served-model-name spork-berry \
  --port 8000
```

Spork already talks to OpenRouter through an OpenAI-compatible client
(`makeOpenRouter` in `src/app/api/chat/route.ts` — just `createOpenAI` with a
`baseURL`). To route Berry to your fine-tune instead of OpenRouter's Nemotron:

1. Stand up the vLLM endpoint above (exposed over HTTPS).
2. Point a provider at it (env: `SPORK_FT_BASE_URL=https://your-host:8000/v1`)
   and have `resolveModel`/`makeOpenRouter` use that base URL + model name
   `spork-berry` when `model === BERRY_MODEL.id`.
3. `BERRY_PRIMARY_MODEL` becomes `spork-berry`; keep `BERRY_FALLBACK_MODEL` on
   OpenRouter for resilience.

That's the whole loop: **Spork's best conversations → a LoRA → a served model →
Berry, now actually fine-tuned.**

## Files

| File | Purpose |
|---|---|
| `export_dataset.ts` | Postgres → JSONL chat dataset (local) |
| `train_lora.py` | QLoRA training on a GPU host |
| `config.yaml` | Model + LoRA + training hyperparameters |
| `requirements.txt` | Python deps for the GPU host |
| `.gitignore` | Keeps `data/` and `output/` out of git |
