#!/usr/bin/env python3
"""
LoRA fine-tune NVIDIA Nemotron Nano 9B on Spork conversation data.

This is the *training* half of the Spork fine-tune pipeline. It expects a
JSONL chat dataset produced by `export_dataset.ts` (finetune/data/*.jsonl) and
produces a LoRA adapter you can merge or serve with vLLM.

  IMPORTANT: This needs a CUDA GPU (≈24GB VRAM for 9B + 4-bit QLoRA, e.g. one
  A10G / L4 / 3090 / 4090). It will NOT run on the Spork dev box (2 cores, 1GB
  RAM, no GPU). Run it on a rented GPU host (Lambda, RunPod, Modal, etc.).

Quickstart on a GPU host:
  python -m venv .venv && source .venv/bin/activate
  pip install -r finetune/requirements.txt
  python finetune/train_lora.py --config finetune/config.yaml

Resulting adapter lands in <output_dir>. Serve it with vLLM (see README) and
point Spork's OpenRouter-compatible client at that endpoint to make Berry truly
custom.
"""
import argparse
import os

import torch
import yaml
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="finetune/config.yaml")
    args = parser.parse_args()
    cfg = load_config(args.config)

    if not torch.cuda.is_available():
        raise SystemExit(
            "No CUDA GPU detected. This script must run on a GPU host "
            "(see the note at the top of train_lora.py)."
        )

    model_id = cfg["model_id"]
    print(f"Loading base model: {model_id}")

    # 4-bit QLoRA keeps a 9B model inside ~24GB of VRAM.
    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Gemma 2 needs eager attention during training (its soft-capping is
    # unstable under SDPA/flash). Set `attn_implementation: "eager"` in the
    # config for Gemma; leave unset for Nemotron and others.
    model_kwargs = {}
    if cfg.get("attn_implementation"):
        model_kwargs["attn_implementation"] = cfg["attn_implementation"]

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
        **model_kwargs,
    )

    lora = LoraConfig(
        r=cfg["lora"]["r"],
        lora_alpha=cfg["lora"]["alpha"],
        lora_dropout=cfg["lora"]["dropout"],
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=cfg["lora"]["target_modules"],
    )

    data_files = {"train": cfg["train_file"]}
    if os.path.exists(cfg.get("val_file", "")):
        data_files["validation"] = cfg["val_file"]
    dataset = load_dataset("json", data_files=data_files)

    # TRL applies the tokenizer's chat template to the `messages` column.
    sft = SFTConfig(
        output_dir=cfg["output_dir"],
        num_train_epochs=cfg["train"]["epochs"],
        per_device_train_batch_size=cfg["train"]["batch_size"],
        gradient_accumulation_steps=cfg["train"]["grad_accum"],
        learning_rate=cfg["train"]["lr"],
        warmup_ratio=cfg["train"]["warmup_ratio"],
        lr_scheduler_type="cosine",
        logging_steps=10,
        save_strategy="epoch",
        eval_strategy="epoch" if "validation" in data_files else "no",
        bf16=True,
        max_length=cfg["train"]["max_seq_len"],
        packing=cfg["train"].get("packing", True),
        gradient_checkpointing=True,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        args=sft,
        train_dataset=dataset["train"],
        eval_dataset=dataset.get("validation"),
        peft_config=lora,
        processing_class=tokenizer,
    )

    print("Starting training…")
    trainer.train()

    trainer.save_model(cfg["output_dir"])
    tokenizer.save_pretrained(cfg["output_dir"])
    print(f"\nDone. LoRA adapter saved to {cfg['output_dir']}")


if __name__ == "__main__":
    main()
