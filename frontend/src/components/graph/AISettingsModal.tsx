"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getAISettings,
  updateAISettings,
  getAvailableModels,
} from "@/services/api";

export default function
AISettingsModal({

  open,
  onClose,

}: any) {

  const [
    provider,
    setProvider
  ] = useState("");

  const [
    model,
    setModel
  ] = useState("");

  const [
    availableModels,
    setAvailableModels
  ] = useState<any[]>([]);

  useEffect(() => {

    if (!open) {
      return;
    }

    load();

  }, [open]);

  const load =
  async () => {

    const data =
      await getAISettings();

    setProvider(
      data.provider
    );

    setModel(
      data.model
    );

    const models =
        await getAvailableModels();

        setAvailableModels(
        models
);

  };

  const save =
  async () => {

    await updateAISettings(
      provider,
      model
    );

    onClose();

  };

  if (!open) {
    return null;
  }

  return (

    <div
      className="
      fixed
      inset-0
      bg-black/50
      flex
      items-center
      justify-center
      z-50
      "
    >

      <div
        className="
        bg-white
        rounded-xl
        p-6
        w-[450px]
        "
      >

        <h2
          className="
          text-xl
          font-bold
          mb-4
          "
        >
          AI Settings
        </h2>

        <label>
          Provider
        </label>

        <select
          value={provider}
          onChange={(e) => {

            const newProvider =
              e.target.value;
          
            setProvider(
              newProvider
            );
          
            const models =
              availableModels.filter(
                (m) =>
                  m.provider ===
                  newProvider
              );
          
            if (
              models.length > 0
            ) {
          
              setModel(
                models[0].model
              );
          
            }
          
          }}
          className="
          w-full
          border
          rounded
          p-2
          mb-4
          "
        >

          <option>
            ollama
          </option>

          <option>
            openai
          </option>

          <option>
            openrouter
          </option>

          <option>
            groq
          </option>

        </select>

        <label>
          Model
        </label>

        <select
            value={model}
            onChange={(e) =>
                setModel(
                e.target.value
                )
            }
            className="
            w-full
            border
            rounded
            p-2
            mb-4
            "
            >

            {availableModels
                .filter(
                (m) =>
                    m.provider ===
                    provider
                )
                .map(
                (m) => (
                    <option
                    key={m.model}
                    value={m.model}
                    >
                    {m.model}
                    </option>
                )
                )}

            </select>

        <div
          className="
          flex
          justify-end
          gap-2
          "
        >

          <button
            onClick={onClose}
            className="
            px-4
            py-2
            border
            rounded
            "
          >
            Cancel
          </button>

          <button
            onClick={save}
            className="
            px-4
            py-2
            bg-blue-600
            text-white
            rounded
            "
          >
            Save
          </button>

        </div>

      </div>

    </div>

  );
}