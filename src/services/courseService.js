// src/services/courseService.js
import { database } from "./appwriteConfig";

export async function fetchCourses() {
    try {
        const response = await database.listDocuments(
            import.meta.env.VITE_APPWRITE_DATABASE_ID,
            import.meta.env.VITE_APPWRITE_COURSE_COLLECTION_ID
        );
        return response.documents;
    } catch (error) {
        throw error;
    }
}
