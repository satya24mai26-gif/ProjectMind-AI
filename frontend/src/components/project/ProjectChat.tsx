"use client";

import { useState } from "react";

import {
  askProjectAI,
  getGapAnalysis,
  addMissingConcept
}
from "@/services/api";


export default function ProjectChat({
  projectId,
}: {
  projectId: number;
}) {

  const [message, setMessage] =
    useState("");

  const [response, setResponse] =
    useState("");

  const [analysis, setAnalysis] =
    useState<any>(null);

  const sendMessage =
    async () => {

      const result =
        await askProjectAI(
          projectId,
          message
        );

      setResponse(
        result.answer
      );
    };
    

  return (
    <div
      className="
      bg-white
      border
      rounded
      p-4
      "
    >
      <h3
        className="
        font-bold
        mb-2
        "
      >
        Project Chat
      </h3>

      <input
        value={message}
        onChange={(e) =>
          setMessage(
            e.target.value
          )
        }
        placeholder="
          Ask about project...
        "
        className="
          border
          w-full
          p-2
          rounded
        "
      />

      <button
        onClick={sendMessage}
        className="
          mt-2
          bg-black
          text-white
          px-4
          py-2
          rounded
        "
      >
        Ask
      </button>

      <button
        onClick={async () => {

          const result =
            await getGapAnalysis(
              projectId
            );

          setAnalysis(
            result
          );
        }}
        className="
          mt-2
          ml-2
          bg-purple-600
          text-white
          px-4
          py-2
          rounded
        "
      >
        Analyze Graph
      </button>

      <div
        className="
        mt-4
        whitespace-pre-wrap
        "
      >
        {response}
        {
          analysis && (

            <div
              className="
              mt-4
              border-t
              pt-3
              "
            >

              <h4
                className="
                font-semibold
                mt-4
                mb-2
                "
              >
                Missing Concepts
              </h4>

              <div
                className="
                flex
                flex-col
                gap-2
                "
              >

                {
                  analysis
                    .missing_concepts
                    ?.map(
                      (
                        concept:
                        string
                      ) => (

                        <div
                          key={concept}
                          className="
                          border
                          rounded
                          p-2
                          bg-gray-50
                          flex
                          justify-between
                          items-center
                          "
                        >

                          <span>
                            {concept}
                          </span>

                          <button
                            onClick={
                              async () => {

                                try {

                                  await addMissingConcept(
                                    projectId,
                                    concept
                                  );

                                  setAnalysis(
                                    (
                                      prev: any
                                    ) => ({
                                      ...prev,

                                      missing_concepts:
                                        prev
                                          .missing_concepts
                                          .filter(
                                            (
                                              c: string
                                            ) =>
                                              c !== concept
                                          )
                                    })
                                  );

                                }
                                catch (error) {

                                  console.error(
                                    error
                                  );

                                  alert(
                                    "Failed to add concept"
                                  );

                                }

                              }
                            }
                            className="
                            bg-green-600
                            text-white
                            px-3
                            py-1
                            rounded
                            text-sm
                            "
                          >
                            Accept
                          </button>

                        </div>
                      )
                    )
                }

              </div>

              <h4
                className="
                font-semibold
                mt-4
                mb-2
                "
              >
                Weak Areas
              </h4>

              <div
                className="
                flex
                flex-col
                gap-2
                "
              >

                {
                  analysis
                    .weak_areas
                    ?.map(
                      (
                        area:
                        string
                      ) => (

                        <div
                          key={area}
                          className="
                          border
                          rounded
                          p-2
                          bg-yellow-50
                          "
                        >
                          {area}
                        </div>
                      )
                    )
                }

              </div>

              <h4
                className="
                font-semibold
                mt-4
                mb-2
                "
              >
                Missing Relationships
              </h4>

              <div
                className="
                flex
                flex-col
                gap-2
                "
              >

                {
                  analysis
                    .missing_relationships
                    ?.map(
                      (
                        relationship: any,
                        index: number
                      ) => (

                        <div
                          key={index}
                          className="
                          border
                          rounded
                          p-2
                          bg-gray-50
                          flex
                          justify-between
                          items-center
                          "
                        >

                          <span>

                            {
                              relationship.source
                            }

                            {" → "}

                            {
                              relationship.target
                            }

                            {" ("}

                            {
                              relationship.type
                            }

                            {")"}

                          </span>

                          <button
                            className="
                            bg-green-600
                            text-white
                            px-3
                            py-1
                            rounded
                            text-sm
                            "
                          >
                            Accept
                          </button>

                        </div>
                      )
                    )
                }

              </div>

            </div>
          )
        }
      </div>
    </div>
  );
}