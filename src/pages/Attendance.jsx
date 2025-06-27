import React, { useState, useEffect } from 'react';
import { fetchCourses, updateCourse } from '../services/courseService';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

function Attendance() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const courseResponse = await fetchCourses();
        setCourses(courseResponse);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch courses: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleToggleLinkStatus = async (course) => {
    try {
      const newLinkStatus = course.LinkStatus === 'Active' ? 'Inactive' : 'Active';
      const updatedCourse = await updateCourse(course.$id, {
        ...course,
        LinkStatus: newLinkStatus,
      });
      setCourses(
        courses.map((c) =>
          c.$id === course.$id ? { ...c, LinkStatus: newLinkStatus } : c
        )
      );
      toast.success(`Course link ${newLinkStatus.toLowerCase()} successfully.`, {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff',
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff',
        },
      });
    } catch (err) {
      setError('Failed to update link status: ' + err.message);
    }
  };

  const handleTakeAttendance = (programme) => {
    navigate(`/link/${encodeURIComponent(programme)}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Attendance Management
        </h2>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Programme</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Link Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-indigo-600">
                    {course.Programme}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {course.LinkStatus}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleToggleLinkStatus(course)}
                      className={`${
                        course.LinkStatus === 'Active'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white font-medium py-2 px-4 rounded-lg transition-colors mr-4`}
                    >
                      {course.LinkStatus === 'Active' ? 'Deactivate Link' : 'Activate Link'}
                    </button>
                    <button
                      onClick={() => handleTakeAttendance(course.Programme)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Take Attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Attendance;