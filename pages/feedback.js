import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Layout from "../components/layout/Layout";
import PageContainer from "../components/layout/PageContainer";
import { useCanvasAuth } from "../components/canvas/useCanvasAuth";
import { useCanvasCache } from "../components/canvas/useCanvasCache";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorMessage from "../components/ui/ErrorMessage";
import StatusBadge from "../components/ui/StatusBadge";
import RefreshButton from "../components/ui/RefreshButton";
import CredentialsRequired from "../components/ui/CredentialsRequired";
import TabbedTopicCard from "../components/discussion/TabbedTopicCard";
import TeacherTotalsSummary from "../components/discussion/TeacherTotalsSummary";
import {
  processCanvasDataForDashboards,
  clearProcessedDataCache,
} from "../js/gradingDataProcessor";

export default function FeedbackPage() {
  const { credentialsMissing, apiUrl, apiKey, courseId } = useCanvasAuth();
  const { dataSource, cacheTimestamp, handleClearCache, setupCacheListener } =
    useCanvasCache(courseId);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all student statuses from Convex in real-time
  const allStatuses = useQuery(api.canvas.getAllStudentStatuses);

  // Create a map for quick lookup of student status
  const statusMap = useMemo(() => {
    if (!allStatuses) return new Map();
    return new Map(allStatuses.map((s) => [s.studentId, s]));
  }, [allStatuses]);

  const topicsWithStatus = useMemo(() => {
    if (!topics.length) return [];
    return topics.map((topic) => {
      // If allStudentsWithStatus doesn't exist, just return the topic as is.
      if (!topic.allStudentsWithStatus) {
        return topic;
      }

      // Create a new allStudentsWithStatus array that includes the claimStatus
      const newAllStudentsWithStatus = topic.allStudentsWithStatus.map(
        (student) => ({
          ...student,
          claimStatus: statusMap.get(String(student.userId)) || null,
        })
      );

      // Return a new topic object with the updated student list
      return {
        ...topic,
        allStudentsWithStatus: newAllStudentsWithStatus,
      };
    });
  }, [topics, statusMap]);

  useEffect(() => {
    if (credentialsMissing()) return;

    setLoading(true);
    setError("");

    const cleanupListener = setupCacheListener();

    loadTopicData()
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        cleanupListener();
      });
  }, [apiUrl, apiKey, courseId]);

  async function loadTopicData() {
    const processedData = await processCanvasDataForDashboards({
      apiUrl,
      apiKey,
      courseId,
    });
    setTopics(processedData.gradingTopics);
  }

  function handleRefresh() {
    handleClearCache();
    clearProcessedDataCache(courseId);

    setLoading(true);
    loadTopicData()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  if (credentialsMissing()) {
    return (
      <Layout>
        <PageContainer description="">
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
            <h2
              className="text-2xl font-semibold"
              style={{ color: "var(--color-primary)" }}
            >
              Feedback Tracker ({topics.length} Topics)
            </h2>
            <div className="flex items-center gap-3">
              {/* ... refresh buttons etc ... */}
            </div>
          </div>

          <div className="space-y-10">
            {loading ? (
              <LoadingSpinner message="Loading topics..." />
            ) : error ? (
              <ErrorMessage message={error} onRetry={handleRefresh} />
            ) : topics.length === 0 ? (
              <div className="text-gray-500">
                No graded discussion topics found.
              </div>
            ) : (
              <>
                <TeacherTotalsSummary topics={topicsWithStatus} />

                {topicsWithStatus.map((topic) => (
                  <TabbedTopicCard key={topic.id} topic={topic} />
                ))}
              </>
            )}
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}
