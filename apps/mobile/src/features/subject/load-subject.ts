import type { SubjectDetail } from "@atlas/contracts";
import { apiRequest } from "../../api/client";

export async function loadSubject(id: string): Promise<SubjectDetail> {
  const response = await apiRequest<SubjectDetail>(`/api/v1/subjects/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "This item could not be loaded.");
  }
  return response.data;
}
