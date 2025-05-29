import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchCourses, addCourse, updateCourse, deleteCourse } from '../services/courseService';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [formData, setFormData] = useState({
    Programme: '',
    Duration: '',
    Status: '',
  });
  const modalRef = useRef(null);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const newCourse = await addCourse({
        ...formData,
        Duration: parseInt(formData.Duration),
      });
      setCourses([...courses, newCourse]);
      setShowAddForm(false);
      setFormData({
        Programme: '',
        Duration: '',
        Status: '',
      });
    } catch (err) {
      setError('Failed to add course: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedCourse = await updateCourse(currentCourse.$id, {
        ...formData,
        Duration: parseInt(formData.Duration),
      });
      setCourses(
        courses.map((course) =>
          course.$id === currentCourse.$id ? updatedCourse : course
        )
      );
      setShowEditForm(false);
      setCurrentCourse(null);
      setFormData({
        Programme: '',
        Duration: '',
        Status: '',
      });
    } catch (err) {
      setError('Failed to update course: ' + err.message);
    }
  };

  const handleEdit = (course) => {
    setCurrentCourse(course);
    setFormData({
      Programme: course.Programme,
      Duration: course.Duration.toString(),
      Status: course.Status,
    });
    setShowEditForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(courseId);
        setCourses(courses.filter((course) => course.$id !== courseId));
      } catch (err) {
        setError('Failed to delete course: ' + err.message);
      }
    }
  };

  const handleExportToExcel = () => {
    const exportData = courses.map((course) => ({
      Programme: course.Programme,
      Duration: `${course.Duration} Months`,
      Status: course.Status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
    
    // Customize column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Programme
      { wch: 15 }, // Duration
      { wch: 15 }, // Status
    ];

    XLSX.writeFile(workbook, 'Courses.xlsx');
  };

  const closeModal = useCallback(() => {
    setShowAddForm(false);
    setShowEditForm(false);
    setCurrentCourse(null);
    setFormData({
      Programme: '',
      Duration: '',
      Status: '',
    });
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    },
    [closeModal]
  );

  useEffect(() => {
    if (showAddForm || showEditForm) {
      document.addEventListener('keydown', handleKeyDown);
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, showEditForm, handleKeyDown]);

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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Courses Management</h2>
          <div className="space-x-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200"
            >
              Add New Course
            </button>
            <button
              onClick={handleExportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {(showAddForm || showEditForm) && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div
              ref={modalRef}
              tabIndex={-1}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                {showEditForm ? 'Edit Course' : 'Add Course'}
              </h3>
              <div onSubmit={showEditForm ? handleEditSubmit : handleAddSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
                    <input
                      type="text"
                      name="Programme"
                      value={formData.Programme}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      name="Duration"
                      value={formData.Duration}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="Status"
                      value={formData.Status}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={showEditForm ? handleEditSubmit : handleAddSubmit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
                  >
                    {showEditForm ? 'Update Course' : 'Add Course'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Programme</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Duration</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.Programme}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.Duration} Months</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.Status}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleEdit(course)}
                      className="text-indigo-600 hover:text-indigo-800 mr-4 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.$id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default Courses;