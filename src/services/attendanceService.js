import { Client, Databases, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ATTENDANCE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ATTENDANCE_COLLECTION_ID;

export async function getAttendance() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ATTENDANCE_COLLECTION_ID,
      [Query.orderDesc('$createdAt')]
    );
    return response;
  } catch (error) {
    throw new Error('Failed to fetch attendance records: ' + error.message);
  }
}

export async function getAttendanceRecord(attendanceId) {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      ATTENDANCE_COLLECTION_ID,
      attendanceId
    );
    return response;
  } catch (error) {
    throw new Error('Failed to fetch attendance record: ' + error.message);
  }
}

export async function createAttendance(attendanceData) {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      ATTENDANCE_COLLECTION_ID,
      ID.unique(),
      {
        Marked_at: attendanceData.Marked_at,
        Status: attendanceData.Status,
        Student_Id: attendanceData.Student_Id,
        Session_Id: attendanceData.Session_Id,
        Course_Id: attendanceData.Course_Id,
        Marked_By: attendanceData.Marked_By,
        Latitude: attendanceData.Latitude,
        Longitude: attendanceData.Longitude
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to create attendance record: ' + error.message);
  }
}

export async function updateAttendance(attendanceId, attendanceData) {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ATTENDANCE_COLLECTION_ID,
      attendanceId,
      {
        Marked_at: attendanceData.Marked_at,
        Status: attendanceData.Status,
        Student_Id: attendanceData.Student_Id,
        Session_Id: attendanceData.Session_Id,
        Course_Id: attendanceData.Course_Id,
        Marked_By: attendanceData.Marked_By,
        Latitude: attendanceData.Latitude,
        Longitude: attendanceData.Longitude
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to update attendance record: ' + error.message);
  }
}

export async function deleteAttendance(attendanceId) {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      ATTENDANCE_COLLECTION_ID,
      attendanceId
    );
    return true;
  } catch (error) {
    throw new Error('Failed to delete attendance record: ' + error.message);
  }
}