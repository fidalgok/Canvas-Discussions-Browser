import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import React, { useState, useEffect } from "react";

export default function ThreadStatus({ threadId }) {
  const threadStatus = useQuery(api.canvas.getThreadStatus, {
    threadId: String(threadId),
  });
  const updateThreadStatus = useMutation(api.canvas.setThreadStatus);
  const [facilitatorName, setFacilitatorName] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("facilitator_name") || "";
    setFacilitatorName(storedName);
  }, []);

  function handleClaim() {
    if (!facilitatorName) {
      alert(
        "Please set your facilitator name in settings before claiming a thread."
      );
      return;
    }
    updateThreadStatus({
      threadId: String(threadId),
      status: "claimed",
      facilitatorName,
    });
  }

  function handleComplete() {
    updateThreadStatus({
      threadId: String(threadId),
      status: "completed",
      facilitatorName,
    });
  }

  function handleUnclaim() {
    updateThreadStatus({
      threadId: String(threadId),
      status: null,
      facilitatorName: null,
    });
  }

  if (threadStatus === undefined) {
    return <div className="txt-xs text gray-400">Loading status...</div>;
  }

  if (threadStatus === null) {
    return (
      <button
        className="text-xs px-2 py-1 rounded hover:opacity-80 bg-blue-600 text-white transition-opacity"
        onClick={handleClaim}
        style={{
          backgroundColor: "var(--color-info",
          color: "var(--color-info-content)",
        }}
      >
        Claim
      </button>
    );
  }

  // if the thread is claimed
  if (threadStatus.status === "claimed") {
    return (
      <div className="flex items-center gap-2">
        <span className="txt-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800">
          Claimed by {threadStatus.facilitatorName}
        </span>
        {/* only show action buttons if claimed thread is the facilitator */}
        {threadStatus.facilitatorName === facilitatorName && (
          <>
            <button
              className="text-xs px-2 py-1 rounded hover:opacity-80 bg-green-600 text-white transition-opacity"
              onClick={handleComplete}
              style={{
                backgroundColor: "var(--color-success)",
                color: "var(--color-success-content)",
              }}
            >
              Complete
            </button>
            <button
              className="text-xs px-2 py-1 rounded hover:opacity-80 bg-green-600 text-white transition-opacity"
              onClick={handleUnclaim}
              style={{
                backgroundColor: "var(--color-success)",
                color: "var(--color-success-content)",
              }}
            >
              Unclaim
            </button>
          </>
        )}
      </div>
    );
  }
  //   if the thread is completed
  if (threadStatus.status === "completed") {
    return (
      <div className="flex items-center gap-2">
        <span className="txt-xs px-2 py-1 rounded bg-green-200 text-green-800">
          Completed by {threadStatus.facilitatorName}
        </span>
        {/* only show action buttons if completed thread is the facilitator */}
        {threadStatus.facilitatorName === facilitatorName && (
          <button
            className="text-xs px-2 py-1 rounded hover:opacity-80 bg-green-600 text-white transition-opacity"
            onClick={handleUnclaim}
            style={{
              backgroundColor: "var(--color-success)",
              color: "var(--color-success-content)",
            }}
          >
            Reset Status
          </button>
        )}
      </div>
    );
  }
  //   should not be reached
  return null;
}
