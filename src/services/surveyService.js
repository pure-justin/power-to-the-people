/**
 * Survey Service - Frontend integration with Site Survey Cloud Functions
 *
 * Provides a clean API for creating, updating, submitting, and retrieving
 * site surveys. All functions call Firebase Cloud Functions via httpsCallable.
 *
 * Survey workflow from the frontend perspective:
 *   1. createSurvey() — Initialize for a project
 *   2. updateSurvey() — Save section data as user fills form
 *   3. addSurveyPhoto() — Upload and attach photos
 *   4. submitSurvey() — Submit for AI review
 *   5. getSurvey() — Poll for review results
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const functions = getFunctions();
const storage = getStorage();

/**
 * Create a new site survey linked to a project and customer.
 * Initializes survey in "draft" status with empty sections.
 *
 * @param {string} projectId - The project this survey belongs to
 * @param {string} customerId - The customer who owns the property
 * @returns {Promise<{success: boolean, surveyId?: string, error?: string}>}
 */
export async function createSurvey(projectId, customerId) {
  const fn = httpsCallable(functions, "createSurvey");
  try {
    const result = await fn({ projectId, customerId });
    return { success: true, surveyId: result.data.surveyId };
  } catch (error) {
    console.error("Error creating survey:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update one or more sections of a survey without overwriting other sections.
 * Accepts an object keyed by section name (property, roof_measurements,
 * electrical, shading, utility) with field values.
 *
 * Example:
 *   updateSurvey(surveyId, {
 *     property: { address: "123 Main St", roof_type: "composite_shingle" },
 *     electrical: { panel_amps: 200 }
 *   })
 *
 * @param {string} surveyId - The survey to update
 * @param {object} sectionData - Object keyed by section name with field values
 * @returns {Promise<{success: boolean, updatedSections?: string[], error?: string}>}
 */
export async function updateSurvey(surveyId, sectionData) {
  const fn = httpsCallable(functions, "updateSurvey");
  try {
    const result = await fn({ surveyId, sectionData });
    return {
      success: true,
      surveyId: result.data.surveyId,
      updatedSections: result.data.updatedSections,
    };
  } catch (error) {
    console.error("Error updating survey:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit a completed survey for AI review. Validates required fields
 * on the backend and creates an AI task for automated analysis.
 *
 * @param {string} surveyId - The survey to submit
 * @returns {Promise<{success: boolean, status?: string, aiTaskId?: string, error?: string}>}
 */
export async function submitSurvey(surveyId) {
  const fn = httpsCallable(functions, "submitSurvey");
  try {
    const result = await fn({ surveyId });
    return {
      success: true,
      surveyId: result.data.surveyId,
      status: result.data.status,
      aiTaskId: result.data.aiTaskId,
    };
  } catch (error) {
    console.error("Error submitting survey:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve the full survey document by ID including all sections,
 * photos, and AI review results.
 *
 * @param {string} surveyId - The survey to retrieve
 * @returns {Promise<{success: boolean, survey?: object, error?: string}>}
 */
export async function getSurvey(surveyId) {
  const fn = httpsCallable(functions, "getSurvey");
  try {
    const result = await fn({ surveyId });
    return { success: true, survey: result.data.survey };
  } catch (error) {
    console.error("Error getting survey:", error);
    return { success: false, error: error.message };
  }
}

/**
 * List all surveys for a given project, ordered by creation date (newest first).
 *
 * @param {string} projectId - The project to list surveys for
 * @returns {Promise<{success: boolean, surveys?: object[], error?: string}>}
 */
export async function getSurveysByProject(projectId) {
  const fn = httpsCallable(functions, "getSurveysByProject");
  try {
    const result = await fn({ projectId });
    return { success: true, surveys: result.data.surveys };
  } catch (error) {
    console.error("Error getting surveys:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload a photo file to Firebase Storage and register it with the survey.
 * Handles the two-step process: upload to Storage, then call addSurveyPhoto
 * cloud function with the download URL.
 *
 * @param {string} surveyId - The survey to attach the photo to
 * @param {File} file - The image file to upload
 * @param {string} photoType - Category: roof_overview, electrical_panel, meter, obstruction, attic, mounting_area
 * @returns {Promise<{success: boolean, photoId?: string, url?: string, error?: string}>}
 */
export async function addSurveyPhoto(surveyId, file, photoType) {
  try {
    // Step 1: Upload file to Firebase Storage
    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const storagePath = `surveys/${surveyId}/photos/${photoType}_${timestamp}.${ext}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Step 2: Register photo metadata with the survey via Cloud Function
    const fn = httpsCallable(functions, "addSurveyPhoto");
    const result = await fn({
      surveyId,
      photoData: { type: photoType, url },
    });

    return {
      success: true,
      photoId: result.data.photoId,
      url,
    };
  } catch (error) {
    console.error("Error adding survey photo:", error);
    return { success: false, error: error.message };
  }
}
