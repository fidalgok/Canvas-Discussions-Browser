/**
 * Homepage - Temporary version for Convex integration testing
 *
 * This file has been temporarily simplified to test fetching data from Convex.
 * The original functionality will be restored in subsequent steps.
 */

import Layout from "../components/layout/Layout";
import PageContainer from "../components/layout/PageContainer";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { useCanvasAuth } from "../components/canvas/useCanvasAuth";
import CredentialsRequired from "../components/ui/CredentialsRequired";

export default function Home() {
  const { credentialsMissing, apiUrl, apiKey, courseId } = useCanvasAuth();
  const discussions = useQuery(api.canvas.getDiscussions);
  const syncDiscussions = useMutation(api.canvas.syncDiscussions);

  const handleSync = () => {
    if (credentialsMissing()) {
      alert("Please set your Canvas API credentials in Settings first.");
      return;
    }
    syncDiscussions({ apiUrl, apiKey, courseId });
  };

  if (credentialsMissing()) {
    return (
      <Layout>
        <PageContainer>
          <CredentialsRequired />
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContainer description="">
        <div className="bg-white p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2
                className="text-2xl font-semibold"
                style={{ color: "var(--color-primary)" }}
              >
                Recent Activity ({uniqueUsers} Users)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {cacheTimestamp && (
                <StatusBadge type="cached" timestamp={cacheTimestamp} />
              )}
              {dataSource === "fresh" && !cacheTimestamp && (
                <StatusBadge type="fresh" />
              )}
              <button
                className="flex items-center gap-1 uppercase text-sm px-2 py-1 font-medium hover:opacity-90 transition-colors"
                style={{
                  backgroundColor: "var(--color-secondary)",
                  color: "var(--color-secondary-content)",
                  borderRadius: "var(--radius-field)",
                }}
                onClick={handleRefresh}
                disabled={loading}
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                    clipRule="evenodd"
                  />
                </svg>
                Download All Conversations
              </button>
            </div>
          </div>

          {discussions === undefined ? (
            <p>Loading discussions...</p>
          ) : discussions.length === 0 ? (
            <p>No discussions found. Try syncing with Canvas.</p>
          ) : (
            <ul>
              {discussions.map(({ _id, title }) => (
                <li key={_id}>{title}</li>
              ))}
            </ul>
          )}
        </div>
      </PageContainer>
    </Layout>
  );
}
